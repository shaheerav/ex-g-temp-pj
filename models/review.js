const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema ({
    productId :{
        type:Schema.Types.ObjectId,
        ref:'Product',
        require:true
    },
    userId :{
        type:Schema.Types.ObjectId,
        ref:'User',
        require:true
    },
    rating:{
        type:Number,
        require:true
    },
    comment:{
        type:String,
        require:true
    }
},{timestamps:true});
module.exports= mongoose.model('Review',ReviewSchema);