const { json } = require("body-parser");
const mongoose = require("mongoose");
const moment = require("moment");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const PDFDocument = require('pdfkit'); 
const { body, validationResult } = require("express-validator");
const OTPGenerator = require("otp-generator");
const randonString = require("randomstring");
const Category = require("../models/category");
const Razorpay = require("razorpay");
const uuid = require("uuid");
const Product = require("../models/products");
const Address = require("../models/address");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Payment = require("../models/payment");
const Wallet = require("../models/wallet");
const Coupon = require("../models/coupon");
const Wishlist = require("../models/wishList");
const Review = require("../models/review");
const { getOderDetails,getOderDetailsList } = require("../config/aggregation");
const { session, use } = require("passport");
const { getTestError } = require("razorpay/dist/utils/razorpay-utils");
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

var count = 0;
const homepage = async (req, res,next) => {
  try {
    
    const categories = await Category.find({});

    const productPromises = categories.map((category) =>
      Product.find({ category: category._id }).limit(3).exec()
    );

    const products = await Promise.all(productPromises);

    const productsByCategory = {};
    categories.forEach((category, index) => {
      const categoryProducts = products[index].map((product) => {
        // Calculate best offer price logic here
        let bestOfferPrice = product.price; // Default to product price if no offers found

        if (product.offer || (category.offer && category.offer > 0)) {
          const productOfferPrice = product.price - (product.price * (product.offer || 0)) / 100;
          const categoryOfferPrice = product.price - (product.price * (category.offer || 0)) / 100;

          bestOfferPrice = Math.min(productOfferPrice, categoryOfferPrice);
        }

        return {
          ...product.toObject(),
          bestOfferPrice,
        };
      });

      productsByCategory[category.name] = {
        description: category.description,
        products: categoryProducts,
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
    }
    const coupon = await Coupon.find();
    const formattedCoupons = coupon.map((coupon) => {
      return {
        ...coupon._doc,
        formattedExpirityDate: moment(coupon.expirityDate).format(
          "MMMM Do YYYY"
        ),
      };
    });
    const breadcrumbs = [{ name: "Home", url: "/" }];

    res.render("index", {
      productsByCategory,
      isLoggedIn,
      count,
      breadcrumbs,
      coupon: formattedCoupons,
    });
  } catch (error) {
    next(error)
  }
};
function countCart(product) {
  let count = product.products.reduce(
    (total, product) => total + product.quantity,
    0
  );
  return count;
}
function getEnumValues(schema, path) {
  return schema.path(path).enumValues;
}
function isEmptyValue(obj) {
  let values = Object.values(obj);
  for (let value of values) {
    if (value != null && value != undefined && value != "") {
      return false;
    }
  }
  return true;
}
function generateRefferalCode (){
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
const addUser = async (req, res,next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
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
        isLoggedIn: isLoggedIn,
        count: 0,
      });
    }
    const refferalCode = req.body.referralCode
    const spassword = await securePassword(req.body.password);
    const userReferal = generateRefferalCode();

    const user = new User({
      name: req.body.name,
      username: req.body.username,
      password: spassword,
      email: req.body.email,
      mobile: req.body.mobile,
      referralCode: userReferal || null
    });

    if (isEmptyValue(user)) {
      return res.render("singup", { message: "No value added" });
    }
    const userData = await user.save();
    const wallet = new Wallet({
      userId:userData._id,
      amount:0
    });
    await wallet.save();
    if(refferalCode){
      const refferee = await User.findOne({referralCode:refferalCode});
      if(refferee){
        const refereeWallet = await Wallet.findOne({ userId: refferee._id });
        refereeWallet.amount +=100;
        await refereeWallet.save();
      }else{
        return res.render("signup", {
          message: "Referal code not valid",
          isLoggedIn: isLoggedIn,
          count: 0,
        });
      }
    }
    if (userData) {
      const otpSecret = OTPGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabetsets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      user.otp_generate = otpSecret;
      await user.save();
      const otp = user.otp_generate;

      sendOTPEmail(userData.email, otp);
      res.redirect(`/verifyOtp?userId=${userData._id}`);
      console.log("user added");
    } else {
      res.render("signup", {
        message: "User registration has failed",
        isLoggedIn: isLoggedIn,
      });
    }
    console.log("User added");
  } catch (error) {
    next(error)
  }
};
const loadOtpPage = async (req, res) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    const userId = req.query.userId;
    console.log(userId, "userid from verify");
    res.render("verifyOtp", {
      message: "Enter the OTP sent to your email",
      user_id: userId,
      isLoggedIn: isLoggedIn,
      count: count,
    });
  } catch (error) {
    next(error);
  }
};

const generateNewOtp = () => {
  return OTPGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
};
const resendOtp = async (req, res,next) => {
  try {
    console.log("Received resendOtp request:", req.body);
    const { userId } = req.body;
    console.log("userid", userId);
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newOtp = generateNewOtp();
    user.otp_generate = newOtp;
    await user.save();
    console.log(user.otp_generate, "otp secret");
    // Send the new OTP to the user's email
    await sendOTPEmail(user.email, newOtp);

    res.status(200).json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error during OTP resend:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const verificationOTP = async (req, res, error ) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    const userId = req.body.user_id;
    console.log("User ID from query:", userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.render("verifyOTP", {
        message: "user not found",
        isLoggedIn: isLoggedIn,
        user_id: userId,
      });
    }
    console.log("username", user.name);
    console.log("otp secret :", user.otp_generate);
    const enterOtp = req.body.otp;
    console.log(enterOtp,'enter')
    const isOtpValid = enterOtp === user.otp_generate;
    console.log("isotpValid", isOtpValid);
    if (isOtpValid) {
      await User.updateOne({ _id: userId }, { $set: { is_verify: true } });
      return res.render("verifyOtp", {
        message: "your registration has successfully complited",
        isLoggedIn: isLoggedIn,
        user_id: user,
        count: 0,
      });
    } else {
      return res.render("verifyOTP", {
        message: "Invalid OTP. Please try again.",
        isLoggedIn: isLoggedIn,
        user_id: user,
        count:0

      });
    }
  } catch (error) {
    next (error)
  }
};
const loginPage = async (req, res,next) => {
  try {
    if (req.session.user || req.user) {
      res.redirect("/");
    } else {
      res.render("login", { isLoggedIn: false, count: count });
    }
  } catch (error) {
    next(error);
  }
};
const loginValidate = async (req, res , next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    const { email, password, username } = req.body;
    let userData;
    if (email) {
      userData = await User.findOne({ email: email });
    } else if (username) {
      userData = await User.findOne({ username: username });
    }

    if (!userData) {
      return res.render("login", {
        message: "Username incorrect",
        isLoggedIn: false,
        count: count,
      });
    }
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.render("login", {
        message: "Username or password icorrect",
        isLoggedIn: false,
        count: 0,
      });
    }
    if (userData.is_blocked) {
      return res.render("login", {
        message: "admin blocked you!",
        isLoggedIn: false,
        count: 0,
      });
    }
    req.session.user_id = userData._id;
    req.session.user = userData;
    res.redirect("/");
  } catch (error) {
    next(error)
  }
};
const loadHome = async (req, res, next) => {
  try {
    const userData = req.session.user ||req.user;
    res.render("/", { user: userData, count: count });
  } catch (error) {
    next(error);
  }
};
const userLogout = async (req, res, next ) => {
  try {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  } catch (error) {
    next (error);
  }
};
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    throw(error);
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
    console.error('error sending otp mail:',error.message);
    throw error;
  }
};
const registration = async (req, res,next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    res.render("signup", { isLoggedIn: isLoggedIn, count: count });
  } catch (error) {
    next(error)
  }
};
//google verification
const loadAuth = (req, res) => {
  res.render("auth");
};
const successGoogleLogin = async (req, res,next) => {
  try {
    if (!req.user) {
      res.render("login", { message: "failed to sing in with google" });
    }
    req.session.user;
    res.redirect("/");
  } catch (error) {
    next(error);
  }
};
const productDetails = async (req, res,next) => {
  try {
    const id = req.query.id;
    const isLoggedIn = req.session.user || req.user;
    const product = await Product.findById(id);
    if(!product){
      return res.status(404).render('404',{url:req.originalUrl,message:'Product not available'})
    }
    const categoryId = product.category;
    const category = await Category.findById(categoryId);
    let categoryOffer = null;
    if(category && category.offer){
      categoryOffer ={
        offer:category.offer,
        offerStart :category.offerStart,
        offerEnd:category.offerEnd
      }
      
      
    };
    let productOffer = null;
    if(product.offer){
      productOffer ={
        offer:product.offer,
        offerStart:product.offerStart,
        offerEnd:product.offerEnd
      }
      
      
    };
    let bestOffer = null;
    let bestOfferPrice = product.price;
    if(categoryOffer && productOffer){
      let categoryOfferPrice =product.price - (product.price*category.offer)/100;
      let productOfferPrice =product.price - (product.price*product.offer)/100 ;
      if(categoryOfferPrice<productOfferPrice){
        bestOffer = categoryOffer;
        bestOfferPrice = categoryOfferPrice;
      }else{
        bestOffer = productOffer;
        bestOfferPrice = productOfferPrice
      }
    }else if(categoryOffer){
      bestOffer = categoryOffer;
      bestOfferPrice = product.price - (product.price*category.offer)/100;
    }else if(productOffer){
      bestOffer = productOffer;
      bestOfferPrice = product.price - (product.price *product.offer)/100;
    }
    const size = product.size;

    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Products", url: "/allProduct" },
      { name: product.name, url: `/products/${id}` },
    ];
    let isProductInCart = false;
    let existingSizesInCart = [];
    
    if (!isLoggedIn) {
      res.render("productDetails", {
        product: product,
        isLoggedIn,
        size,
        count,
        isProductInCart,
        isOutOfStock: product.stock === 0,
        breadcrumbs,
        existingSizesInCart,
        bestOfferPrice,
        bestOffer
      });
    } else {
      const userid = isLoggedIn._id;
      const cart = await Cart.findOne({ userId: userid });

      if (cart && Array.isArray(cart.products)) {
        existingSizesInCart = cart.products
          .filter(
            (cartProduct) => cartProduct.productId.toString() === id.toString()
          )
          .map((cartProduct) => cartProduct.size);
      }

      let isProductInCart = false;
      if (cart) {
        isProductInCart = cart.products.some(
          (item) => item.productId.toString() === id
        );
      }
      res.render("productDetails", {
        product: product,
        isLoggedIn,
        size,
        count,
        isProductInCart,
        isOutOfStock: product.stock === 0,
        breadcrumbs,
        existingSizesInCart,
        bestOfferPrice,
        bestOffer
      });
    }
  } catch (error) {
    next(error)
  }
};
const forgetLoad = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    res.render("forget", { isLoggedIn: isLoggedIn, count: 0 });
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
        res.render("forget", {
          message: "Please verify your emails",
          isLoggedIn: isLoggedIn,
          count: 0,
        });
      } else {
        const randomString = randonString.generate();
        const updatedData = await User.updateOne(
          { email: email },
          { $set: { token: randomString } }
        );
        resetPasswordMail(userData.name, userData.email, randomString);
        res.render("forget", {
          message: "Please check your mail to Reset password",
          isLoggedIn: isLoggedIn,
          count: 0,
        });
      }
    } else {
      res.render("forget", {
        message: "Email Incorrect",
        isLoggedIn: isLoggedIn,
      });
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
const forgetPasswordLoad = async (req, res) => {
  try {
    const isLoggedIn = req.session.user;
    const token = req.query.token;
    console.log("token", token);
    const tokenData = await User.findOne({ token: token });
    console.log("user :", tokenData._id);
    if (tokenData) {
      res.render("forget-password", {
        user_id: tokenData._id,
        isLoggedIn: isLoggedIn,
        count: 0,
      });
    } else {
      console.log("error on your token");
      res.status(500, { success: false, message: "some error happens" });
    }
  } catch (error) {
    console.error("error on forgetpassword");
    res.status(500, { success: false, message: "Internal server error" });
  }
};
const resetPassword = async (req, res,next) => {
  try {
    const password = req.body.password;
    const user_id = req.body.user_id;
    console.log("user:", user_id);
    const sPassword = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate(
      { _id: user_id },
      { $set: { password: sPassword, token: "" } }
    );
    res.redirect("login");
  } catch (error) {
    next(error);
  }
};


const userDetails = async (req, res , next ) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      const errorMessage= 'Please Login';
      return res.status(404).render('404',{url: req.originalUrl, 
        message: errorMessage,
        isLoggedIn,count:0})
    }
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
    ];
    const id = isLoggedIn._id;
    const wallet = await Wallet.findOne({userId:id});
    let amount  =0;
    if(wallet){
      amount = wallet.amount
    }
    console.log(id, "userDetailes");
    const userData = await User.findById(id);
    const wishlistItems = await Wishlist.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: "$products._id",
          productId: "$products.productId",
          image: "$productDetails.image",
          name: "$productDetails.name",
          description: "$productDetails.description",
          price: "$productDetails.price",
        },
      },
    ]);
    console.log(wishlistItems);
    if (userData) {
      res.render("userDetails", {
        isLoggedIn: isLoggedIn,
        count: count,
        error: [],
        breadcrumbs,
        wishlistItems,
        amount
      });
    } else {
      res.status(400).send("some error happend");
    }
  } catch (error) {
    next(error)
  }
};
const editProfileLoad = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      const errorMessage = "Please login"
      res.status(404).render('404',{url: req.originalUrl, 
        message: errorMessage,
        isLoggedIn,count:0});
    }
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "EditProfile", url: "/editProfile" },
    ];
    const id = req.query.id;
    const userData = await User.findById({ _id: id });
    if (userData) {
      res.render("editProfile", {
        isLoggedIn: isLoggedIn,
        user: userData,
        count: count,
        errors: "",
        breadcrumbs,
        message: "",
      });
    } else {
      res.redirect("/userDetails");
    }
  } catch (error) {
    next(error)
  }
};
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const { id, name, username, email, mobile } = req.body;
    const isLoggedIn = req.session.user || req.user;
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "EditProfile", url: "/editProfile" },
    ];
    if (!errors.isEmpty()) {
      res.render("editProfile", {
        errors: errors.mapped(),
        isLoggedIn: isLoggedIn,
        user: { _id: id, name, username, email, mobile },
        count: count,
        breadcrumbs,
      });
    }
    const userDataUpdated = { name, username, email, mobile };
    const updatedUser = await User.findByIdAndUpdate(id, userDataUpdated, {
      new: true,
    });

    req.session.user = updatedUser;
    res.redirect(`/userDetails?id=${id}`);
  } catch (error) {
    
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      res.render("editProfile", {
        message: "This was a dublicate",
        errors: "some error",
        isLoggedIn: isLoggedIn,
        user: { _id: id, name, username, email, mobile },
        count: count,
        breadcrumbs,
      });
    }
    next(error)
  }
};

const addresspageLoad = async (req, res , next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:'Please Login'})
    }
    const id = isLoggedIn._id;
    const address = await Address.find({ user: id });
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "Address", url: "/showAddress" },
    ];

    res.render("showAddress", {
      isLoggedIn: isLoggedIn,
      count: count,
      user: address || [],
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};
const addAddressLoad = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:'Please Login'});
    }
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "Address", url: "/showAddress" },
      { name: "AddAddress", url: "/addAddress" },
    ];

    res.render("addAddress", {
      isLoggedIn: isLoggedIn,
      count: count,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};
const addAddress = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:'Please Login'})
    }
    let address = new Address({
      user: isLoggedIn._id,
      fullname: req.body.fullname,
      mobile: req.body.mobile,
      pincode: req.body.pincode,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
    });

    address = await address.save();
    res.redirect(`/showAddress?${isLoggedIn._id}`);
  } catch (error) {
    next(error);
  }
};
const editAddress = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if(!isLoggedIn){
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:'Please Login'})
    }
    const id = req.query.id;
    const address = await Address.findById({ _id: id });
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "Address", url: "/showAddress" },
      { name: "EditAddress", url: "/editAddress" },
    ];
    console.log("address", address);
    res.render("editAddress", {
      isLoggedIn: isLoggedIn,
      user: address,
      count: count,
      breadcrumbs,
    });
  } catch (error) {
    next(error)
  }
};
const updateAddress = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if(!isLoggedIn){
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:'Please Login'})
    }
    const id = req.query.id;
    const editData = await Address.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          user: isLoggedIn._id,
          fullname: req.body.fullname,
          mobile: req.body.mobile,
          pincode: req.body.pincode,
          street: req.body.street,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
        },
      }
    );
    req.session.user = await User.findById(isLoggedIn._id);
    res.redirect("/showAddress");
  } catch (error) {
    next(error);
  }
};
const deleteAddress = async (req, res,next) => {
  try {
    const id = req.query.id;
    if (!id) {
      {
        return res.status(400).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"adderess add not get"});
      }
    }
    await Address.deleteOne({ _id: id });
    res.redirect("/showAddress");
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const userId = req.session.user || req.user;
    const isLoggedIn = userId;
    if(!isLoggedIn){
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"})
    }
    const userCart = await Cart.findOne({ userId: userId });
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "cart", url: "/cart" },
    ];
    console.log(userCart);
    if (!userCart) {
      return res.render("addtocart", {
        isLoggedIn: isLoggedIn,
        productList: [],
        count: 0,
        total: 0,
        breadcrumbs,
      });
    }

    const cartData = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId._id) } },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);

    console.log("Cart Data:", cartData);
    let totalAmount = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId._id) } }, // Match the cart with the given userId
      { $unwind: "$products" }, // Unwind the products array
      {
        $group: {
          _id: "$userId",
          totalAmount: {
            $sum: {
              $multiply: [
                { $toDouble: "$products.price" },
                "$products.quantity",
              ],
            },
          },
        },
      },
    ]);
    console.log(totalAmount[0].totalAmount, "total amount");
    let total = totalAmount[0].totalAmount;

    if (cartData.length === 0) {
      return res.render("addtocart", {
        isLoggedIn: isLoggedIn,
        productList: [],
        count: 0,
        total: 0,
        breadcrumbs,
      });
    } else {
      let productList = cartData[0].products.map((item) => {
        const product = cartData[0].productDetails.find(
          (product) => product._id.toString() === item.productId.toString()
        );
        const sizeObject = product.size.find(
          (sizeObj) => sizeObj.size === item.size
        );
        return {
          _id: item._id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          image: product.image,
          stock: sizeObject ? sizeObject.stock : 0,
          size: item.size,
        };
      });
      console.log(productList, "product list");

      // Calculate total count of products in the cart
      let count = productList.reduce(
        (total, product) => total + product.quantity,
        0
      );

      res.render("addtocart", {
        isLoggedIn: isLoggedIn,
        productList: productList,
        count: count,
        total: total,
        breadcrumbs,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    next(error)
  }
};

const addproducttoCart = async (req, res, next) => {
  try {
    const user = req.session.user || req.user;
    if (!user) {
      console.log("User not found in the session");
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    }
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      console.log("Product not found");
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Product not found"});
    }
    const size = req.body.size;
    const quantity = parseInt(req.body.quantity, 10);
    console.log(quantity, "product quantity");

    if (isNaN(quantity) || quantity <= 0) {
      console.log("invalide quantity");
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Invalid quantity"});
    }

    const id = user._id;

    const category = await Category.findById(product.category);
    let categoryOffer = null;
    if (category && category.offer) {
      categoryOffer = {
        offer: category.offer,
        offerStart: category.offerStart,
        offerEnd: category.offerEnd
      };
    }

    let productOffer = null;
    if (product.offer) {
      productOffer = {
        offer: product.offer,
        offerStart: product.offerStart,
        offerEnd: product.offerEnd
      };
    }

    let bestOffer = null;
    let bestOfferPrice = product.price;
    if (categoryOffer && productOffer) {
      let categoryOfferPrice = product.price - (product.price * category.offer) / 100;
      let productOfferPrice = product.price - (product.price * product.offer) / 100;
      if (categoryOfferPrice < productOfferPrice) {
        bestOffer = categoryOffer;
        bestOfferPrice = categoryOfferPrice;
      } else {
        bestOffer = productOffer;
        bestOfferPrice = productOfferPrice;
      }
    } else if (categoryOffer) {
      bestOffer = categoryOffer;
      bestOfferPrice = product.price - (product.price * category.offer) / 100;
    } else if (productOffer) {
      bestOffer = productOffer;
      bestOfferPrice = product.price - (product.price * product.offer) / 100;
    }

    const userCart = await Cart.findOne({ userId: id });

    if (userCart) {
      const productIndex = await userCart.products.findIndex(
        (p) => p.productId.toString() === productId.toString()
      );

      if (productIndex > -1) {
        const existingProuduct = userCart.products[productIndex];
        const existingSizeIndex = userCart.products.findIndex(
          (p) =>
            p.productId.toString() === productId.toString() && p.size === size
        );
        if (existingSizeIndex > -1) {
          const existingQuantity = userCart.products[productIndex].quantity;
          const newQuantity = parseInt(req.body.quantity, 10);
          if (isNaN(newQuantity) || newQuantity <= 0) {
            console.log("Invalid quantity");
            return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Invalid quantity"});
          }
          let newqt = existingQuantity + newQuantity;
          console.log(newqt, "new quantity");
          newCart = {
            quantity: newqt,
          };
          await Cart.updateOne(
            {
              userId: id,
              "products.productId": productId,
              "products.size": size,
            },
            { $set: { "products.$.quantity": newqt } }
          );
        } else {
          const newCart = {
            productId: productId,
            quantity: req.body.quantity,
            size: size,
            name: product.name,
            price: bestOfferPrice,
          };

          await Cart.updateOne(
            { userId: id },
            { $push: { products: newCart } }
          );
          console.log("Product with new size added successfully");
        }
      } else {
        const newCart = {
          productId: productId,
          quantity: quantity,
          name: product.name,
          size: size,
          price: bestOfferPrice,
        };
        await Cart.updateOne({ userId: id }, { $push: { products: newCart } });
        console.log("product added sucessfully");
      }
    } else {
      const newCart = new Cart({
        userId: user,
        products: [
          {
            productId: productId,
            quantity: quantity,
            size: size,
            name: product.name,
            price: bestOfferPrice,
          },
        ],
      });
      await newCart.save();
    }
    console.log("product save to cart");
    res.redirect(`/productDetails?id=${productId}`);
  } catch (error) {
    next(error);
  }
};
//Remove product From cart
const removeProduct = async (req, res) => {
  try {
    const productId = req.body.productId;
    const size = req.body.size;
    const userId = req.session.user || req.user;
    if(!userId){
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"})
    }

    const userCart = await Cart.findOne({ userId: userId });

    if (!userCart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Find the index of the product with the same ID and size
    const productIndex = userCart.products.findIndex(
      (product) =>
        product.productId.toString() === productId && product.size === size
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the cart" });
    }

    // Remove the product from the cart array
    userCart.products.splice(productIndex, 1);

    //cart has only one product it will remove the cart
    if (userCart.products.length === 0) {
      await userCart.deleteOne();
      return res
        .status(200)
        .json({
          success: true,
          message: "Product removed from the cart, and cart deleted",
        });
    }

    // Save the updated cart document
    await userCart.save();

    return res
      .status(200)
      .json({ success: true, message: "Product removed from the cart" });
  } catch (error) {
    console.error("Error removing product:", error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while removing the product",
      });
  }
};
const updateQuantity = async (req, res) => {
  try {
    let { cart, product, count, size, stock } = req.body;
    const user = req.session.user || req.user;
    count = parseInt(count);

    const userCart = await Cart.findOne({ userId: user });

    if (userCart && userCart.products) {
      const productInCart = userCart.products.find(
        (p) => p.productId.toString() === product
      );

      if (!productInCart) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found in cart" });
      }

      const productDetails = await Product.findById(product);
      if (!productDetails) {
        return res
          .status(404)
          .json({ success: false, message: "Product details not found" });
      }

      const newQuantity = productInCart.quantity + count;

      if (newQuantity > stock) {
        return res
          .status(400)
          .json({ success: false, message: "Exceeds available stock" });
      }
      productInCart.quantity = newQuantity;
      await userCart.save();
      
      const newTotalPrice = productInCart.quantity * productDetails.price;
      const cartSubtotal = userCart.products.reduce(
        (total, p) => total + p.quantity * p.price,
        0
      );
      const cartTotal = cartSubtotal; // Adjust if there are other costs like shipping or taxes

      return res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        newQuantity,
        newTotalPrice,
        cartSubtotal,
        cartTotal,
      });
    } else {
      return res
        .status(404)
        .json({
          success: false,
          message: "User cart not found or cart has no products",
        });
    }
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while updating the cart",
      });
  }
};

const showOrder = async (req, res,next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  try {
    const isLoggedIn = req.session.user || req.user
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    }
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Orders", url: "/orders" },
    ];

    const userId = isLoggedIn._id;
    console.log(userId, "user");

    const totalOrdersCount = await Order.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $ne: "Cancelled" },
    });

    const orderDetails = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: { $ne: "Cancelled" },
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "AddressOn",
        },
      },
      { $unwind: "$AddressOn" },
      {
        $lookup: {
          from: "payments",
          localField: "payment",
          foreignField: "_id",
          as: "paymentMethod",
        },
      },
      { $unwind: "$paymentMethod" },

      {
        $group: {
          _id: "$_id",
          payment: { $first: "$paymentMethod" },
          totalAmount: { $first: "$totalAmount" },
          DateOrder: { $first: "$DateOrder" },
          products: { $push: "$productDetails" },
          address: { $first: "$AddressOn" },
          status: { $first: "$status" },
        },
      },
      {
        $project: {
          _id: 1,
          payment: 1,
          totalAmount: 1,
          DateOrder: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$DateOrder" },
          },
          products: 1,
          address: 1,
          status: 1,
        },
      },
      { $sort: { DateOrder: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const cart = await Cart.find({ userId: userId });
    let count = 0;
    const orderDetailedList = orderDetails.map((order) => {
      const productList = order.products.map((product) => ({
        productName: product.name,
        price: product.price,
        image: product.image.length > 0 ? product.image[0] : "",
      }));

      const address = order.address || {};
      const payment = order.payment || {};

      return {
        orderId: order._id,
        status: order.status,
        payment: payment.paymentMethod,
        paymentStatus:payment.status,
        totalAmount: order.totalAmount,
        orderDate: order.DateOrder,
        products: productList,
        address: {
          fullname: address.fullname || "",
          pincode: address.pincode || "",
          mobile: address.mobile || "",
          street: address.street || "",
          city: address.city || "",
        },
      };
    });

    const filteredOrderForm = orderDetailedList.filter(
      (order) => order.status !== "Cancelled"
    );

    const totalOrder = totalOrdersCount;
    const totalPages = Math.ceil(totalOrder / limit);
    console.log(filteredOrderForm,'orders list')

    res.render("order", {
      isLoggedIn: isLoggedIn,
      count: count,
      orderForm: filteredOrderForm,
      totalPages: totalPages,
      currentPage: page,
      breadcrumbs,
    });
  } catch (error) {
    console.error("Error:", error);
    next(error)
  }
};
const checkoutLoad = async (req, res ,next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if(!isLoggedIn){
      res.status(404).render('404',{url:originalUrl,message:'Please login',isLoggedIn:false,count:0,})
    }
    console.log(isLoggedIn, "user details");
    const paymentMethods = getEnumValues(Payment.schema, "paymentMethod");
    const id = isLoggedIn._id;
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "cart", url: "/cart" },
      { name: "checkout", url: "/checkout" },
    ];
    const userCart = await Cart.findOne({ userId: id });
    count = countCart(userCart);
    let totalAmount = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$userId",
          totalAmount: {
            $sum: {
              $multiply: [
                { $toDouble: "$products.price" },
                "$products.quantity",
              ],
            },
          },
        },
      },
    ]);
    console.log(totalAmount[0].totalAmount, "total amount");
    let total = totalAmount[0].totalAmount;
    const cartData = await Cart.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);

    let productList = cartData[0].products.map((item) => {
      const productDetail = cartData[0].productDetails.find(
        (product) => product._id.toString() === item.productId.toString()
      );
      const sizeObject = productDetail.size.find(
        (sizeObj) => sizeObj.size === item.size
      );

      return {
        _id: item._id,
        productId: productDetail._id,
        quantity: item.quantity,
        price: item.price,
        name: productDetail.name,
        image: productDetail.image,
        stock: sizeObject.stock,
      };
    });

    console.log(productList, "list");
    const address = await Address.find({
      user: new mongoose.Types.ObjectId(id),
    });

    res.render("checkout", {
      isLoggedIn: isLoggedIn,
      count: count,
      total: total,
      product: productList,
      address: address,
      paymentMethods: paymentMethods,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};
const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, totalAmount, productName,shippingCharge, bonus } = req.body;
    console.log(
      addressId,
      paymentMethod,
      totalAmount,
      productName,
      shippingCharge,bonus,
      "address and payment method"
    );

    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).render('404',{url:originalUrl,message:'Address not valide',isLoggedIn:false,count:0,});
    }
    // Validate user ID from session
    const userId = req.session.user ||req.user;
    if (!mongoose.Types.ObjectId.isValid(userId._id)) {
      throw new Error("Invalid user ID format");
    }

    // Fetch user's cart
    const userCart = await Cart.findOne({ userId: userId });
    if (!userCart || !userCart.products || userCart.products.length === 0) {
      throw new Error("User cart or products are undefined or empty");
    }

    // Prepare product IDs and quantities for the order
    const productIds = userCart.products.map((product) => ({
      productId: product.productId,
      quantity: product.quantity,
      size: product.size,
    }));

    // Save payment details
    const payment = new Payment({
      orderId: null,
      paymentMethod: paymentMethod,
      amount: totalAmount,
      status: "pending",
    });
    await payment.save();

    // Save order details
    const order = new Order({
      userId: userId,
      address: addressId,
      products: productIds,
      payment: payment._id,
      totalAmount: totalAmount,
      shippingCharge:shippingCharge,
      status: "Ordered",
    });
    await order.save();

    // Update payment with order ID
    payment.orderId = order._id;
    await payment.save();
    const codLimit =1000;

    // Handle different payment methods
    if (paymentMethod === "COD") {
      console.log("Payment in COD");
      if(totalAmount>1000){
        return res.status(400).json({ success: false, message: 'COD is not allowed for orders above Rs 1000.' });
      }else{
        res.json({ success: true, message: "Order placed successfully" });
      await Cart.deleteOne({ userId: userId });
      }
      
    } else if (paymentMethod === "Razorpay") {
      const options = {
        amount: totalAmount * 100, 
        currency: "INR",
        receipt: payment._id, 
        notes: {
          productName: productName,
        },
      };
      await Cart.deleteOne({ userId: userId });
      
      // Create Razorpay order
      razorpayInstance.orders.create(options, (err, razorpayOrder) => {
        if (!err) {
          res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            order_id: razorpayOrder.id,
            amount: options.amount / 100,
            key_id: RAZORPAY_ID_KEY,
            product_name: productName,
            contact: address.mobile, 
            name: address.fullname,
            email: address.email,
            db_order_id:order._id
          });
        } else {
          console.error("Error creating Razorpay order:", err);
          res
            .status(400)
            .json({
              success: false,
              message: "Failed to create Razorpay order",
            });
        }
      });
    }else if(paymentMethod === "Wallet"){
      const wallet = await Wallet.findOne({userId:userId});
      if(!wallet){
        res.json({success:false,message:'No Wallet available now'});
      }
      await Cart.deleteOne({ userId: userId });
      const walletBalance = wallet.amount;
      console.log(walletBalance,'walletbalance');
      if(walletBalance >= totalAmount){
        const newBalance = walletBalance - totalAmount;
        console.log(newBalance);
        wallet.amount = newBalance;
        await wallet.save();
        payment.status = 'paid';
        await payment.save();
        return res.json({ success: true, message: 'Payment successful using Wallet' });
      }else{
        return res.json({ success: false, message: 'Insufficient wallet balance' });
      }

    }
     else {
      res
        .status(400)
        .json({ success: false, message: "Invalid payment method selected" });
    }
  } catch (error) {
    console.error("Error placing order:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { reason, orderId } = req.body;
    console.log(reason, orderId, "reason");
    const userid = req.session.user || req.user;
    const order = await Order.findById(orderId);
    console.log(order, "orderlist in cancelling");
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, userId: userid },
      { $set: { orderStatus: reason, status: "Cancelled" } },
      { new: true }
    );

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false });
  }
};

const showOrderDetails = async (req, res,next) => {
  try {
    const orderId = req.query.id;
    const user = req.session.user || req.user;
    const isLoggedIn = await User.findById(user);
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    };
    console.log(orderId,'order Id')
    const order = await getOderDetails(orderId);

    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Orders", url: "/orders" },
      { name: "OrderDetails", url: "/orderDetails" },
    ];

    res.render("orderDetails", {
      isLoggedIn: isLoggedIn,
      count: 0,
      orderList: order,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};
const orderCancelledList = async (req, res,next) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * 5;
  try {
    const isLoggedIn = req.session.user||req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    }

    const userId = isLoggedIn._id;
    
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "OrderCancelled", url: "/cancelledList" },
    ];

    const orderDetails = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: { $eq: "Cancelled" },
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "addresses",
          localField: "address",
          foreignField: "_id",
          as: "AddressOn",
        },
      },
      { $unwind: "$AddressOn" },
      {
        $lookup: {
          from: "payments",
          localField: "payment",
          foreignField: "_id",
          as: "paymentMethod",
        },
      },
      { $unwind: "$paymentMethod" },

      {
        $group: {
          _id: "$_id",
          payment: { $first: "$paymentMethod" },
          totalAmount: { $first: "$totalAmount" },
          DateOrder: { $first: "$DateOrder" },
          products: { $push: "$productDetails" },
          address: { $first: "$AddressOn" },
          status: { $first: "$status" },
        },
      },
      {
        $project: {
          _id: 1,
          payment: 1,
          totalAmount: 1,
          DateOrder: {
            $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$DateOrder" },
          },
          products: 1,
          address: 1,
          status: 1,
        },
      },
      { $sort: { DateOrder: -1 } },
      { $skip: skip },
      { $limit: 5 },
    ]);
    const totalPages = Math.ceil(orderDetails.length / 5);
    const cart = await Cart.find({ userId: userId });
    let count = 0;
    if (orderDetails.length > 0) {
      const orderDetailedList = orderDetails.map((order) => {
        const productList = order.products.map((product) => ({
          productName: product.name,
          price: product.price,
          image: product.image.length > 0 ? product.image[0] : "",
        }));

        const address = order.address || {};
        const payment = order.payment || {};

        return {
          orderId: order._id,
          status: order.status,
          payment: payment.paymentMethod,
          totalAmount: order.totalAmount,
          orderDate: order.DateOrder,
          products: productList,
          address: {
            fullname: address.fullname || "",
            pincode: address.pincode || "",
            mobile: address.mobile || "",
            street: address.street || "",
            city: address.city || "",
          },
        };
      });
      const totalPages = Math.ceil(orderDetails.length / 5);

      res.render("order-cancel", {
        isLoggedIn: isLoggedIn,
        count: count,
        orderForm: orderDetailedList,
        totalPages: totalPages,
        currentPage:page,
        breadcrumbs,
      });
    } else {
      res.render("order-cancel", {
        isLoggedIn: isLoggedIn,
        count: count,
        orderForm: "",
        totalpages: 0,
        currentPage:page,
        breadcrumbs,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    next(error)
  }
};
const orderProductDelete = async (req, res) => {
  console.log("come to the side");
  try {
    const userId = req.session.user || req.user;
    const { productId, orderId, quantity } = req.body;
    console.log(productId, orderId, quantity);
    if(!userId){
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Pleas login]"});
    }

    if (!orderId) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"order not get"});
    }

    if (!productId) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Product not get"});
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"order not get"});
    }

    const productExists = order.products.some(
      (product) => product.productId.toString() === productId
    );
    if (!productExists) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"product not available"});
    }
    const product = await Product.findById(productId);
    const reason = "Product not needed";
    console.log(order.products.length, "products length");

    if (order.products.length === 1) {
      await Order.findOneAndUpdate(
        { _id: orderId },
        { $set: { orderStatus: reason, status: "cancelled" } },
        { new: true }
      );
      order.totalAmount = order.totalAmount - product.price * quantity;
      await order.save();
      return res.json({ message: "Order deleted successfully" });
    } else {
      console.log("Deleting product from the order");
      order.products = order.products.filter(
        (product) => product.productId.toString() !== productId
      );
      order.totalAmount = order.totalAmount - product.price * quantity;
      await order.save();

      return res.json({
        message: "Product deleted from order successfully",
        order,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const allProduct = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;

    let count = 0;
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
    ];
    const products = await Product.find().lean();
    const categories = await Category.find().lean();

    if (!products) {
      return res.status(400).send("Product not available");
    }
    const categoryMap = {};
    categories.forEach(category => {
      categoryMap[category._id] = category;
    });

    // Process products to calculate best offer prices
    const processedProducts = products.map(product => {
      const category = categoryMap[product.category];
      let categoryOffer = null;
      if (category && category.offer) {
        categoryOffer = {
          offer: category.offer,
          offerStart: category.offerStart,
          offerEnd: category.offerEnd
        };
      }

      let productOffer = null;
      if (product.offer) {
        productOffer = {
          offer: product.offer,
          offerStart: product.offerStart,
          offerEnd: product.offerEnd
        };
      }

      let bestOffer = null;
      let bestOfferPrice = product.price;
      if (categoryOffer && productOffer) {
        let categoryOfferPrice = product.price - (product.price * category.offer) / 100;
        let productOfferPrice = product.price - (product.price * product.offer) / 100;
        if (categoryOfferPrice < productOfferPrice) {
          bestOffer = categoryOffer;
          bestOfferPrice = categoryOfferPrice;
        } else {
          bestOffer = productOffer;
          bestOfferPrice = productOfferPrice;
        }
      } else if (categoryOffer) {
        bestOffer = categoryOffer;
        bestOfferPrice = product.price - (product.price * category.offer) / 100;
      } else if (productOffer) {
        bestOffer = productOffer;
        bestOfferPrice = product.price - (product.price * product.offer) / 100;
      }
      return {
        ...product,
        bestOfferPrice,
        bestOffer
      };
    });

    if (!isLoggedIn) {
      res.render("allProducts", {
        isLoggedIn,
        count,
        product:processedProducts,
        breadcrumbs,
        wishlistItems: [],
      });
    }
    const id = isLoggedIn._id;
    console.log(id);
    const wishlistItems = await Wishlist.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: "$products._id",
          productId: "$products.productId",
          image: "$productDetails.image",
          name: "$productDetails.name",
          description: "$productDetails.description",
          price: "$productDetails.price",
        },
      },
    ]);
    console.log(wishlistItems, "wishlist");

    res.render("allProducts", {
      isLoggedIn,
      count,
      product:processedProducts,
      breadcrumbs,
      wishlistItems,
    });
  } catch (error) {
    next(error);
  }
};
const searchProudcts = async (req, res, next) => {
  try {
    const { search, sort, category } = req.query;
    const isLoggedIn = req.session.user || req.user;
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Products", url: "/allProduct" },
      { name: "Search", url: "/searchProduct" },
    ];
    let count = 0;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (category) {
      const categories = await Category.find({
        name: { $in: category.split(",") },
      });
      const categoryIds = categories.map((cat) => cat._id);
      query.category = { $in: categoryIds };
    }
    let sortOption = {};
    switch (sort) {
      case "popularity":
        sortOption = { popularity: -1 };
        break;
      case "price_low_high":
        sortOption = { price: 1 };
        break;
      case "price_high_low":
        sortOption = { price: -1 };
        break;
      case "average_ratings":
        sortOption = { averageRating: -1 };
        break;
      case "featured":
        sortOption = { isFeatured: -1 };
        break;
      case "new_arrivals":
        sortOption = { createdAt: -1 };
        break;
      case "a_to_z":
        sortOption = { name: 1 };
        break;
      case "z_to_a":
        sortOption = { name: -1 };
        break;
      default:
        sortOption = {};
    }

    let products = await Product.find(query).sort(sortOption);
    res.render("searchedProduct", {
      product: products,
      isLoggedIn: isLoggedIn,
      count,
      breadcrumbs,
    });
  } catch (error) {
    next(error)
  }
};
const error = async (req, res) => {
  res.send("error");
};
const authFacebook = (req, res) => {
  const url = `https://www.facebook.com/v13.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=email`;
  res.redirect(url);
};
const facebookCallback = async (req, res) => {
  const { code } = req.query;
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v13.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}&redirect_uri=${REDIRECT_URI}`
    );

    const { access_token } = data;
    const { data: profile } = await axios.get(
      `https://graph.facebook.com/v13.0/me?fields=name,email&access_token=${access_token}`
    );
    res.redirect("/");
  } catch (error) {
    console.error("Error:", error.response.data.error);
    res.redirect("/login");
  }
};
const changePassword = async (req, res) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Pleas login]"});
    }
    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Profile", url: "/userDetails" },
      { name: "ChangePassWord", url: "/changePassword" },
    ];
    res.render("changePassword", {
      isLoggedIn,
      message: "",
      count: 0,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
};
const changingPassword = async (req, res,next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    const userId = isLoggedIn._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.render("changePassword", {
        message: "New passwords do not match",
        isLoggedIn,
        count: 0,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Pleas login]"});
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render("changePassword", {
        message: "Current password is incorrect",
        isLoggedIn,
        count: 0,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.render("changePassword", {
      message: "Password changed successfully",
      isLoggedIn,
      count: 0,
    });
  } catch (error) {
    console.error(error.message);
    next(error)
  }
};
const reviweProduct = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Pleas login]"});
    }
    const orderId = req.params.id;
    if (!orderId) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"order not available"});
    }
    const order = await getOderDetails(orderId);
    res.render("reviweProduct", { isLoggedIn, count: 0, order });
  } catch (error) {
    console.error(error.message);
    next(error)
  }
};
const returnProduct = async (req, res, next) => {
  try {
    const isLoggedIn = req.session.user || req.user;
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    }
    const orderId = req.params.id;
    console.log(orderId, "orderid");
    if (!orderId) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"order not available"});

    }
    const order = await getOderDetails(orderId);
    console.log(order, "isside return");
    res.render("returnProduct", { isLoggedIn, count: 0, order });
  } catch (error) {
    console.error(error.message);
    next(error)
  }
};
const productReturnOrder = async (req, res) => {
  try {
    const userId = req.session.user || req.user;
    const { productId, orderId, quantity } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order not available" });
    }

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product not available" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const productExists = order.products.some(
      (product) => product.productId.toString() === productId
    );
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the order" });
    }

    const product = await Product.findById(productId);
    const reason = "Product not needed";

    let wallet = await Wallet.findOne({ userId: userId });

    if (order.products.length === 1) {
      // If this is the only product in the order
      await Order.findByIdAndUpdate(
        orderId,
        { orderStatus: reason, status: "Return" },
        { new: true }
      );

      for (const item of order.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          const sizeObj = product.size.find((size) => size.size === item.size);
          if (sizeObj) {
            await Product.findOneAndUpdate(
              { _id: item.productId, "size.size": item.size },
              { $inc: { "size.$.stock": item.quantity } }
            );
          }
        }
      }

      if (!wallet) {
        // Create a new wallet if it doesn't exist
        wallet = new Wallet({
          userId: userId,
          amount: product.price * quantity,
        });
      } else {
        // Add to the existing wallet amount
        wallet.amount += product.price * quantity;
      }

      await wallet.save();
      return res.json({ success: true, message: "Order deleted successfully" });
    } else {
      const productObject = order.products.find(
        (obj) => obj.productId.toString() === productId
      );

      if (productObject) {
        productObject.productStatus = "Cancelled";
        await order.save();

        if (product) {
          const sizeObj = product.size.find(
            (size) => size.size === productObject.size
          );
          if (sizeObj) {
            await Product.findOneAndUpdate(
              { _id: productId, "size.size": productObject.size },
              { $inc: { "size.$.stock": productObject.quantity } }
            );
          }
        }

        if (!wallet) {
          wallet = new Wallet({
            userId: userId,
            amount: product.price * quantity,
          });
        } else {
          wallet.amount += product.price * quantity;
        }

        await wallet.save();
        return res.json({
          success: true,
          message: "Product deleted from order successfully",
        });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: "Product not available in the order",
          });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ success: false, message: " server error" });
  }
};
const validateCoupon = async (req, res,next) => {
  try {
    const { couponCode } = req.body;
    console.log(couponCode, "code");
    const coupon = await Coupon.findOne({
      code: { $regex: new RegExp(couponCode, "i") },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found." });
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ error: "Coupon has expired." });
    }

    const discountAmount = coupon.maxDiscount;
    console.log(coupon.maxDiscount, "coupon code");
    res.json({ valid: true, discountAmount });
  } catch (error) {
    console.error(error.message);
    next(error)
  }
};
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.status(404).render('404',{url:originalUrl,isLoggedIn:false,count:0,message:'Please login'})
    }
    if (!productId) {
      return res.status(400).render('404',{url:originalUrl,isLoggedIn:false,count:0,message:'Product not available'});
    }
    const existingWishlist = await Wishlist.findOne({ userId: userId });
    if (existingWishlist) {
      const existingProduct = existingWishlist.products.some(
        (prod) => prod.productId.toString() === productId
      );
      if (!existingProduct) {
        existingWishlist.products.push({ productId: productId });
        await existingWishlist.save();
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: "Product already exists in wishlist.",
          });
      }
    } else {
      const newWishlist = new Wishlist({
        userId: userId,
        products: [{ productId: productId }],
      });
      await newWishlist.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "Product added to wishlist successfully.",
        });
    }
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to add product to wishlist. Please try again later.",
      });
  }
};
const removeFromWishlist = async (req, res , next) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.status(404).render('404',{url:originalUrl,isLoggedIn:false,count:0,message:'Please login'});
    }
    if (!productId) {
      return res.status(404).render('404',{url:originalUrl,isLoggedIn:false,count:0,message:'Product not available'});
    }
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $pull: { products: { productId: productId } } },
      { new: true }
    );

    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Product remove from wishlist successfully.",
      });
  } catch (error) {
    next(error)
  }
};
const reviweToProduct = async (req, res,next) => {
  try {
    const userId = req.session.user || req.user;
    if (!userId) {
      return res.status(400).render('404',{url:originalUrl,isLoggedIn:false,count:0,message:'Please login'});
    }
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }
    const review = new Review({
      productId: productId,
      userId: userId,
      rating: rating,
      comment: comment,
    });
    await review.save();
    res.json({ success: true, message: "Review submitted successfully." });
  } catch (error) {
    next(error)
  }
};
const invoiceDownload = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    // Assuming getOderDetails retrieves the order details
    const order = await getOderDetails(orderId);

    if (!order) {
        return res.status(404).send('Order not found');
    }

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader('Content-disposition', `attachment; filename=invoice_${orderId}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF document to the response stream
    doc.pipe(res);
    doc.fontSize(25).text('TrendSetter', { align: 'center' }); // Your website name
    doc.moveDown();
    // Add content to the PDF
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();

    // Order details section
    doc.fontSize(12);
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Date: ${moment(order.DateOrder).format('MMMM Do YYYY, h:mm:ss a')}`); // Format date as desired

    doc.moveDown();
    doc.text(`Customer Name: ${order.address.fullname}`);
    doc.text(`Customer Email: ${order.address.email}`);

    // Display discount if available
    if (order.discount) {
        doc.text(`Discount: ${order.discount}%`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Items:', { underline: true });

    // List of ordered items
    doc.fontSize(12);
    order.products.forEach(item => {
        doc.text(`- ${item.product.name}: ₹${item.product.price.toFixed(2)} x ${item.quantity}`);
    });

    doc.moveDown();
    doc.fontSize(16).text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, { align: 'right' });

    // Finalize the PDF and end the stream
    doc.end();

} catch (error) {
    next(error);
}
};

const paymentProcess = async(req,res)=>{
  try{
    const { paymentId, success,orderId } = req.body;
    const userId =req.session.user || req.user
    const paymentStatus = success ? 'paid' : 'failed';
    await Payment.findOneAndUpdate({orderId:orderId},{status:paymentStatus});
    console.log('payment status change',success);
    res.json({success:true});
} catch (error) {
    console.error(`Error processing payment: ${error}`);
    res.json({ success: false });
  }
};
const shippingCharges = {
'Kerala' : 40,
'Thamilnadu':70,
'karnadaka':100,
'Default':100
}
const shippingCharge = async (req,res)=>{
  try{
    const {addressId} = req.query;
    console.log(addressId,'add id')
    const address = await Address.findById(addressId);
    if(!address){
      return res.status(404).json({error:'Address not foundd'});
    }
    const state = address.state;
    const shippingCharge = shippingCharges[state] || shippingCharge['Default'];
    res.json ({shippingCharge});
    console.log('pass the shipping charge',shippingCharge)

  }catch(error){
    console.error('Server Error',error.message);
    res.status(500).json({ error: 'Server Error' });
  }
};
const payAgain = async (req,res,next)=>{
  try{
    const orderId = req.params.id;
    console.log(orderId,'orderId')
    const user = req.session.user || req.user;
    const isLoggedIn = await User.findById(user);
    if (!isLoggedIn) {
      return res.status(404).render('404',{url:req.originalUrl,isLoggedIn:false,count:0,message:"Please login"});
    }
    const order = await getOderDetailsList(orderId);
    console.log(order)

    const breadcrumbs = [
      { name: "Home", url: "/" },
      { name: "Orders", url: "/orders" },
      { name: "OrderDetails", url: "/orderDetails" },
    ];

    res.render("payAgain", {
      isLoggedIn: isLoggedIn,
      count: 0,
      order: order,
      breadcrumbs,
    });

  }catch(error){
    console.error(error.message);
    next(error)
  }
};

const tryPaymentAgain = async(req,res)=>{
  try{
    const {orderId} = req.body;
    console.log(orderId,'orderid');
    const order = await getOderDetailsList(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const productName = order.products.map(product => product.product.name).join(', ');
    console.log(productName,'product name');
      const options = {
        amount: order.totalAmount * 100, 
        currency: "INR",
        receipt: order.payment._id, 
        notes: {
          productName: productName,
        },
      };
      // Create Razorpay order
      razorpayInstance.orders.create(options, (err, razorpayOrder) => {
        if (!err) {
          res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            order_id: razorpayOrder.id,
            amount: options.amount / 100,
            key_id: RAZORPAY_ID_KEY,
            product_name: productName,
            contact: order.address.mobile, 
            name: order.address.fullname,
            email: order.address.email,
            db_order_id:order._id
          });
        } else {
          console.error("Error creating Razorpay order:", err);
          res
            .status(400)
            .json({
              success: false,
              message: "Failed to create Razorpay order",
            });
        }
      });
  
  }catch(error){
    console.error("Error in tryPaymentAgain:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
const wishlistDisplay = async(req,res)=>{
  try{
    const user = req.session.user || req.user;
    const wishlistItems = await Wishlist.find({ user }).populate('products.productId').lean();

  const formattedWishlistItems = [];

  for (const item of wishlistItems) {
    const product = item.products.productId; // Access the populated productId
    const category = await Category.findById(product.category).lean();

    let bestOffer = null;
    let bestOfferPrice = product.price;

    // Check for category offer
    if (category && category.offer) {
      const categoryOfferPrice = product.price - (product.price * category.offer) / 100;
      if (categoryOfferPrice < bestOfferPrice) {
        bestOffer = {
          offer: category.offer,
          offerStart: category.offerStart,
          offerEnd: category.offerEnd
        };
        bestOfferPrice = categoryOfferPrice;
      }
    }

    // Check for product-specific offer
    if (product.offer) {
      const productOfferPrice = product.price - (product.price * product.offer) / 100;
      if (productOfferPrice < bestOfferPrice) {
        bestOffer = {
          offer: product.offer,
          offerStart: product.offerStart,
          offerEnd: product.offerEnd
        };
        bestOfferPrice = productOfferPrice;
      }
    }

    const formattedItem = {
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image[0], // Assuming you retrieve the first image URL
        bestOfferPrice,
        bestOffer
      }
    };

    formattedWishlistItems.push(formattedItem);
  }

  }catch(error){
    console.error(error.message);
  }
}
module.exports = {
  registration,
  addUser,
  loginPage,
  loginValidate,
  userLogout,
  loadHome,
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
  addproducttoCart,
  removeProduct,
  updateQuantity,
  showOrder,
  placeOrder,
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
  changingPassword,
  reviweProduct,
  returnProduct,
  productReturnOrder,
  validateCoupon,
  addToWishlist,
  removeFromWishlist,
  reviweToProduct,
  invoiceDownload,
  paymentProcess,
  shippingCharge,
  payAgain,
  tryPaymentAgain,
  wishlistDisplay
};
