const User = require('../models/userModel');
const Order = require('../models/order');
const Payment = require('../models/payment');
const bcrypt = require("bcrypt");
const Product = require('../models/products');
const randomString = require('randomstring');
const nodemailer = require('nodemailer');
const { format } = require('morgan');
const {getOderDetails} = require('../config/aggregation')

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
        res.render('home',{admin:adminData});
    }catch(error){
        console.log('home page some error')
        console.log(error.message);
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
    orderDetails
}