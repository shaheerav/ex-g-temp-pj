
const User = require('../models/userModel');
const Order = require('../models/order');
const Payment = require('../models/payment');
const bcrypt = require("bcrypt");
const Product = require('../models/products');
const Coupon = require('../models/coupon');
const randomString = require('randomstring');
const nodemailer = require('nodemailer');
const { format } = require('morgan');
const {getOderDetails} = require('../config/aggregation');
const moment = require('moment');

const adminPage = async (req,res)=>{
    try{
        console.log('facing any error')
        res.render('login');
    }catch(error){
        console.log(error.message);
    }
};
const adminVerify = async (req,res)=>{
    try{
        const email = req.body.email;
        const password = req.body.password;
        const adminData = await User.findOne({email:email,is_admin:1});
        if(adminData){
            const passwordValid = await bcrypt.compare(password,adminData.password);
            if(passwordValid){
                req.session.User_id = adminData._id;
                res.redirect('/admin/home');
            }else{
                res.render('login',{message:'Please check your password'});
            }
        }else{
            res.render('login',{message:'not allow to enter the admin side'});
        }

    }catch(error){
        console.log(error.message);
    }
}
const adminhome = async (req,res)=>{
    try{
        const adminData = await User.findById({_id:req.session.User_id});
        const totalSale = await Order.aggregate([{$match:{status:{$nin:['Cancelled','Return']}}},
        {$group:{_id:null,totalSale:{$sum:'$totalAmount'}}}]);
        const totalorder = await Order.aggregate([{$group:{_id:null,totalOrder:{$sum:1}}}]);
        const totalProduct = await Product.aggregate([{$group:{_id:null,totalProduct:{$sum:1}}}]);
        const totalUsers = await User.aggregate([{$group:{_id:null,totalUsers:{$sum:1}}}]);
        const categorySales = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Return'] } } },
            { $unwind: "$products" },
            { $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "productDetails"
            }},
            { $unwind: "$productDetails" },
            { $lookup: {
                from: "categories",
                localField: "productDetails.category",
                foreignField: "_id",
                as: "categoryDetails"
            }},
            { $unwind: "$categoryDetails" },
            { $group: {
                _id: "$categoryDetails.name",
                totalSales: { $sum: "$totalAmount" }
            }}
          ]);
          const topProducts = await getTop10Products();
          console.log(totalUsers,'user');
          console.log(totalSale,'sale')
          const topCategories = await getTop10Categories();
          const topBrands = await getTop10Brands();
        res.render('home',{admin:adminData,totalSale,totalorder,totalProduct,totalUsers,categorySales,topBrands,topProducts,topCategories});
    }catch(error){
        console.log('home page some error')
        console.log(error.message);
    }
};
async function getTop10Products() {
    try {
        const topProducts = await Order.aggregate([
          { $unwind: '$products' },
          { $group: {
              _id: '$products.productId',
              totalQuantity: { $sum: '$products.quantity' }
          }},
          { $sort: { totalQuantity: -1 } },
          { $limit: 10 },
          { $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'productInfo'
          }},
          { $unwind: '$productInfo' },
          { $project: {
              _id: '$_id',
              totalQuantity: '$totalQuantity',
              name: '$productInfo.name',
              image: '$productInfo.image' // Include image URL field
          }}
        ]);
    
        return topProducts;
      } catch (error) {
        console.error('Error fetching top products with images:', error);
        return [];
      }
    }
  
  // Example function to get top 10 best-selling categories
  async function getTop10Categories() {
    try {
        const topCategories = await Order.aggregate([
            { $unwind: '$products' },
            { $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'productInfo'
            }},
            { $unwind: '$productInfo' },
            { $lookup: {
                from: 'categories',
                localField: 'productInfo.category',
                foreignField: '_id',
                as: 'categoryInfo'
            }},
            { $unwind: '$categoryInfo' },
            { $group: {
                _id: '$categoryInfo.name',
                totalQuantity: { $sum: '$products.quantity' }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
          ]);
      
  
      return topCategories;
    } catch (error) {
      console.error('Error fetching top categories:', error);
      return [];
    }
  }
  
  // Example function to get top 10 best-selling brands
  async function getTop10Brands() {
    try {
      const topBrands = await Order.aggregate([
        { $unwind: '$products' },
        { $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'productInfo'
        }},
        { $unwind: '$productInfo' },
        { $group: {
            _id: '$productInfo.brand',
            totalQuantity: { $sum: '$products.quantity' }
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);
  
      return topBrands;
    } catch (error) {
      console.error('Error fetching top brands:', error);
      return [];
    }
  }
const userManagement = async (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try{
        const users = await User.find({is_admin:0}).skip(skip).limit(limit);
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);
        const user = await User.findById(req.session.User_id); 
    
        res.render('userData',{user:users,admin:user,currentPage: page, totalPages: totalPages});
    }catch(error){
        console.log(error.message);
    }
};
const edituser = async (req,res)=>{
    try{
        const id = req.query.id;
        const userData = await User.findById ({_id:id});
        const user = await User.findById(req.session.User_id);
        if(userData){
            res.render('edit-user',{user:userData,admin:user})
        }else{
            res.redirect('/admin/userdata');
        }
    }catch(error){
        console.log(error.message);
    }
};
const updateUser = async (req,res)=>{
    try{
        const userData = await User.findByIdAndUpdate({_id:req.query.id},{$set:{
            name:req.body.name,
            username:req.body.username,
            email:req.body.email,
            mobile:req.body.mobile
        }});


        res.redirect('/admin/userdata');
    }catch(error){
        console.log(error.message);
    }
};
const deleteUser = async(req,res)=>{
    try{
        const id = req.query.id;
        await User.deleteOne({_id:id});
        res.redirect('/admin/userdata');
    }catch(error){
        console.log(error.message);
    }
}
const blockUser = async (req,res)=>{
    try{
        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{is_blocked:true}});
        res.redirect('/admin/userdata');
    }catch(error){
        console.log(error.message);
    }
};
const unblockUser = async (req,res)=>{
    try{
        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{is_blocked:false}});
        res.redirect('/admin/userdata');
    }catch(error){
        console.log(error.message);
    }
};
const logout = async (req,res)=>{
    try{
        req.session.destroy(() => {
            console.log('Session destroyed successfully');
            res.redirect('/admin');
        });
    }catch(error){
        console.log(error.message);
    }
};

const orderList = async (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try{
        const adminData = await User.findById({_id:req.session.User_id});
        const orderCount = await Order.countDocuments();
        const orders = await Order.aggregate([
            {$unwind:'$products'},
            {$lookup:{
                from:'products',
                localField:'products.productId',
                foreignField:'_id',
                as:'productDetails'
            }},
            {$unwind:'$productDetails'},
            {$lookup:{
                from:'users',
                localField:'userId',
                foreignField:'_id',
                as:'userInfo'
            }},
            {$unwind:'$userInfo'},
            {$lookup:{
                from:'payments',
                localField:'payment',
                foreignField:'_id',
                as:'paymentInfo'
            }},
            {$unwind:'$paymentInfo'},
            {$group:{
                _id:'$_id',
                products:{'$push':{
                    productId: '$products.productId',
                    productName: '$productDetails.name',
                    productImage: '$productDetails.image',
                    quantity: '$products.quantity'}},
                payment:{'$first':'$paymentInfo'},
                userId:{'$first':'$userInfo'},
                totalAmount:{'$first':'$totalAmount'},
                orderId:{'$first':'$orderId'},
                DateOrder :{'$first':'$DateOrder'},
                status:{'$first':'$status'}
            }},
            {$project:{
                _id:1,
                products:1,
                payment:1,
                userId:1,
                totalAmount:1,
                orderId:1,
                DateOrder:{$dateToString:{format:"%Y-%m-%d %H:%M:%S",date:"$DateOrder"}},
                status:1
            }},{ $sort: { DateOrder: -1 } }, 
            { $skip: skip },
            { $limit: limit }
        ]);
        const totalPages= Math.ceil(orderCount/limit);
        console.log(orderCount,totalPages)
        res.render('orderList',{admin:adminData,order:orders,currentPage: page,
            totalPages});
    }catch(error){
        console.error(error.message)
    }

  };

  const updatePaymentStatus =async (req,res)=>{
    
  try {
    const orderId = req.query.id;
    console.log(orderId,'orderId')
    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

   const payment = await Payment.findOne({orderId:orderId});
   if(payment.status==='pending'){
    payment.status ='paid'
    payment.save();
   }else{
    payment.status = 'pending';
    payment.save();
   }
    res.redirect('/admin/orderList',)
  } catch (error) {
    console.error('Error updating order status:', error);
  }
};
const updateStatus = async(req,res)=>{
    try{
        const {status,orderId}= req.body;
        
        const order = await Order.findByIdAndUpdate(orderId,{$set:{status:status}},{new:true});
        

        if(status==='Delivered'){    
            for (const item of order.products) {
                const product = await Product.findById(item.productId);
                if(product){
                    const sizeObj = product .size.find(size =>size.size === item.size);
                    if(sizeObj){
                        await Product.findOneAndUpdate(
                            {_id:item.productId,'size.size':item.size},
                        {$inc:{'size.$.stock':-item.quantity}}
                    );
                    }
                }
            }
        }
        res.json({success:true})
    }catch(error){
        console.log(error.message)
    }
};
const orderDetails = async(req,res)=>{
    try{
        const orderId = req.query.id;
        const adminData = await User.findById({_id:req.session.User_id});
        const order =  await getOderDetails(orderId);
        console.log(order,'orderItems')
        res.render('orderDetails',{orderList:order,admin:adminData})
        
    }catch(error){
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}
const couponPageLoad = async (req,res)=>{
    try{
        const adminData = await User.findById({_id:req.session.User_id});
        if(!adminData){
            return res.status(400).send('admin please logged in')
        };
        const coupon = await Coupon.find();

        const formattedCoupons = coupon.map(coupon => {
            return {
                ...coupon._doc, 
                formattedExpirityDate: moment(coupon.expirityDate).format('MMMM Do YYYY')
            };
        });
        res.render('coupon',{admin:adminData,coupon:formattedCoupons})
        

    }catch(error){
        console.error(error.message);
        res.status(500).send('server Error',error.message);
    }
};
const addCouponPageLoad = async (req,res)=>{
    try{
        const adminData = await User.findById({_id:req.session.User_id});
        if(!adminData){
            return res.status(400).send('admin please logged in')
        }
        res.render('addCoupon',{admin:adminData})
    }catch(error){
        console.error(error.message);
        res.status(500).send('server errror',error.message)
    }
};
const addCoupon = async (req,res)=>{
    try{
        const {code,type,discount,discription,limit,date} = req.body;
        console.log('date from form ',code,type,discount,discription,limit,date);
        let coupon = new Coupon({
            code:code,
            type:type,
            maxDiscount:discount,
            discription:discription,
            limit:limit,
            expirityDate:date
        });
         await coupon.save();
        res.redirect('/admin/coupon')

    }catch(error){
        console.error(error.message);
        res.status(500).send('server Error',error.message)
    }
}
const salesReport = async (req,res)=>{
    try{
        const adminData = await User.findById({_id:req.session.User_id});
        if(!adminData){
            return res.status(400).send('admin please logged in')
        }
        const orders = await Order.aggregate([
            {$unwind:'$products'},
            {$lookup:{
                from:'products',
                localField:'products.productId',
                foreignField:'_id',
                as:'productDetails'
            }},
            {$unwind:'$productDetails'},
            {$lookup:{
                from:'users',
                localField:'userId',
                foreignField:'_id',
                as:'userInfo'
            }},
            {$unwind:'$userInfo'},
            {$lookup:{
                from:'payments',
                localField:'payment',
                foreignField:'_id',
                as:'paymentInfo'
            }},
            {$unwind:'$paymentInfo'},
            {$group:{
                _id:'$_id',
                products:{'$push':{
                    productId: '$products.productId',
                    productName: '$productDetails.name',
                    productImage: '$productDetails.image',
                    productPrice:'$productDetails.price',
                    quantity: '$products.quantity',}},
                payment:{'$first':'$paymentInfo'},
                userId:{'$first':'$userInfo'},
                totalAmount:{'$first':'$totalAmount'},
                DateOrder :{'$first':'$DateOrder'},
                status:{'$first':'$status'}
            }},
            {$project:{
                _id:1,
                products:1,
                payment:1,
                userId:1,
                totalAmount:1,
                DateOrder:{$dateToString:{format:"%Y-%m-%d %H:%M:%S",date:"$DateOrder"}},
                status:1
            }},{ $sort: { DateOrder: -1 } }, 
        ]);
        console.log(orders)
        res.render('salesReport',{admin:adminData,order:orders})

    }catch(error){
        console.error(error.message)
        res.status(500).send('server error',error.message);
    }
};
const removeCoupon = async(req,res)=>{
    try{
        const id = req.query.id;
        await Coupon.findByIdAndDelete(id);
        res.redirect('/coupon')

    }catch(error){
        console.error(error.messsage);
        res.status(500).send('server error',error.message);
    }
}
const fileredSalesReport = async (req, res) => {
    try {
        const adminData = await User.findById(req.session.User_id);
        if (!adminData) {
            return res.status(400).send('Admin not logged in');
        }

        // Extracting startDate and endDate from query parameters
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(req.query.endDate);

        // MongoDB aggregation pipeline with date filtering
        const orders = await Order.aggregate([
            { $match: {
                DateOrder: { $gte: startDate, $lte: endDate }
            }},
            { $unwind: '$products' },
            { $lookup: {
                from: 'products',
                localField: 'products.productId',
                foreignField: '_id',
                as: 'productDetails'
            }},
            { $unwind: '$productDetails' },
            { $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo'
            }},
            { $unwind: '$userInfo' },
            { $lookup: {
                from: 'payments',
                localField: 'payment',
                foreignField: '_id',
                as: 'paymentInfo'
            }},
            { $unwind: '$paymentInfo' },
            { $group: {
                _id: '$_id',
                products: { $push: {
                    productId: '$products.productId',
                    productName: '$productDetails.name',
                    productImage: '$productDetails.image',
                    productPrice: '$productDetails.price',
                    quantity: '$products.quantity',
                    discount: { $ifNull: ['$products.discount', 0] }  // Assuming discount is a field in products
                }},
                payment: { $first: '$paymentInfo' },
                userId: { $first: '$userInfo' },
                totalAmount: { $first: '$totalAmount' },
                DateOrder: { $first: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$DateOrder" } } },
                status: { $first: '$status' }
            }},
            { $project: {
                _id: 1,
                products: 1,
                payment: 1,
                userId: 1,
                totalAmount: 1,
                DateOrder: 1,
                status: 1,
                totalQuantity: { $sum: '$products.quantity' }, // Calculating total quantity
                totalDiscount: { $sum: '$products.discount' } // Calculating total discount
            }},
            { $sort: { DateOrder: -1 } }
        ]);

        // Calculating grand total amount and total number of orders
        const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        const orderCount = orders.length;
        const totalDiscount = orders.reduce((acc, order) => acc + order.totalDiscount, 0);
        console.log(totalDiscount,'discout')
        res.render('filteredSalesReport', {
            admin: adminData,
            order: orders,
            totalSales,
            orderCount,startDate,endDate,
            totalDiscount
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error: ' + error.message);
    }
};

const filterData = async (req,res)=>{
    const filter = req.query.filter;

  let data;

  // Logic to fetch data based on filter
  switch (filter) {
    case 'daily':
      data = await getDailyChartData();
      break;
    case 'weekly':
      data = await getWeeklyChartData();
      break;
    case 'monthly':
      data = await getMonthlyChartData();
      break;
    case 'yearly':
    default:
      data = await getYearlyChartData();
      break;
  }

  res.json(data); // Send JSON response with data
};

async function getYearlyChartData() {
    const pipeline = [
      {
        $group: {
          _id: { $year: '$DateOrder' },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } } // Sort by year ascending
    ];
  
    return await Order.aggregate(pipeline);
  }
  

  async function getMonthlyChartData() {
    const pipeline = [
      {
        $group: {
          _id: { year: { $year: '$DateOrder' }, month: { $month: '$DateOrder' } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } } // Sort by year and month ascending
    ];
  
    return await Order.aggregate(pipeline);
  }
  async function getDailyChartData() {
    const pipeline = [
      {
        $group: {
          _id: { year: { $year: '$DateOrder' }, month: { $month: '$DateOrder' }, day: { $dayOfMonth: '$DateOrder' } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } } // Sort by year, month, and day ascending
    ];
  
    return await Order.aggregate(pipeline);
  }
  async function getWeeklyChartData() {
    const pipeline = [
      {
        $group: {
          _id: { year: { $year: '$DateOrder' }, week: { $week: '$DateOrder' } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } } // Sort by year and week ascending
    ];
  
    return await Order.aggregate(pipeline)
}
  
module.exports={
    adminPage,
    adminVerify,
    adminhome,
    userManagement,
    edituser,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser,
    logout,
    orderList,
    updatePaymentStatus,
    updateStatus,
    orderDetails,
    couponPageLoad,
    addCouponPageLoad,
    addCoupon,
    salesReport,removeCoupon,
    fileredSalesReport,
    filterData
}