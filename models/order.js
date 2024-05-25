const mongoose = require('mongoose');
const { transformAuthInfo } = require('passport');

const orderSchema = new mongoose.Schema({
    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        require:true,
    },
    address:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Address',
        require:true,
    },
    product :[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        require:true,
    }],
    DateOrder:{
        type:Date,
        default:Date.now
    },
    paymentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Payment',
        require:true
    },
    shippingCharge:{
        type:Number,
        require:true,
        default:0,
    },
    tax:{
        type:Number,
        require:true,
        default:0
    },
    totalAmount:{
        type:Number,
        default:0,
        require:true,
    }
});

module.exports = mongoose.model('Order',orderSchema);