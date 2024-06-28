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
    }
},{timestamps:true});
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
module.exports= mongoose.model('Category',categorySchema);