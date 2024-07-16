const mongoose = require('mongoose');
const cron = require('node-cron');
const Product = require('../models/products');
const Category = require('../models/category');
const Coupon = require('../models/coupon');

const removeExpiredOffers = async ()=>{
    const currentDate = new Date();
    try{
        const productResult = await Product.updateMany(
            {offerEnd:{$lt:currentDate}},
            {
                $unset:{offer:"",offerStart:"",offerEnd:""}
            }
        );
        console.log(`Expired offers removed from products: ${productResult.nModified} documents modified`);
        const categoryResult = await Category.updateMany(
            {offerEnd:{$lt:currentDate}},
            {
                $unset:{offer:"",offerStart:"",offerEnd:""}
            }
        );
        console.log(`Expires offers removes from products: ${categoryResult.nModified} document modified`);
        const couponResult = await Coupon.deleteMany({expirityDate:{$lt:currentDate}});
        console.log(`Expired coupons removed :${couponResult.deletedCount} document deleted`);

    }catch(error){
        console.error('Error removing expired offers:',error.message);
    }
};
const mysecret = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', false);
        console.log(process.env.MONGODB_URI)
        const conn = await mongoose.connect(mysecret,{
            useNewUrlParser: true,
            useUnifiedTopology: true
        } );
        console.log(`MongoDB Connected`);

        cron.schedule('0 0 * * *', removeExpiredOffers);

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;
