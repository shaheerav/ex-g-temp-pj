const mongoose = require("mongoose");

const userData =  new mongoose.Schema({
    name:{
        type :String,
        require:true,
    },
    username:{
        type:String,
        require:true,
        unique:true,
    },
    password:{
        type:String,
        require:true,
    },
    email:{
        type:String,
        require:true,
        unique:true,
    },
    mobile:{
        type:String,
        require:true,
        unique:true,
    },
    is_admin:{
        type:Number,
        require:true,
        default:0
    },
    is_verify:{
        type:Boolean,
        require:true,
        default:false
    },
    otp_generate:{
        type:String,
        require:true
    },
    is_blocked:{
        type:Boolean,
        default:false
    },otpVerify:{
        type:Boolean,
        default:false
    },
    token:{
        type:String,
        default:''
    }
    
})
module.exports= mongoose.model("User",userData);