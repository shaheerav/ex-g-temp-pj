const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code:{type:String,
        require:true,
    },
    type:{
        type:String,
        require:true
    },
    maxDiscount:{
        type:Number,
        require:true
    },
    discription:{
        type:String,
        require:true
    },
    limit:{
        type:Number,
        require:true
    },
    expirityDate:{
        type:Date,
        default:Date.now,
    }

},{timestamps:true});
module.exports = mongoose.model('coupon',couponSchema);