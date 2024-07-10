const mongoose = require('mongoose')
const Order = require('../models/order');

const getOderDetails = async (orderId)=>{
    try{
        const orderDetails = await Order.aggregate([
            {$match:{_id:new mongoose.Types.ObjectId(orderId)}},
            {$unwind:'$products'},
            {$lookup:{
                from:'products',
                localField:'products.productId',
                foreignField:'_id',
                as:'productList',
            }},
            {$unwind:'$productList'},
            {$lookup:{
                from:'addresses',
                localField:'address',
                foreignField:'_id',
                as:'userAddress'
            }},
            {$unwind:'$userAddress'},
            {$lookup:{
                from:'payments',
                localField:'payment',
                foreignField:'_id',
                as:'paymentMethod'
            }},
            {$unwind:'$paymentMethod'},
            {$group:{
                _id:'$_id',
                payment:{'$first':'$paymentMethod'},
                totalAmount:{'$first':'$totalAmount'},
                DateOrder:{'$first':'$DateOrder'},
                products:{'$push':{
                    product:'$productList',
                    productId:'$products.productId',
                    quantity:'$products.quantity'}},
                address:{'$first':'$userAddress'},
                tax:{'$first':'$tax'},
                shippingCharge:{'$first':'$shippingCharge'},
                status:{'$first':'$status'}
              }},
              {
                $project: {
                  _id: 1,
                  payment: 1,
                  totalAmount: 1,
                  DateOrder: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$DateOrder" } },
                  products: 1,
                  address: 1,
                  tax:1,
                  shippingCharge:1,
                  status:1
                }
              },
        ]);

        if(orderDetails.length === 0 ){
            throw new Error ('Order not found');
        }
        return orderDetails[0];
    }catch(error){
        throw new Error (`Error fetching order details: ${error.message}`)
    }
};


const getOderDetailsList = async (orderId) => {
    try {
        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: '$products' },
            { $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'productList',
            }},
            { $unwind: '$productList' },
            { $lookup: {
                from: 'categories',
                localField: 'productList.category',
                foreignField: '_id',
                as: 'categoryList'
            }},
            { $unwind: '$categoryList' },
            { $lookup: {
                from: 'addresses',
                localField: 'address',
                foreignField: '_id',
                as: 'userAddress'
            }},
            { $unwind: '$userAddress' },
            { $lookup: {
                from: 'payments',
                localField: 'payment',
                foreignField: '_id',
                as: 'paymentMethod'
            }},
            { $unwind: '$paymentMethod' },
            { $addFields: {
                'productList.bestOfferPrice': {
                    $cond: {
                        if: { $gt: ['$productList.offer', '$categoryList.offer'] },
                        then: { $multiply: ['$productList.price', { $subtract: [1, { $divide: ['$productList.offer', 100] }] }] },
                        else: { $multiply: ['$productList.price', { $subtract: [1, { $divide: ['$categoryList.offer', 100] }] }] }
                    }
                }
            }},
            { $group: {
                _id: '$_id',
                payment: { '$first': '$paymentMethod' },
                totalAmount: { '$first': '$totalAmount' },
                DateOrder: { '$first': '$DateOrder' },
                products: { '$push': {
                    product: '$productList',
                    productId: '$products.productId',
                    quantity: '$products.quantity'
                }},
                address: { '$first': '$userAddress' },
                tax: { '$first': '$tax' },
                shippingCharge: { '$first': '$shippingCharge' },
                status: { '$first': '$status' }
            }},
            {
                $project: {
                    _id: 1,
                    payment: 1,
                    totalAmount: 1,
                    DateOrder: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$DateOrder" } },
                    products: 1,
                    address: 1,
                    tax: 1,
                    shippingCharge: 1,
                    status: 1
                }
            },
        ]);

        if (orderDetails.length === 0) {
            throw new Error('Order not found');
        }
        return orderDetails[0];
    } catch (error) {
        throw new Error(`Error fetching order details: ${error.message}`);
    }
};

module.exports = {
    getOderDetails,
    getOderDetailsList
}