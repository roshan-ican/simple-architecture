const express = require('express');
const router = express.Router();
const paymentQueue = require('../services/paymentQueue');

router.post('/', (req, res) => {
    const event = req.body;

    // Basic validation
    if (!event || !event.id) {
        return res.status(400).json({ error: 'Invalid event data' });
    }

    paymentQueue.add(event);
    res.status(202).json({ status: 'accepted' });
});

module.exports = router;