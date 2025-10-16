const express = require('express');
const router = express.Router();
const paymentQueue = require('../services/paymentQueue');
const counters = require('../utils');

router.post('/', (req, res) => {
    const event = req.body;

    // Basic validation
    if (!event || !event.id) {
        return res.status(400).json({ error: 'Invalid event data' });
    }
    counters.received++;
    console.log(counters, "___sddd__")
    paymentQueue.add(event);
    res.status(202).json({ status: 'accepted' });
});

module.exports = router;