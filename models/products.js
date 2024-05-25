const mongoose =require('mongoose');
const reviewSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  });
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
    imagecr:{
        type:String,
        required:false
    },
    softDelete:{
        type:Boolean,
        default:false
    },
    rating:[{
        star:Number,
        postedby:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    }],
    totalrating:{
        type:String,
        default:0,
    },
    reviews: [reviewSchema],
});
module.exports = mongoose.model('Product',productSchema);