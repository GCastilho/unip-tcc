const mongoose = require('../mongoose')

const transaction = mongoose.model('transaction', {
    tx: {
        type: String,
        trim: true,
        unique: true,
        required: true
    }
})

module.exports = transaction
