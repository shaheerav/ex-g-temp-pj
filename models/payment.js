const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Order',
        require:true
    },
    paymentMethod:{
        type:String,
        require:true
    },
    amount:{
        type:Number,
        require:true
    },
});

module.exports = mongoose.Schema.Types.ObjectId('Payment',paymentSchema);