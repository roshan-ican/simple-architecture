const mongoose = require('mongoose');

const paymentEventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ['payment.succeeded', 'payment.failed'] },
    merchantId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    createdAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
