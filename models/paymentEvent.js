const mongoose = require('mongoose');

const paymentEventSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['payment.succeeded', 'payment.failed']
    },
    merchantId: {
        type: String,
        required: true,
        index: true,
    },
    // Reference to User
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    // Reference to created ledger entry
    ledgerEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LedgerEntry',
        default: null,
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        required: true
    },
    processedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
