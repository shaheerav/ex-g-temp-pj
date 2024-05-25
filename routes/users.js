const express = require("express");
const userRouts = express();
const session = require("express-session");
const passport = require('passport');
require('../passport');
//const passportf = require('../facebook');
const axios = require("axios");
userRouts.use(passport.initialize());
userRouts.use(passport.session());

userRouts.use(session({
    secret:'brrbrr',
    resave:false,
    saveUninitialized:false
}));

const APP_ID = '717767400342064';
const APP_SECRET = 'aa856e5e293e81f0cda49b8c23aed378';
const REDIRECT_URI = 'http://localhost:3000/auth/facebook/callback';

/*const CLIENT_ID = "199894829985-oojhsehpj0ot9ks1efeckrupnhik1dfn.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI_GOOGLE = 'http://localhost:3000/auth/google/callback';
*/

 

userRouts.set('view engine','ejs');
userRouts.set('views','./views/users')

const bodyParser = require("body-parser");
userRouts.use(bodyParser.json());
userRouts.use(bodyParser.urlencoded({extended:true}));

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
/*userRouts.get('/auth/facebook',passportf.authenticate('facebook',{scope:['public_profile','email']}));
userRouts.get('/auth/facebook/callback',
passportf.authenticate('facebook',
{
  failureRedirect:'/login'
}),(req,res)=>{
  res.redirect('/')
})*/

userRouts.get('/auth/facebook', (req, res) => {
  const url = `https://www.facebook.com/v13.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=email`;
  res.redirect(url);
});
userRouts.get('/auth/facebook/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for access token
    const { data } = await axios.get(`https://graph.facebook.com/v13.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}&redirect_uri=${REDIRECT_URI}`);

    const { access_token } = data;

    // Use access_token to fetch user profile
    const { data: profile } = await axios.get(`https://graph.facebook.com/v13.0/me?fields=name,email&access_token=${access_token}`);

    // Code to handle user authentication and retrieval using the profile data

    res.redirect('/');
  } catch (error) {
    console.error('Error:', error.response.data.error);
    res.redirect('/login');
  }
});

userRouts.get('/auth/google',passport.authenticate('google',{scope:
 ['email','profile']
}));
userRouts.get('/auth/google/callback',
passport.authenticate('google',{
  successRedirect:'/',
failureRedirect:'/failure'
})
);
userRouts.get('/failure',((req,res)=>{
  res.send("error")
}))
/*
userRouts.get('/auth/google',(req,res)=>{
  const url = `https://accounts.google.com/o/oauth2/auth?clint_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile%20email&access_type=offline`;
  res.redirect(url);
})
userRouts.get('/auth/google/callback', async (req,res)=>{
  const {code} = req.query;
  try{
    const {data} = await axios.post('https://oauth2.googleapis.com/token',{
      client_id :CLIENT_ID,
      client_secter:CLIENT_SECRET,
      code,
      redirect_uri:REDIRECT_URI_GOOGLE,
      grant_type:'authorization_code',
    });
    const {access_token,id_token} = data;
    const {data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo',{
      headers:{Authorization:`Bearer${access_token}`},
    });
    res.redirect('/')
  }catch(error){
    console.error('Error',error.response.data.error);
    res.redirect('/login');
  }
})*/
userRouts.get('/forget',auth.isLogout,controller.forgetLoad);//forget password
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
userRouts.get('/editProfile',controller.editProfileLoad);
userRouts.post('/editProfile',controller.updateProfile);
userRouts.get('/showAddress',controller.addresspageLoad);
userRouts.get('/addAddress',controller.addAddressLoad);
userRouts.post('/addAddress',controller.addAddress);
userRouts.get('/editAddress',controller.editAddress);
userRouts.post('/editAddress',controller.updateAddress);
userRouts.get('/deleteAddress',controller.deleteAddress);
userRouts.get('/cart',controller.addToCart);
userRouts.post('/cart',controller.addproducttoCart);
userRouts.get('/checkout',auth.isLogin,controller.checkoutLoad);
userRouts.post('/cart/remove',controller.removeProduct);
userRouts.post('/cart/updateQuantity',controller.updateQuantity);
userRouts.get('/orders',controller.showOrder)
module.exports = userRouts;
