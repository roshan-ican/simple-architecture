const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    merchantId: {
        type: String,
        unique: true,
        sparse: true,
        description: 'Links user to payment events as a merchant',
    },
    // Relationships
    paymentEvents: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PaymentEvent',
        }
    ],
    ledgerEntries: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LedgerEntry',
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
