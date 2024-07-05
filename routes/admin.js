const express = require("express");
const adminRouts = express();
const session = require("express-session");

adminRouts.set("view engine", "ejs");
adminRouts.set("views", "./views/admin");

const bodyParser = require("body-parser");
adminRouts.use(bodyParser.json());
adminRouts.use(bodyParser.urlencoded({ extended: true }));

const controllAdmin = require("../controller/adminController");
const authAdmin = require("../middleware/adminAuth");

adminRouts.get("/", authAdmin.isLogout, controllAdmin.adminPage);
adminRouts.post("/", controllAdmin.adminVerify);

adminRouts.get("/home", authAdmin.isLogin, controllAdmin.adminhome);
adminRouts.get("/adlogout", authAdmin.isLogin, controllAdmin.logout);
adminRouts.get("/userdata", authAdmin.isLogin, controllAdmin.userManagement);
adminRouts.get("/edit-user", authAdmin.isLogin, controllAdmin.edituser);
adminRouts.post("/edit-user",authAdmin.isLogin, controllAdmin.updateUser);
adminRouts.get("/delete-user",authAdmin.isLogin, controllAdmin.deleteUser);
adminRouts.get("/block-user", authAdmin.isLogin, controllAdmin.blockUser);
adminRouts.get("/unblock-user", authAdmin.isLogin, controllAdmin.unblockUser);
adminRouts.get("/orderList", authAdmin.isLogin, controllAdmin.orderList);
adminRouts.get("/updatePaymentStatus",authAdmin.isLogin, controllAdmin.updatePaymentStatus);
adminRouts.post("/updateStatus",authAdmin.isLogin, controllAdmin.updateStatus);
adminRouts.get("/orderDetails",authAdmin.isLogin, controllAdmin.orderDetails);
adminRouts.get("/coupon",authAdmin.isLogin, controllAdmin.couponPageLoad);
adminRouts.get("/addCoupon",authAdmin.isLogin, controllAdmin.addCouponPageLoad);
adminRouts.post("/addCoupon",authAdmin.isLogin, controllAdmin.addCoupon);
adminRouts.get("/salesReport",authAdmin.isLogin, controllAdmin.salesReport);
adminRouts.get("/delete-coupon",authAdmin.isLogin, controllAdmin.removeCoupon);
adminRouts.get('/filtered-report',authAdmin.isLogin, controllAdmin.fileredSalesReport)

module.exports = adminRouts;
