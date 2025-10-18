
const Queue = require('bull');
const PaymentEvent = require('../models/paymentEvent');
const LedgerEntry = require('../models/ledgerEntry');
const User = require('../models/User');
const Sentry = require('../config/sentry'); // Import from config
const Redis = require('ioredis');

const DEDUPE_TTL_SECONDS = 60 * 15;

const redisClient = new Redis({
    host: 'localhost',
    port: 6379,
});

const paymentQueue = new Queue('payment-processing', {
    redis: {
        host: 'localhost',
        port: 6379,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

// Worker processor with Sentry
paymentQueue.process(async (job) => {
    const eventData = job.data;
    const dedupeKey = `dedupe:eventId:${eventData.id}`;

    console.log(`🔄 Processing payment event: ${eventData.id}`);

    try {
        // Step 1: Check Redis dedupe store
        const isDuplicate = await redisClient.get(dedupeKey);
        if (isDuplicate) {
            Sentry.captureMessage(`Duplicate event detected: ${eventData.id}`, 'info');
            console.log(`⏭️  Duplicate event ${eventData.id} detected via Redis cache.`);
            return { status: 'duplicate', eventId: eventData.id };
        }

        // Step 2: Check if LedgerEntry exists
        const existingLedger = await LedgerEntry.findOne({ id: eventData.id });
        if (existingLedger) {
            await redisClient.set(dedupeKey, "1", "EX", DEDUPE_TTL_SECONDS);
            Sentry.captureMessage(`Ledger entry already exists: ${eventData.id}`, 'info');
            console.log(`⏭️  Ledger entry for event ${eventData.id} already exists, skipping.`);
            return { status: 'duplicate', eventId: eventData.id };
        }

        // Step 3: Find User by merchantId
        const user = await User.findOne({ merchantId: eventData.merchantId });
        if (!user) {
            const error = new Error(`User not found for merchantId: ${eventData.merchantId}`);
            Sentry.captureException(error);
            throw error;
        }

        // Step 4: Update or create PaymentEvent
        const paymentEvent = await PaymentEvent.findOneAndUpdate(
            { id: eventData.id },
            {
                id: eventData.id,
                type: eventData.type,
                merchantId: eventData.merchantId,
                user: user._id,
                amount: eventData.amount,
                currency: eventData.currency,
                status: 'processed',
                processedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        // Step 5: Create LedgerEntry
        const ledgerEntry = new LedgerEntry({
            id: eventData.id,
            user: user._id,
            paymentEvent: paymentEvent._id,
            merchantId: eventData.merchantId,
            amount: eventData.amount,
            currency: eventData.currency,
            createdAt: new Date(eventData.createdAt),
            status: 'recorded',
        });
        await ledgerEntry.save();

        // Step 6: Update references
        paymentEvent.ledgerEntry = ledgerEntry._id;
        await paymentEvent.save();

        user.ledgerEntries.push(ledgerEntry._id);
        user.paymentEvents.push(paymentEvent._id);
        await user.save();

        // Step 7: Mark as processed in Redis
        await redisClient.set(dedupeKey, "1", "EX", DEDUPE_TTL_SECONDS);

        console.log(`✅ Ledger entry created for event ${eventData.id}`);
        return { status: 'success', eventId: eventData.id, userId: user._id };

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                component: 'payment-queue-worker',
                eventId: eventData.id,
            },
            extra: {
                jobData: eventData,
                attempts: job.attemptsMade,
            },
        });

        console.error(`❌ Error processing event ${eventData.id}:`, error.message);
        throw error;
    }
});

// Handle failed jobs
paymentQueue.on('failed', async (job, err) => {
    console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    Sentry.captureException(err, {
        tags: {
            component: 'payment-queue-failed',
            jobId: job.id,
        },
        extra: {
            jobData: job.data,
            attempts: job.attemptsMade,
        },
    });
});

paymentQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
});

paymentQueue.on('active', (job) => {
    console.log(`🔄 Job ${job.id} is now active`);
});

module.exports = paymentQueue;