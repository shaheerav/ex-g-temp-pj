const mongoose =require('mongoose');
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    brand:{
        type:String,
        require:true
    },
    description:{
        type:String,
        require:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        require:true
    },
    size: {
        type: String,
        default: 'M',
    },
    
    price:{
        type:Number,
        required:true,
        min:[0,'Price must be a positive number']
    },
    stock:{
        type:Number,
        require:true,
        min:[0,'Stock must be non-negative number'],
        max:200
    },
    image:{
        type:Array,
        require:true
    },
    softDelete:{
        type:Boolean,
        default:false
    },
});
module.exports = mongoose.model('Product',productSchema);