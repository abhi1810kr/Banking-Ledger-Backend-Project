const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true,
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'account',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum:{
            values: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
            message: 'Status must be one of PENDING, COMPLETED, FAILED, REVERSED'
        },
        default: 'PENDING'
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required for creating a transaction'],
        min: [0, 'Amount must be greater than or equal to 0']
    },
    idempotencyKey: {
        type: String,
        required: [true, 'Idempotency key is required for creating a transaction'],
        index: true,
        unique: true
    }
}, {
    timestamps: true
})


const transactionModel = mongoose.model('transaction', transactionSchema);

module.exports = transactionModel;