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
const Cart = require('../models/cart');
const { session, use } = require("passport");
const userRouts = require("../routes/users");
const category = require("../models/category");

let count =0;
const homepage = async (req, res) => {
  try {
    const catman = await Category.find({name:'men'});
    const catwomen = await Category.find({name:'women'});
    const catkids = await Category.find({name:'kids'});
    const catfootwear = await Category.find({name:'footwear'});
    const men = await Product.find({category:catman}).limit(3);
    const women = await Product.find({category:catwomen}).limit(3);
    const kids = await Product.find({category:catkids}).limit(3);
    const footwear = await Product.find({category:catfootwear}).limit(3);
    const isLoggedIn = req.session.user || req.user;
    if(isLoggedIn){
      const id = isLoggedIn._id;
    
    const cart = await Cart.findOne({userid:id});
    if(cart){
      count = cart.products.reduce((total, product) => total + product.quantity, 0);;
    }
    console.log(isLoggedIn,"is login")
    }
    
    res.render("index", { men:men,women:women,kids:kids,footwear:footwear, isLoggedIn: isLoggedIn,count:count});
  } catch (error) {
    console.log(error.message);
  }
};
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
    console.log(error.message);
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
    console.log(error.message);
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
      return res.render('login',{message:'Username/email incorrect',isLoggedIn:false,count:count})
    }
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (!passwordMatch) {
        return res.render('login',{message:'Username or password icorrect',isLoggedIn:false});
      }
      if(userData.is_blocked){
        return res.render('login',{message:'admin blocked you!',isLoggedIn:false});
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
    console.log(error.massage);
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
    console.log(error.message);
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
    console.log(error.message);
  }
};
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
  }
};
const registration = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    res.render("signup",{isLoggedIn:isLoggedIn,count:count});
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
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
    const size = product.size;
    console.log(size)
console.log(product.stock,'product stock')
    if(product.stock<=0){
      return res.status(400).send('product stock over');
    }else{
      res.render("productDetails", { product: product, isLoggedIn: isLoggedIn,ratingData:ratingData,size:size,count:count });
    }
    
    
  } catch (error) {
    res.status(500).send(error.message);
    console.log(error.message);
  }
};
const forgetLoad = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    res.render("forget",{isLoggedIn:isLoggedIn});
  } catch (error) {
    console.log("error loading forget ");
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
        res.render("forget", { message: "Please verify your emails",isLoggedIn:isLoggedIn });
      } else {
        const randomString = randonString.generate();
        const updatedData = await User.updateOne(
          { email: email },
          { $set: { token: randomString } }
        );
        resetPasswordMail(userData.name, userData.email, randomString);
        res.render("forget", {
          message: "Please check your mail to Reset password", isLoggedIn:isLoggedIn
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
    console.log(error.message);
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
      res.render('forget-password',{user_id:tokenData._id,isLoggedIn:isLoggedIn,count:count})
    }else{
      console.log('error on your token');
      res.status(500,{success:false,message:'some error happens'});

    }
  }catch(error){
    console.log('error on forgetpassword');
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
    console.log(error.message)
  }
};
const termsofuse = async (req,res)=>{
  try{
    res.render('termsofuse');

  }catch(error){
    console.log(error.message);
  }
};
const privacypolicy = async (req,res)=>{
  try{
    res.render('privacypolicy');
  }catch(error){
    console.log(error.message);
  }
};
const menCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const category = await Category.find({name:'men'});
    const productList = await Product.find({category:category});
    
    res.render('men',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.log(error.message);
  }
};
const womenCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryWomen = await Category.find({name:'women'});
    const productList = await Product.find({category:categoryWomen});
    
    res.render('women',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.log(error.message);
  }
};
const kidsCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryKids = await Category.find({name:'kids'})
    const productList = await Product.find({category:categoryKids});
    res.render('kids',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.log(error.message);
  }
};
const footwearCategory = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const categoryFootwear = await category.find({name:'footwear'})
    const productList = await Product.find({category:categoryFootwear});
    res.render('footwear',{product:productList,isLoggedIn:isLoggedIn,count:count})
  }catch(error){
    console.log(error.message);
  }
};

const userDetails = async (req,res)=>{
  try{
    const isLoggedIn = req.session.user;
    const id = isLoggedIn._id;
    console.log(id,'userDetailes');
    const userData = await User.findById(id);
    if(userData){
      res.render('userDetails',{isLoggedIn:isLoggedIn,count:count});
    }else{
      res.status(400).send('some error happend');
    }    
  }catch(error){
    console.log(error.message);
  }
};
const editProfileLoad = async (req,res) =>{
  try{
    const isLoggedIn = req.session.user;
    const id = req.query.id;
    const userData = await User.findById({_id:id});
    if(userData){
      res.render('editProfile',{isLoggedIn:isLoggedIn,user:userData,count:count});
    }else{
      res.redirect('/userDetails')
    }
  }catch(error){
    console.error(error.message)
  }
};
const updateProfile = async (req,res)=>{
  try{
    const id = req.body.id;
    const userDataUpdated = 
      {
        name:req.body.name,
        username:req.body.username,
        email:req.body.email,
        mobile:req.body.mobile
      }
      await User.findByIdAndUpdate(id,userDataUpdated,{new:true});
    res.redirect(`/userDetails?id=${id}`)

  }catch(error){
    console.log(error.message);
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
    console.log(error.message);
  }
};
const addAddressLoad = async(req,res)=>{
  try{
    const isLoggedIn = req.session.user
    res.render('addAddress',{isLoggedIn:isLoggedIn,count:count});
  }catch(error){
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    res.redirect('/showAddress')
  }catch(error){
    console.log(error.message);
  }
};
const deleteAddress = async(req,res)=>{
  try{
    const id = req.query.id;
    await Address.deleteOne({_id:id});
    res.redirect('/showAddress')

  }catch(error){
    console.log(error.message);
  }
};

const addToCart = async (req, res) => {
  try {
    const isLoggedIn = await User.findById(req.session.user);
    if (!isLoggedIn) {
      return res.redirect('/login')
    }

    const id = isLoggedIn._id;
    
    const cartData = await Cart.aggregate([
      { $match: { userid: id } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products", // Ensure the collection name is correct
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$_id",
          userid: { $first: "$userid" },
          products: { $push: { productId: "$products.productId", quantity: "$products.quantity", details: "$productDetails" } }
        }
      }
    ]);

    if (cartData.length === 0) {
      return res.render('addtocart', { isLoggedIn: isLoggedIn, productList: [], count: 0 });
    }

    const productList = cartData[0].products.map(p => ({
      ...p.details,
      quantity: p.quantity
    }));

    const count = productList.reduce((total, product) => total + product.quantity, 0);

    res.render('addtocart', { isLoggedIn: isLoggedIn, productList: productList, count: count });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal server error');
  }
};

const addproducttoCart = async (req, res) => {
  

  if (error) {
    console.error(error.message);
    res.status(500).send('Internal server error');
  }
};


const checkoutLoad = async (req,res) =>{
  try{
      const isLoggedIn = await User.findById(req.session.user);
      res.render('checkout',{isLoggedIn:isLoggedIn});
  }catch(error){
      console.error(error.message);
  }
};
const removeProduct = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user;

    // Check if productId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    // Find the product in the Product collection
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    console.log(`Removing product ${productId} for user ${userId}`);

    // Find the user's cart
    const userCart = await Cart.findOne({ userid: userId });
    if (userCart) {
      // Find the index of the product in the cart's products array
      const productIndex = userCart.products.findIndex(p => p.productId.toString() === productId);
      if (productIndex > -1) {
        // Adjust the total price
        const removedQuantity = userCart.products[productIndex].quantity;

        userCart.total -= product.price * removedQuantity;

        product.stock += 
        // Remove the product from the array
        userCart.products.splice(productIndex, 1);
        // Save the updated cart
        await userCart.save();
        await product.save();
        console.log(`Product ${productId} removed from cart`);
        return res.json({ success: true, message: 'Product removed from cart' });
      } else {
        return res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
    } else {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const updateQuantity = async (req,res)=>{
  try{
    const {productId, quantity} = req.body;
    if(!quantity || !productId || isNaN(quantity)){
      return res.status(400).json({success:false,message:'Invalid productId or Quantity'});
    }
    const product = await Product.findById(productId);
    if(!product){
      return res.status(404).json({success:false, message:'product not found'});
    }

    const currentQuantity = product.stock;
    const newQuantity = parseInt(quantity);
    const quantityDifference = newQuantity - currentQuantity;

    if(quantityDifference >0 && product.stock < quantityDifference){
      return res.status(400).json({success:false,message:'Not enough stock available'});
    }
    product.stock = newQuantity;
    await product.save();
    res.json({success:true,message:'Quantity updated successfully'});
  }catch(error){
    console.error(error.message);
  }
};
const showOrder = async(req,res)=>{
  try{
    const isLoggedIn = await User.findById(req.session.user);
    res.render('order',{isLoggedIn:isLoggedIn}); 
  }catch(error){
    console.log(error.message);
  }
}
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
  showOrder
};
