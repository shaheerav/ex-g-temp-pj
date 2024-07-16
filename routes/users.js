const express = require("express");
const userRouts = express();
const session = require("express-session");
const passport = require('passport');
require('../passport');
const axios = require("axios");
userRouts.use(passport.initialize());
userRouts.use(passport.session());

userRouts.use(session({
    secret:'brrbrr',
    resave:false,
    saveUninitialized:false
}));


userRouts.set('view engine','ejs');
userRouts.set('views','./views/users')

const bodyParser = require("body-parser");
userRouts.use(bodyParser.json());
userRouts.use(bodyParser.urlencoded({extended:true}));
const {profileValidate } = require('../middleware/validate-profile');

const controller = require('../controller/userController');
const auth = require('../middleware/userAuth');
const { token } = require("morgan");

userRouts.get('/',controller.homepage)
userRouts.get('/users',auth.isLogout,controller.registration);
userRouts.post('/users',controller.addUser);
userRouts.get('/verifyOtp',controller.loadOtpPage);
userRouts.post('/resendOtp',controller.resendOtp);
userRouts.post('/verifyOtp',controller.verificationOTP);
userRouts.get('/termsofuse',controller.termsofuse);
userRouts.get('/privacypolicy',controller.privacypolicy);
userRouts.get('/auth/facebook', controller.authFacebook);
userRouts.get('/auth/facebook/callback',controller.facebookCallback);
userRouts.get('/auth/google',passport.authenticate('google',{scope:['email','profile']}));
userRouts.get('/auth/google/callback',passport.authenticate('google',{successRedirect:'/',failureRedirect:'/failure'}));
userRouts.get('/failure',controller.error)
userRouts.get('/forget',auth.isLogout,controller.forgetLoad);
userRouts.post('/forget',controller.forgetVerify);
userRouts.get('/forget-password',auth.isLogout,controller.forgetPasswordLoad);
userRouts.post('/forget-password',controller.resetPassword);
userRouts.get('/success',controller.successGoogleLogin)
userRouts.get('/verify',controller.verifyMail);
userRouts.get('/login',auth.isLogout,controller.loginPage);
userRouts.post('/login',controller.loginValidate);
userRouts.get('/logout',controller.userLogout);
userRouts.get('/productDetails',auth.isLogin,controller.productDetails);
userRouts.get('/men',controller.menCategory);
userRouts.get('/women',controller.womenCategory);
userRouts.get('/kids',controller.kidsCategory);
userRouts.get('/footwear',controller.footwearCategory);
userRouts.get('/userDetails',auth.isLogin,controller.userDetails);
userRouts.get('/editProfile',auth.isLogin,controller.editProfileLoad);
userRouts.post('/editProfile',profileValidate,auth.isLogout,controller.updateProfile);
userRouts.get('/showAddress',auth.isLogout,controller.addresspageLoad);
userRouts.get('/addAddress',auth.isLogout,controller.addAddressLoad);
userRouts.post('/addAddress',auth.isLogout,controller.addAddress);
userRouts.get('/editAddress',auth.isLogout,controller.editAddress);
userRouts.post('/editAddress',auth.isLogout,controller.updateAddress);
userRouts.get('/changePassword',auth.isLogout,controller.changePassword);
userRouts.post('/changePassword',auth.isLogout,controller.changingPassword);
userRouts.get('/deleteAddress',auth.isLogout,controller.deleteAddress);
userRouts.get('/cart',auth.isLogin,controller.addToCart);
userRouts.post('/add-to-cart/:id',auth.isLogout,controller.addproducttoCart);
userRouts.get('/checkout',auth.isLogin,controller.checkoutLoad);
userRouts.post('/checkout',auth.isLogout,controller.placeOrder)
userRouts.post('/cart/delete',auth.isLogout,controller.removeProduct);
userRouts.post('/cart/updateQuantity',auth.isLogout,controller.updateQuantity);
userRouts.get('/orders',auth.isLogin,controller.showOrder);
userRouts.get('/search',controller.searchProduct);
userRouts.post('/cancelOrder',auth.isLogout,controller.cancelOrder);
userRouts.get('/orderDetails',auth.isLogout,controller.showOrderDetails);
userRouts.get('/cancelledList',auth.isLogout,controller.orderCancelledList);
userRouts.post('/order-product/delete',auth.isLogout,controller.orderProductDelete);
userRouts.get('/allProduct',controller.allProduct);
userRouts.get('/searchProduct',controller.searchProudcts);
userRouts.post('/reviews/:id',controller.addReview);
module.exports = userRouts;
