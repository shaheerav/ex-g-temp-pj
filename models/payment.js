const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Order',
        require:true
    },
    paymentMethod:{
        type:String,
        enum:['COD','Cart-Payment','Bank-transger','PayPal','Razorpay','Wallet'],
        require:true
    },
    amount:{
        type:Number,
        require:true
    },
    status:{
        type:String,
        enum:['pending','paid','failed'],
        require:true
    },
},{timestamps:true});

module.exports = mongoose.model('Payment',paymentSchema);