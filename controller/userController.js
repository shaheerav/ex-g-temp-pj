const { json } = require("body-parser");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const OTPGenerator = require("otp-generator");
const randonString = require("randomstring");
const Category = require('../models/category')

const Product = require("../models/products");
const Address = require('../models/address');
const Order = require("../models/order");
const Cart = require('../models/cart');
const Payment = require('../models/payment');
const {getOderDetails} = require('../config/aggregation');
const { session, use } = require("passport");
const userRouts = require("../routes/users");
const category = require("../models/category");
const products = require("../models/products");
const cart = require("../models/cart");
 
const address = require("../models/address");
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;


let count =0;
const homepage = async (req, res) => {
  try {
    const categories = await Category.find({});

    const productPromises = categories.map(category =>
      Product.find({ category: category._id }).limit(3).exec()
    );

    const products = await Promise.all(productPromises);

    const productsByCategory = {};
    categories.forEach((category, index) => {
      productsByCategory[category.name] = {
        description: category.description,
        products: products[index]
      };
    });

    const isLoggedIn = req.session.user || req.user;
    let count = 0;

    if (isLoggedIn) {
      const id = isLoggedIn._id;
      const cart = await Cart.findOne({ userId: id });

      if (cart) {
        count = countCart(cart);
      }

      console.log(isLoggedIn, "is login");
    }

    res.render("index", { productsByCategory, isLoggedIn, count });
  } catch (error) {
    console.error(error.message);
  }
};
function countCart(product){
  
  let count = product.products.reduce((total, product) => total + product.quantity, 0);
  return count;
};
function getEnumValues(schema,path){
  return schema.path (path).enumValues;
}
function isEmptyValue(obj){
  let values = Object.values(obj);
  for(let value of values){
    if(value != null && value !=undefined && value !=''){
      return false
    }
  }
  return true;
}

const addUser = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("signup", {
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    

    const existingUser = await User.findOne({
      $or: [
        { email: req.body.email },
        { username: req.body.username },
        { mobile: req.body.mobile },
      ],
    });

    if (existingUser) {
      return res.render("signup", {
        message: "User already exists",
        isLoggedIn:isLoggedIn
      });
    };

    const spassword = await securePassword(req.body.password);

    const user = new User({
      name: req.body.name,
      username: req.body.username,
      password: spassword,
      email: req.body.email,
      mobile: req.body.mobile,
    });

    if(isEmptyValue(user)){
      return res.render('singup',{message:"No value added"});
      }
      const userData = await user.save();
    if (userData) {
      const otpSecret = OTPGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabetsets: false,
        upperCaseAlphabets: false,
        specialChars: false
      });

      user.otp_generate = otpSecret;
      await user.save();
      const otp = user.otp_generate;

      sendOTPEmail(userData.email, otp);
      res.redirect(`/verifyOtp?userId=${userData._id}`);
      console.log('user added');

    } else {
      res.render("signup", { message: "User registration has failed",isLoggedIn:isLoggedIn });
    }
    console.log("User added");
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).send("Internal Server Error");
  }
};
const loadOtpPage = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    const userId = req.query.userId;
    console.log(userId,'userid from verify')
    res.render("verifyOtp", {
      message: "Enter the OTP sent to your email",
      user_id: userId,
      isLoggedIn:isLoggedIn,
      count:count
    });
  } catch (error) {
    console.error(error.message);
  }
};

const generateNewOtp = () => {
  return OTPGenerator.generate ( 6 , { digits:true,
  lowerCaseAlphabets:false,
upperCaseAlphabets:false,
specialChars:false
});
};
const resendOtp = async (req, res) => {
  try {
    console.log('Received resendOtp request:', req.body);
    const { userId } = req.body;
    console.log('userid',userId);
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newOtp = generateNewOtp();
    user.otpSecret = newOtp;
    await user.save();

    // Send the new OTP to the user's email
    await sendOTPEmail(user.email, newOtp);


    res.status(200).json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error during OTP resend:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const verificationOTP = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    const userId = req.query.userId;
    console.log("User ID from query:", userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.render("verifyOTP", { message: "user not found",isLoggedIn:isLoggedIn,user_id:userId });
    }
    console.log('username',user.name)
    console.log('otp secret :',user.otp_generate);
    const enterOtp = req.body.otp;
    const isOtpValid = enterOtp === user.otp_generate;
    console.log('isotpValid',isOtpValid)
    if (isOtpValid) {
      await User.updateOne({ _id: userId }, { $set: { is_verify: true } });
      return res.render("verifyOtp", {
        message: "your registration has successfully complited",isLoggedIn:isLoggedIn,user_id:user,count:count
      });
    } 
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).send("Internal Server Error");
  }
};
//function to calculate a new expiration time
const calculateNewExpirationTime =()=>{
  const now = new Date();
  return now.getTime() + 5 * 60 * 1000;
}
const loginPage = async (req, res) => {
  try {
    if(req.session.user){
      res.redirect('/')
    }else{
      res.render("login",{isLoggedIn:false,count:count});
    }
    
  } catch (error) {
    console.error(error.message);
  }
};
const loginValidate = async (req, res) => {
  try {
    const isLoggedIn = req.session.user
    const { email, password, username } = req.body;
    const userData = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (!userData) {
      return res.render('login',{message:'Username incorrect',isLoggedIn:false,count:count})
    }
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (!passwordMatch) {
        return res.render('login',{message:'Username or password icorrect',isLoggedIn:false,count:0});
      }
      if(userData.is_blocked){
        return res.render('login',{message:'admin blocked you!',isLoggedIn:false,count:0});
      }
        req.session.user_id = userData._id;
      req.session.user = userData;
      res.redirect('/')
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};
const loadHome = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id });
    res.render("/", { user: userData,count:count });
  } catch (error) {
    console.error(error.massage);
  }
};
const userLogout = async (req, res) => {
  try {
    console.log('not entering to the contoller')
    req.session.destroy(() => {
      console.log('Session destroyed successfully');
      res.redirect('/login');
  });
  } catch (error) {
    console.error(error.message);
  }
};
const verifyMail = async (req, res) => {
  try {
    const updateInfo = await User.updateOne(
      { _id: req.query.id },
      { $set: { is_verified: 1 } }
      
    );
    res.render("email-verified");
  } catch (error) {
    console.error(error.message);
  }
};
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error(error.message);
  }
};
const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: "465",
      auth: {
        user: process.env.gmailUser,
        pass: process.env.gmailpassword,
      },
      secure: false, // Set this to false
      tls: {
        rejectUnauthorized: false, // Avoids Node.js self-signed certificate errors
      },
    });
    const mailOptions = {
      from: "vshaheera89@gmail.com",
      to: email,
      subject: "OTP Verification",
      text: `your OTP is :${otp}`,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.error(error.message);
  }
};
const registration = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    res.render("signup",{isLoggedIn:isLoggedIn,count:count});
  } catch (error) {
    console.error(error.message);
  }
};
//google verification
const loadAuth = (req, res) => {
  res.render("auth");
};
const successGoogleLogin = async (req, res) => {
  try {
    if (!req.user) {
      res.render("login", { message: "failed to sing in with google" });
    }
    res.redirect("/", { user: req.user.email,count:count });
  } catch (error) {
    console.error(error.message);
  }
};
const productDetails = async (req, res) => {
  try {
    const id = req.query.id;
    const isLoggedIn = req.session.user;
    console.log( id);
    const product = await Product.findById( id );
    const ratingData = {
      star:4,
      totalrating:100
    };
    const userid = isLoggedIn._id; 
    const size = product.size;
    const cart = await Cart.findOne({ userId: userid });
    let isProductInCart = false;
    if (cart && Array.isArray(cart.products)) {
      isProductInCart = cart.products.some(cartProduct => cartProduct.productId.toString() === id);
    }
      res.render("productDetails", { product: product, isLoggedIn: isLoggedIn,ratingData:ratingData,size:size,count:count,isOutOfStock: product.stock === 0,isProductInCart:isProductInCart });
  
  } catch (error) {
    res.status(500).send(error.message);
    console.error(error.message);
  }
};
const forgetLoad = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    res.render("forget",{isLoggedIn:isLoggedIn,count:0});
  } catch (error) {
    console.error("error loading forget ");
    res.status(500, { success: false, message: "Internal Server Error" });
  }
};
const forgetVerify = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    const email = req.body.email;
    const userData = await User.findOne({ email: email });
    console.log("user", userData);
    if (userData) {
      if (userData.is_verify === false) {
        res.render("forget", { message: "Please verify your emails",isLoggedIn:isLoggedIn,count:0 });
      } else {
        const randomString = randonString.generate();
        const updatedData = await User.updateOne(
          { email: email },
          { $set: { token: randomString } }
        );
        resetPasswordMail(userData.name, userData.email, randomString);
        res.render("forget", {
          message: "Please check your mail to Reset password", isLoggedIn:isLoggedIn,count:0
        });
      }
    } else {
      res.render("forget", { message: "Email Incorrect" ,isLoggedIn:isLoggedIn});
    }
  } catch (error) {
    console.error("error on verify forget");
    res.status(500, { sucess: false, message: "Internal server error" });
  }
};
//-----------for reset password send mail
const resetPasswordMail = async (name, email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: "465",
      auth: {
        user: "vshaheera89@gmail.com",
        pass: "kgjr dsij cfjn jotn",
      },
      secure: false, // Set this to false
      tls: {
        rejectUnauthorized: false, // Avoids Node.js self-signed certificate errors
      },
    });
    const mailOption = {
      from: "vshaheera89@gmail.com",
      to: email,
      subject: "For Reset Password",
      html:
        "<p>Hi " +
        name +
        'please click here to <a href="http://localhost:3000/forget-password?token=' +
        token +
        '"> Reset</a> your password</p>',
    };
    transporter.sendMail(mailOption, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:-", info.response);
      }
    });
  } catch (error) {
    console.error(error.message);
  }
};
const forgetPasswordLoad = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const token = req.query.token;
    console.log('token',token)
    const tokenData = await User.findOne({token:token});
    console.log('user :',tokenData._id);
    if(tokenData){
      res.render('forget-password',{user_id:tokenData._id,isLoggedIn:isLoggedIn,count:0})
    }else{
      console.log('error on your token');
      res.status(500,{success:false,message:'some error happens'});

    }
  }catch(error){
    console.error('error on forgetpassword');
    res.status(500,{ success: false, message: "Internal server error" })
  }
};
const resetPassword = async(req,res)=>{
  try{
    const password = req.body.password;
    const user_id = req.body.user_id;
    console.log('user:',user_id);
    const sPassword = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate({_id:user_id},{$set:{password:sPassword,token:''}});
    res.redirect('login')

  }catch(error){
    console.error(error.message)
  }
};
const termsofuse = async (req,res)=>{
  try{
    res.render('termsofuse');

  }catch(error){
    console.error(error.message);
  }
};
const privacypolicy = async (req,res)=>{
  try{
    res.render('privacypolicy');
  }catch(error){
    console.error(error.message);
  }
};
const menCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const category = await Category.find({name:'men'});
    const productList = await Product.find({category:category});
    
    res.render('men',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.error(error.message);
  }
};
const womenCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryWomen = await Category.find({name:'women'});
    const productList = await Product.find({category:categoryWomen});
    
    res.render('women',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.error(error.message);
  }
};
const kidsCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryKids = await Category.find({name:'kids'})
    const productList = await Product.find({category:categoryKids});
    res.render('kids',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.error(error.message);
  }
};
const footwearCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryFootwear = await category.find({name:'footwear'})
    const productList = await Product.find({category:categoryFootwear});
    res.render('footwear',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.error(error.message);
  }
};

const userDetails = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const id = isLoggedIn._id;
    console.log(id,'userDetailes');
    const userData = await User.findById(id);
    if(userData){
      res.render('userDetails',{isLoggedIn:isLoggedIn,count:count,error:[]});
    }else{
      res.status(400).send('some error happend');
    }    
  }catch(error){
    console.error(error.message);
  }
};
const editProfileLoad = async (req,res) =>{
  try{
    const isLoggedIn = req.session.user;
    const id = req.query.id;
    const userData = await User.findById({_id:id});
    if(userData){
      res.render('editProfile',{isLoggedIn:isLoggedIn,user:userData,count:count,errors:''});
    }else{
      res.redirect('/userDetails')
    }
  }catch(error){
    console.error(error.message)
  }
};
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    const { id, name, username, email, mobile } = req.body;
    const isLoggedIn = req.session.user;
    if(!errors.isEmpty()){
      res.render('editProfile',{errors:errors.mapped(),isLoggedIn:isLoggedIn,user:{_id:id,name,username,email,mobile},count:count})
    }
    const userDataUpdated = { name, username, email, mobile };
    const updatedUser = await User.findByIdAndUpdate(id, userDataUpdated, { new: true });
    
   
      req.session.user = updatedUser;
    res.redirect(`/userDetails?id=${id}`);

  } catch (error) {
    console.error(error.message);
  }
};


const addresspageLoad = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const id = isLoggedIn._id
    const address = await Address.find({user:id});
    console.log(address,'addresspage')
    
    res.render('showAddress',{isLoggedIn:isLoggedIn,count:count,user:address||[]});
  }catch(error){
    console.error(error.message);
  }
};
const addAddressLoad = async(req,res)=>{
  try{
    const isLoggedIn = req.session.user
    res.render('addAddress',{isLoggedIn:isLoggedIn,count:count});
  }catch(error){
    console.error(error.message);
  }
};
const addAddress =async (req,res)=> {
  try{
    const isLoggedIn = req.session.user
    if(!isLoggedIn){
       return res.redirect('/login');
    }
    let address = new Address({
      user:isLoggedIn._id,
      fullname:req.body.fullname,
      mobile:req.body.mobile,
      pincode:req.body.pincode,
      street:req.body.street,
      city:req.body.city,
      state:req.body.state,
      country:req.body.country
    });

    address = await address.save()
    res.redirect(`/showAddress?${isLoggedIn._id}`);
  }catch(error){
    console.error(error.message);
  }
};
const editAddress = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const id = req.query.id;
    const address = await Address.findById({_id:id});
    console.log('address',address);
    res.render('editAddress',{isLoggedIn:isLoggedIn,user:address,count:count});
  }catch(error){
    console.error(error.message);
  }
};
const updateAddress = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const id = req.query.id;
    const editData = await Address.findByIdAndUpdate({_id:id},{
      $set:{
      user:isLoggedIn._id,
      fullname:req.body.fullname,
      mobile:req.body.mobile,
      pincode:req.body.pincode,
      street:req.body.street,
      city:req.body.city,
      state:req.body.state,
      country:req.body.country
      }
    });
    req.session.user = await User.findById(isLoggedIn._id);
    res.redirect('/showAddress')
  }catch(error){
    console.error(error.message);
  }
};
const deleteAddress = async(req,res)=>{
  try{
    const id = req.query.id;
    await Address.deleteOne({_id:id});
    res.redirect('/showAddress')

  }catch(error){
    console.error(error.message);
  }
};

const addToCart = async (req, res) => {
  try{
    const userId = req.session.user;
    const isLoggedIn = userId
    const userCart = await Cart.findOne({ userId: userId });
    console.log(userCart);
    if (!userCart) {
      return res.render('addtocart', { isLoggedIn: isLoggedIn, productList: [], count: 0,total:0 });
    }
    console.log(userId,'userid');
    
    const cartData = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId._id) } },
      {
        $lookup:{
          from:'products',
          localField:'products.productId',
          foreignField:'_id',
          as:'productDetails'
        }
      }
    ]);

    console.log('Cart Data:', cartData);
    let totalAmount = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId._id) } }, // Match the cart with the given userId
    { $unwind: '$products' }, // Unwind the products array
    {
      $group: {
        _id: '$userId',
        totalAmount: {
          $sum: {
            $multiply: [
              { $toDouble: '$products.price' }, // Convert price to double
              '$products.quantity'
            ]
          }
        }
      }
    }
    ]);
    console.log(totalAmount[0].totalAmount,'total amount')
    let total = totalAmount[0].totalAmount

    if (cartData.length === 0) {
      return res.render('addtocart', { isLoggedIn: isLoggedIn, productList: [], count: 0,total:0 });
    }else{
    
    let productList = cartData[0].products.map(item => ({
      _id:item._id,
      productId: item.productId,
      quantity: item.quantity,
      price:item.price,
      name:item.name,
      image: cartData[0].productDetails.find(product => product._id.toString() === item.productId.toString()).image,
      stock:cartData[0].productDetails.find(product => product._id.toString() === item.productId.toString()).stock
    }));
      console.log(productList,'product list')

    // Calculate total count of products in the cart
    let count = productList.reduce((total, product) => total + product.quantity, 0);

    res.render('addtocart', { isLoggedIn: isLoggedIn, productList: productList, count: count,total:total });
  }
  }catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Internal server error');
  }
};

const addproducttoCart = async (req, res) => {
  try{
    const user = req.session.user;
    if(!user){
      console.log("User not found in the session");
      return res.status(400).send('user not authenticated');
    }
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if(!product){
      console.log('Product not found');
      return res.status(400).send('product not found');
    }
    console.log('Request Body:', req.body);
    const quantity = parseInt(req.body.quantity, 10);
    console.log(quantity,'product quantity')

    if (isNaN(quantity) || quantity <= 0) {
      console.log('invalide quantity')
      return res.status(400).send('Invalid quantity');
    }
    console.log(quantity,'product quantity')

    const id = user._id
    const userCart = await Cart.findOne({userId:id});
     
    if(userCart){
      const productIndex = await userCart.products.findIndex(p=>p.productId.toString() ===productId.toString());
      console.log(productIndex,'same product');
      if(productIndex>-1){
        const existingQuantity = userCart.products[productIndex].quantity;
        const newQuantity = parseInt(req.body.quantity, 10);
            if (isNaN(newQuantity) || newQuantity <= 0) {
              console.log('Invalid quantity');
              return res.status(400).send('Invalid quantity');
            }
            let newqt = existingQuantity+ newQuantity;
            console.log(newqt,'new quantity')
           newCart = ({
            quantity:newqt
           });
           await Cart.updateOne({userId:id,'products.productId':productId},{$inc:{'products.$.quantity':newQuantity}});
      }else{
        newCart =({
          productId:productId,
          quantity:quantity,
          name:product.name,
          price:product.price
        });
        await Cart.updateOne({userId:id},{$push:{products:newCart}});
        console.log('product added sucessfully')
      }
    }else{
      const newCart = new Cart ({
        userId:user,
        products:[{
          productId:productId,
          quantity:quantity,
          name:product.name,
          price:product.price
        }]
      });
      await newCart.save();
    }
    console.log('product save to cart')
    res.redirect(`/productDetails?id=${productId}`)
  }catch(error){
    console.error(error.message);
  }
};



const removeProduct = async (req, res) => {
  try{
    const productId = req.body.productId;
    console.log(productId,'productid')
    const userId = req.session.user;

    const userCart = await Cart.findOne({ userId: userId });
    console.log('userCart:',userCart);
    if (userCart) {
      if(userCart.products.length === 1){
        await userCart.deleteOne();
        return res.status(200).json({success:true,massage:'product Removed from the cart'})
      }else{
        await Cart.updateOne({userId:userId},{$pull:{'products':{'productId':new mongoose.Types.ObjectId(productId)}}});
      console.log('product removed from the list');
      return res.status(200).json({ success: true, message: 'Product removed from the cart'})
      }  
    } else {
      console.log('some error came')
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
  }catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const updateQuantity = async (req,res)=>{
  try{
  let { cart, product, count } = req.body;
    const user = req.session.user;
    count = parseInt(count);
    console.log(cart, product, count);

    const userCart = await Cart.findOne({ userId: user });
    console.log('userCart', userCart);

    if (userCart && userCart.products) {
      const productInCart = userCart.products.find(p => p.productId.toString() === product);
      
      if (!productInCart) {
        return res.status(404).json({ success: false, message: "Product not found in cart" });
      }
      
      const productDetails = await Product.findById(product);
      if(!productDetails){
        return res.status(404).json ({success:false,message:'product detailes not found'});
      }

      const newQuantity = productInCart.quantity + count;
      if (newQuantity > productDetails.stock) {
        return res.status(400).json({ success: false, message: "Exceeds available stock" });
      }
      productInCart.quantity = newQuantity;
      await userCart.save();

      const newTotalPrice = userCart.products.reduce((total, p) => total + p.quantity * p.price, 0);

      console.log('cart updated successfully');
      return res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        newQuantity: productInCart.quantity,
        newTotalPrice: newTotalPrice
      });
    } else {
      return res.status(404).json({ success: false, message: "User cart not found or cart has no products" });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "An error occurred while updating the cart" });
  }
};

const showOrder = async(req,res)=>{
  try {
    const isLoggedIn = await User.findById(req.session.user);
    if (!isLoggedIn) {
      return res.status(401).send('User not logged in');
    }

    const userId = isLoggedIn._id;
    console.log(userId, 'user');

    const page = parseInt(req.query.page) || 1;

    const skip = (page - 1) * 5;

    const orderDetails = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId),status: { $ne: 'Cancelled' } } },
      { $unwind: '$products' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {$unwind:'$productDetails'},
      {
        $lookup: {
          from: 'addresses',
          localField: 'address',
          foreignField: '_id',
          as: 'AddressOn'
        }
      },{$unwind:'$AddressOn'},
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
        products:{'$push':'$productDetails'},
        address:{'$first':'$AddressOn'},
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
          status:1
        }
      },
      { $sort: { DateOrder: -1 } },
      {$skip:skip},
      {$limit:5}
    ]);
    console.log(orderDetails, 'orderForm');
    
    const cart = await Cart.find({ userId: userId });
    let count = 0;
    if (orderDetails.length > 0) {
      const orderDetailedList = orderDetails.map(order => {
        const productList = order.products.map(product => ({
          productName: product.name,
          price: product.price,
          image: product.image.length > 0 ? product.image[0] : '' 
        }));

        const address = order.address || {};
        const payment = order.payment || {};

        return {
          orderId: order._id,
          status:order.status,
          payment: payment.paymentMethod,
          totalAmount: order.totalAmount,
          orderDate: order.DateOrder,
          products: productList,
          address: {
            fullname: address.fullname || '',
            pincode: address.pincode || '',
            mobile: address.mobile || '',
            street: address.street || '',
            city: address.city || ''
          }
        };
      });
      const totalPages = Math.ceil(orderDetails.length / 5);
      const filteredOrderForm = orderDetailedList.filter(order => order.status !== 'Cancelled');
      console.log(filteredOrderForm,'filtered forms')
      res.render('order', { isLoggedIn: isLoggedIn, count: count, orderForm: filteredOrderForm,totalPages: totalPages});
    } else {
      res.render('order', { isLoggedIn: isLoggedIn, count: count, orderForm: '',totalpages:0 });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
const checkoutLoad = async (req,res) =>{
  try{
      const isLoggedIn = await User.findById(req.session.user);
      console.log(isLoggedIn,'user details');
      const paymentMethods = getEnumValues(Payment.schema,'paymentMethod')
      const id = isLoggedIn._id
    const userCart = await Cart.findOne({userId:id});
    count = countCart(userCart)
    let totalAmount = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } }, 
    { $unwind: '$products' }, 
    {
      $group: {
        _id: '$userId',
        totalAmount: {
          $sum: {
            $multiply: [
              { $toDouble: '$products.price' }, 
              '$products.quantity'
            ]
          }
        }
      }
    }
    ]);
    console.log(totalAmount[0].totalAmount,'total amount')
    let total = totalAmount[0].totalAmount;
    const cartData = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $lookup:{
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      }
    ]);
    
    let productList = cartData[0].products.map(item => {
      const productDetail = cartData[0].productDetails.find(product => product._id.toString() === item.productId.toString());
      return {
        _id: item._id,
        productId: productDetail._id,
        quantity: item.quantity,
        price: item.price,
        name: productDetail.name,
        image: productDetail.image,
        stock: productDetail.stock
      };
    });
    
    console.log(productList, 'list');
    const address = await Address.find({user:new mongoose.Types.ObjectId(id)});
    console.log(address,'useraddrss')

      res.render('checkout',{isLoggedIn:isLoggedIn,count:count,total:total,product:productList,address:address,paymentMethods:paymentMethods});
  }catch(error){
      console.error(error.message);
  }
};
const placeOrder = async(req,res)=>{
  
  try {
    const { addressId, paymentMethod, totalAmount,productName } = req.body;
    console.log(addressId, paymentMethod, totalAmount,productName, 'address and payment method');

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new Error('Invalid address ID format');
    }

    const userid = req.session.user;
    if (!mongoose.Types.ObjectId.isValid(userid._id)) {
      throw new Error('Invalid user ID format');
    }

    const userCart = await Cart.findOne({ userId: userid });
    if (!userCart || !userCart.products) {
      throw new Error('User cart or products are undefined');
    }

    const productIds = userCart.products.map(product => ({
      productId: product.productId,
      quantity: product.quantity
  }));

    const payment = new Payment({
      orderId:null,
      paymentMethod:paymentMethod,
      amount:totalAmount,
      status:'pending'
    });
    await payment.save();
    
    const order = new Order({
      userId:userid,
      address:addressId,
      products:productIds,
      payment:payment._id,
      totalAmount:totalAmount,
      status:'Ordered'
    });
    await order.save();
    payment.orderId = order._id;
    
    await payment.save();
    if(order){
      await Cart.deleteOne({userId:userid});
      
    }
    if(paymentMethod === 'COD'){
      
      res.json({ success: true, message: 'Order placed successfully' });
    }else{
      res.json({success:true,message:'payment pending'});
    }

  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
const searchProduct = async(req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const product = await Product.find().populate('category')
    res.render('searchProduct',{isLoggedIn:isLoggedIn,count:0,product})
  }catch(error){
    console.error(error.message)
  }
};
const cancelOrder = async (req,res)=>{
  try{
    const {reason,orderId} = req.body;
    console.log(reason,orderId,'reason')
    const userid = req.session.user;
    const order = await Order.findById(orderId);
    console.log(order,'orderlist in cancelling')
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, userId: userid },
      { $set: { 'orderStatus': reason,'status': 'Cancelled' } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true });

  }catch(error){
    console.error(error.message);
    res.json({success:false})
  }
};

const showOrderDetails = async (req,res)=>{
  try{
    const orderId = req.query.id;
    const user = req.session.user;
    const isLoggedIn = await User.findById(user);
    if(!isLoggedIn){
      return res.status(404).send('User not logged in');
    };
    const order = await getOderDetails(orderId);
    console.log(order,'order')
    res.render('orderDetails',{isLoggedIn:isLoggedIn,count:0,orderList:order})
  }catch(error){
    console.error(error.message)
  }
};
const orderCancelledList = async (req, res) => {
  try {
    const isLoggedIn = await User.findById(req.session.user);
    if (!isLoggedIn) {
      return res.status(401).send('User not logged in');
    }

    const userId = isLoggedIn._id;
    console.log(userId, 'user');

    const page = parseInt(req.query.page) || 1;

    const skip = (page - 1) * 5;

    const orderDetails = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId),status: { $eq: 'Cancelled' } } },
      { $unwind: '$products' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {$unwind:'$productDetails'},
      {
        $lookup: {
          from: 'addresses',
          localField: 'address',
          foreignField: '_id',
          as: 'AddressOn'
        }
      },{$unwind:'$AddressOn'},
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
        products:{'$push':'$productDetails'},
        address:{'$first':'$AddressOn'},
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
          status:1
        }
      },
      { $sort: { DateOrder: -1 } },
      {$skip:skip},
      {$limit:5}
    ]);
    console.log(orderDetails, 'orderForm');
    
    const cart = await Cart.find({ userId: userId });
    let count = 0;
    if (orderDetails.length > 0) {
      const orderDetailedList = orderDetails.map(order => {
        const productList = order.products.map(product => ({
          productName: product.name,
          price: product.price,
          image: product.image.length > 0 ? product.image[0] : '' 
        }));

        const address = order.address || {};
        const payment = order.payment || {};

        return {
          orderId: order._id,
          status:order.status,
          payment: payment.paymentMethod,
          totalAmount: order.totalAmount,
          orderDate: order.DateOrder,
          products: productList,
          address: {
            fullname: address.fullname || '',
            pincode: address.pincode || '',
            mobile: address.mobile || '',
            street: address.street || '',
            city: address.city || ''
          }
        };
      });
      const totalPages = Math.ceil(orderDetails.length / 5);
      
      res.render('order-cancel', { isLoggedIn: isLoggedIn, count: count, orderForm: orderDetailedList,totalPages: totalPages});
    } else {
      res.render('order-cancel', { isLoggedIn: isLoggedIn, count: count, orderForm: '',totalpages:0 });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
const orderProductDelete = async (req,res)=>{
  try{
    const userId = req.session.user;
    const {orderId,productId}= req.body;
    const order = await Order.findById(orderId);
    const reason ='product No need';
    if(order.products.length===1){
      await Order.findOneAndUpdate(
        { _id: orderId},
        { $set: { 'orderStatus': reason,'status': 'cancelled' } },
        { new: true }
      );
      return res.json({ message: 'Order deleted successfully' });
    }else{
      order.products = order.products.filter(product => product._id.toString() !== productId);
      await order.save();
      return res.json({ message: 'Product deleted from order successfully', order });
    }
  }catch(error){
    console.log(error.message);
    console.error(error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
const allProduct = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    let count=0;
    const product = await Product.find();
    res.render('allProducts',{isLoggedIn:isLoggedIn,count:count,products:product})


  }catch(error){
    console.error(error.message);
  }
};
const searchProudcts = async (req,res)=>{
  try{
    const { search, sort, category} = req.query;
    const isLoggedIn = req.session.user;
    let count = 0
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if(category){
      const categories = await Category.find({ name: { $in: category.split(',') } });
      const categoryIds = categories.map(cat => cat._id);
      query.category = { $in: categoryIds };
    }
    let sortOption = {};
    switch (sort) {
      case 'popularity':
        sortOption = { popularity: -1 };
        break;
      case 'price_low_high':
        sortOption = { price: 1 };
        break;
      case 'price_high_low':
        sortOption = { price: -1 };
        break;
      case 'average_ratings':
        sortOption = { averageRating: -1 };
        break;
      case 'featured':
        sortOption = { isFeatured: -1 };
        break;
      case 'new_arrivals':
        sortOption = { createdAt: -1 };
        break;
      case 'a_to_z':
        sortOption = { name: 1 };
        break;
      case 'z_to_a':
        sortOption = { name: -1 };
        break;
      default:
        sortOption = {};
    }

    let products = await Product.find(query).sort(sortOption);
    res.render('searchedProduct', { product: products, isLoggedIn: isLoggedIn, count: count });
  }catch(error){
    console.error(error.message);
  }
};
const error = async (req,res)=>{
  res.send("error")
};
const authFacebook = (req, res) => {
  const url = `https://www.facebook.com/v13.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=email`;
  res.redirect(url);
};
const facebookCallback =  async (req, res) => {
  const { code } = req.query;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v13.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}&redirect_uri=${REDIRECT_URI}`);

    const { access_token } = data;
    const { data: profile } = await axios.get(`https://graph.facebook.com/v13.0/me?fields=name,email&access_token=${access_token}`);
    res.redirect('/');
  } catch (error) {
    console.error('Error:', error.response.data.error);
    res.redirect('/login');
  }
};
const changePassword = async(req,res)=>{
  try{
    const isLoggedIn = await User.findById(req.session.user);
    res.render('changePassword',{isLoggedIn,message:"",count:0})
  }catch(error){
    console.error(error.message);
  }
};
const changingPassword = async (req,res)=>{
  try{
    const isLoggedIn = await User.findById(req.session.user);
    const userId = isLoggedIn._id;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (newPassword !== confirmPassword) {
            return res.render('changePassword', { message: 'New passwords do not match', isLoggedIn, count: 0 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.render('changePassword', { message: 'Current password is incorrect', isLoggedIn, count: 0 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.render('changePassword', { message: 'Password changed successfully', isLoggedIn, count: 0 });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};
module.exports = {
  registration,
  addUser,
  loginPage,
  loginValidate,
  userLogout,
  loadHome,
  verifyMail,
  loadOtpPage,
  verificationOTP,
  resendOtp,
  loadAuth,
  successGoogleLogin,
  homepage,
  productDetails,
  forgetLoad,
  forgetVerify,
  forgetPasswordLoad,
  resetPassword,
  termsofuse,
  privacypolicy,
  menCategory,
  womenCategory,
  kidsCategory,
  footwearCategory,
  userDetails,
  editProfileLoad,
  updateProfile,
  addresspageLoad,
  addAddressLoad,
  addAddress,
  editAddress,
  updateAddress,
  deleteAddress,
  addToCart,
  checkoutLoad,
  addproducttoCart,removeProduct,
  updateQuantity,
  showOrder,placeOrder,
  searchProduct,
  cancelOrder,
  showOrderDetails,
  orderCancelledList,
  orderProductDelete,
  allProduct,
  searchProudcts,
  error,
  authFacebook,
  facebookCallback,
  changePassword,
  changingPassword
};
