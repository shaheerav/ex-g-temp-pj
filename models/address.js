const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        require:true,
    },
    fullname:{
        type:String,
        require:true
    },
    mobile:{
        type:Number,
        require:true
    },
    pincode :{
        type:Number,
        require:true
    },
    street:{
        type:String,
        require:true
    },
    city:{
        type:String,
        require:true
    },
    state:{
        type:String,
        require:true
    },
    country:{
        type:String,
        require:true
    }
},{timestamps:true});
module.exports = mongoose.model('address',addressSchema);