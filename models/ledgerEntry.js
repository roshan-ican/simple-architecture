const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  createdAt: { type: Date, required: true },
  status: { type: String, required: true, enum: ['recorded'] },
}, { timestamps: true });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);