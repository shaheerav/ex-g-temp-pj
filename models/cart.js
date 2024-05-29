const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId :{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    require:true
  },
  products:[{
    productId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Product',
      require:true
    },
    quantity:{
      type:Number,
      require:true
    },
    name:{type:String,require:true},
    price:{type:String,require:true}
  }],
  active: {
    type: Boolean,
    default: true
  },
  modifiedOn: {
    type: Date,
    default: Date.now
  }
},
{ timestamps: true }
)

module.exports = mongoose.model("Cart", cartSchema);
