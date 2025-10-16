const Queue = require('bull');
const PaymentEvent = require('../models/paymentEvent');
const LedgerEntry = require('../models/ledgerEntry');
const { v4: uuidv4 } = require('uuid');



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
    console.log(`Processing payment event: ${eventData.id}`);

    try {
        // Check if LedgerEntry for this event already exists (idempotency)
        const existingLedger = await LedgerEntry.findOne({ id: eventData.id }); // Use event id as ledger id

        if (existingLedger) {
            console.log(`Ledger entry for event ${eventData.id} already exists, skipping.`);
            return { status: 'duplicate', eventId: eventData.id };
        }

        // Create LedgerEntry directly
        const ledgerEntry = new LedgerEntry({
            id: eventData.id, // Use event id for ledger entry id to guarantee idempotency
            merchantId: eventData.merchantId,
            amount: eventData.amount,
            currency: eventData.currency,
            createdAt: new Date(eventData.createdAt),
            status: 'recorded',
        });
        console.log(ledgerEntry,)
        await ledgerEntry.save();

        console.log(`Ledger entry created for event ${eventData.id}`);
        return { status: 'success', eventId: eventData.id };

    } catch (error) {
        console.error(`Error processing event ${eventData.id}:`, error);
        throw error; // Will trigger retry
    }
});


// Handle failed jobs (Dead Letter Queue)
paymentQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

    // You can log to a DLQ collection or external system here
    // Example: await DLQModel.create({ jobId: job.id, data: job.data, error: err.message });
});

paymentQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
});

module.exports = paymentQueue;
