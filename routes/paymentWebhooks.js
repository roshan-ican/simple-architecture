const express = require('express');
const router = express.Router();
const paymentQueue = require('../services/paymentQueue');
const Sentry = require('@sentry/node');
const counters = require('../utils');

router.post('/', async (req, res) => {
    const event = req.body;

    // Basic validation
    if (!event || !event.id) {
        console.log('Invalid event data:', event);
        return res.status(400).json({ error: 'Invalid event data' });
    }

    try {
        counters.received++;
        console.log('📥 Webhook received:', event.id);
        console.log('Counters:', counters);

        // Add job to queue and wait for it
        const job = await paymentQueue.add(event, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });

        console.log('✅ Job added to queue:', job.id, 'for event:', event.id);

        res.status(202).json({
            status: 'accepted',
            eventId: event.id,
            jobId: job.id,
            message: 'Payment event queued for processing'
        });

    } catch (error) {
        console.error('❌ Error adding job to queue:', error);
        Sentry.captureException(error);
        res.status(500).json({
            error: 'Failed to queue payment event',
            details: error.message
        });
    }
});

module.exports = router;