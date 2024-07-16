const mongoose =require('mongoose');

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        require:true,
        unique:true,
        collation: { locale: 'en', strength: 2 }
    },
    description:{
        type:String,
        require:true
    },
    softDelete:{
        type:Boolean,
        default:false
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

},{timestamps:true});
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
module.exports= mongoose.model('Category',categorySchema);