const mongoose = require("mongoose");

const wishListSchema = new mongoose.Schema({
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
}],
},
{ timestamps: true }
)

module.exports = mongoose.model("WishList", wishListSchema);