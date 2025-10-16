const express = require('express');
const LedgerEntry = require('../models/ledgerEntry');
const crypto = require('crypto');

const router = express.Router();

// In-memory cache
let cache = {
    etag: null,
    data: null,
    timestamp: 0,
};
const CACHE_TTL_MS = 5000; // 5 seconds

router.get('/', async (req, res) => {
    const now = Date.now();

    // If cache is expired or not set, refresh it
    if (!cache.etag || (now - cache.timestamp) > CACHE_TTL_MS) {
        try {
            const entries = await LedgerEntry.find()
                .sort({ createdAt: -1 })
                .lean();

            const jsonData = JSON.stringify(entries);
            const etag = crypto.createHash('sha256').update(jsonData).digest('hex');

            cache = {
                etag,
                data: jsonData,
                timestamp: now,
            };
        } catch (error) {
            console.error('Error fetching ledger entries:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Check If-None-Match header with our etag
    if (req.headers['if-none-match'] === cache.etag) {
        // Client cache is fresh
        return res.status(304).end();
    }

    // Send ledger entries with ETag
    res.setHeader('ETag', cache.etag);
    res.type('application/json').send(cache.data);
});

module.exports = router;
