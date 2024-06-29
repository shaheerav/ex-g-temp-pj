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
userRouts.get('/login',auth.isLogout,controller.loginPage);
userRouts.post('/login',controller.loginValidate);
userRouts.get('/logout',controller.userLogout);
userRouts.get('/productDetails',auth.isLogin,controller.productDetails);
userRouts.get('/userDetails',auth.isLogin,controller.userDetails);
userRouts.get('/editProfile',auth.isLogin,controller.editProfileLoad);
userRouts.post('/editProfile',profileValidate,controller.updateProfile);
userRouts.get('/showAddress',controller.addresspageLoad);
userRouts.get('/addAddress',controller.addAddressLoad);
userRouts.post('/addAddress',controller.addAddress);
userRouts.get('/editAddress',controller.editAddress);
userRouts.post('/editAddress',controller.updateAddress);
userRouts.get('/changePassword',controller.changePassword);
userRouts.post('/changePassword',controller.changingPassword);
userRouts.get('/deleteAddress',controller.deleteAddress);
userRouts.get('/cart',auth.isLogin,controller.addToCart);
userRouts.post('/add-to-cart/:id',controller.addproducttoCart);
userRouts.get('/checkout',auth.isLogin,controller.checkoutLoad);
userRouts.post('/checkout',controller.placeOrder)
userRouts.post('/cart/delete',controller.removeProduct);
userRouts.post('/cart/updateQuantity',controller.updateQuantity);
userRouts.get('/orders',auth.isLogin,controller.showOrder);
userRouts.post('/cancelOrder',controller.cancelOrder);
userRouts.get('/orderDetails',controller.showOrderDetails);
userRouts.get('/cancelledList',controller.orderCancelledList);
userRouts.post('/order-product/delete',controller.orderProductDelete);
userRouts.get('/allProduct',controller.allProduct);
userRouts.get('/searchProduct',controller.searchProudcts);
userRouts.get('/reviwe:id',controller.reviweProduct);
userRouts.get('/return:id',controller.returnProduct);
userRouts.post('/cancel-product/:id',controller.productReturnOrder);
userRouts.post('/validateCoupon',controller.validateCoupon);
userRouts.post('/addToWishlist',controller.addToWishlist);
userRouts.post('/removeFromWishlist',controller.removeFromWishlist)
module.exports = userRouts;
