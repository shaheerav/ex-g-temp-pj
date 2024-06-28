const mongoose = require("mongoose");
const WalletSchema = new mongoose.Schema({
    userId :{
      type:mongoose.Schema.Types.ObjectId,
      ref:'User',
      require:true
    },
    amount:{
        type:Number,
        require:true
    },
    modifiedOn: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
  )
  
  module.exports = mongoose.model("Wallet", WalletSchema);
  