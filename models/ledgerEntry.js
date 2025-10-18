const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  // Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Reference to Payment Event
  paymentEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentEvent',
    required: true,
    unique: true,
  },
  merchantId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['recorded', 'disputed', 'refunded'],
    default: 'recorded',
  },
  createdAt: {
    type: Date,
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
