const Queue = require('bull');
const PaymentEvent = require('../models/paymentEvent');
const LedgerEntry = require('../models/ledgerEntry');
const { v4: uuidv4 } = require('uuid');
const counters = require('../utils');
const Redis = require('ioredis'); // Add this for dedupe store


const DEDUPE_TTL_SECONDS = 60 * 15; // 15 minutes

const redisClient = new Redis({
    host: 'localhost',
    port: 6379,
});

// Create a Bull queue for payment processing
const paymentQueue = new Queue('payment-processing', {
    redis: {
        host: 'localhost',
        port: 6379,
    },
    defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s delay, then exponential backoff
        },
    },
});

// Worker processor - handles idempotent ledger entry writes
paymentQueue.process(async (job) => {
    const eventData = job.data;
    const dedupeKey = `dedupe:eventId:${eventData.id}`;

    console.log(`Processing payment event: ${eventData.id}`);

    try {
        // Step 1: Check Redis dedupe store first (fast check)
        const isDuplicate = await redisClient.get(dedupeKey);
        if (isDuplicate) {
            counters.deduped++;
            console.log(`Duplicate event ${eventData.id} detected via Redis cache.`);
            return { status: 'duplicate', eventId: eventData.id };
        }

        // Step 2: Check if LedgerEntry for this event already exists (idempotency)
        const existingLedger = await LedgerEntry.findOne({ id: eventData.id });

        if (existingLedger) {
            counters.deduped++;
            // Store in Redis dedupe cache for future fast lookups
            await redisClient.set(dedupeKey, "1", "EX", DEDUPE_TTL_SECONDS);
            console.log(`Ledger entry for event ${eventData.id} already exists, skipping.`);
            return { status: 'duplicate', eventId: eventData.id };
        }

        // Step 3: Create LedgerEntry directly
        const ledgerEntry = new LedgerEntry({
            id: eventData.id, // Use event id for ledger entry id to guarantee idempotency
            merchantId: eventData.merchantId,
            amount: eventData.amount,
            currency: eventData.currency,
            createdAt: new Date(eventData.createdAt),
            status: 'recorded',
        });
        console.log(ledgerEntry);
        await ledgerEntry.save();

        // Step 4: Mark as processed in Redis dedupe store
        await redisClient.set(dedupeKey, "1", "EX", DEDUPE_TTL_SECONDS);

        counters.processed++;
        console.log(`Ledger entry created for event ${eventData.id}`);
        return { status: 'success', eventId: eventData.id };

    } catch (error) {
        counters.failed++;
        console.error(`Error processing event ${eventData.id}:`, error);
        throw error; // Will trigger retry
    }
});

// Handle failed jobs (Dead Letter Queue)
paymentQueue.on('failed', async (job, err) => {
    counters.dlq++;
    console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

    // You can log to a DLQ collection or external system here
    // Example: await DLQModel.create({ jobId: job.id, data: job.data, error: err.message });
});

paymentQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
});

module.exports = paymentQueue;