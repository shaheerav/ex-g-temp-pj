
const express = require("express");
const adminRouts = express();
const session = require("express-session");

adminRouts.use(session({
    secret:'brrbrr',
    resave:true,
    saveUninitialized:true
}));

adminRouts.set('view engine','ejs');
adminRouts.set('views','./views/admin')

const bodyParser = require("body-parser");
adminRouts.use(bodyParser.json());
adminRouts.use(bodyParser.urlencoded({extended:true}));


const controllAdmin = require('../controller/adminController');
const authAdmin = require('../middleware/adminAuth');

adminRouts.get('/',authAdmin.isLogout,controllAdmin.adminPage);
adminRouts.post('/',controllAdmin.adminVerify);

adminRouts.get('/home',authAdmin.isLogin,controllAdmin.adminhome);
adminRouts.get('/forget',authAdmin.isLogout,controllAdmin.forget);
adminRouts.post('forget',controllAdmin.forgetverify);
adminRouts.get ('/forget-password',controllAdmin.forgetPasswordLoad);
adminRouts.post('/forget-password',controllAdmin.resetPassword)
adminRouts.get('/adlogout',authAdmin.isLogin,controllAdmin.logout);
adminRouts.get('/userdata',authAdmin.isLogin,controllAdmin.userManagement);
adminRouts.get('/edit-user',authAdmin.isLogin,controllAdmin.edituser);
adminRouts.post('/edit-user',controllAdmin.updateUser);
adminRouts.get('/delete-user',controllAdmin.deleteUser);
adminRouts.get('/block-user', authAdmin.isLogin,controllAdmin.blockUser);
adminRouts.get('/unblock-user',authAdmin.isLogin,controllAdmin.unblockUser);
adminRouts.get('/orderList',authAdmin.isLogin,controllAdmin.orderList);
adminRouts.post('/updateOrderStatus',controllAdmin.updateOrderStatus)


module.exports = adminRouts;