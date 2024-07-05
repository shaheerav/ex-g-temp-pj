const mongoose =require('mongoose');
const sizeSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock must be a non-negative number'],
      max: 200
    }
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
    size: [sizeSchema],
    color:{
        type:String,
        require:true
    },
    
    price:{
        type:Number,
        required:true,
        min:[0,'Price must be a positive number']
    },
    image:{
        type:Array,
        require:true
    },
    softDelete:{
        type:Boolean,
        default:false
    },
    reviews:{
        type:mongoose.Types.ObjectId,
        ref:'Review',
        require:true
    },
    offer: {
        type: Number,
        default: 0,
        min: [0, 'Offer must be a non-negative number'],
        max: [100, 'Offer cannot exceed 100%']
      },
      offerStart: {
        type: Date
      },
      offerEnd: {
        type: Date
      }
},{
    timestamps:true
});
module.exports = mongoose.model('Product',productSchema);