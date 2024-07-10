const mongoose = require('mongoose');

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
    products :[{
        productId:
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:'Product',
                require:true,
            },
        quantity:{
            type:Number,
            require:true,
        },
        size:{
            type:String,
            require:true
        },
        productStatus: {
            type: String,
            enum: ['Pending', 'Cancelled', 'Delivered'],
            default: 'Pending'
        },
}],
    DateOrder:{
        type:Date,
        default:Date.now
    },
    payment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Payment',
        require:true,
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
    },
    status:{
        type:String,
        enum:['Ordered','Shipped','Out-For-Delivery','Delivered','Cancelled','Return'],
        require:true,
    },
    orderStatus:{
        type:String,
        default:'',
        require:true
    },
    
},{timestamps:true});

module.exports = mongoose.model('Order',orderSchema);