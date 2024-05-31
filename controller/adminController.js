const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const randomString = require('randomstring');
const nodemailer = require('nodemailer');

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
const forget = async(req,res)=>{
    try{
        res.render('forget')

    }catch(error){
        console.error('Error forget password:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
const forgetverify = async (req,res)=>{
    try{
        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){
            if(userData.is_admin===0){
                res.render('forget',{message:'Email is incorrect'});
            }else{
                const randomString = randomString.generate();
                const updatedData = await User.updateOne(
                    { email: email },
                    { $set: { token: randomString } }
                  );
                    resetPasswordMail (userData.name,userData.email,randomString);
                    res.render("forget", {
                        message: "Please check your mail to Reset password",
                      });
            }
        }else{
            res.render('forget',{message:'Email is incorrect'});
        }

    }catch(error){
        console.error('error reset password');
        res.status(500).json({success:false,message:'Internal Server Error'});
    }
};
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
      const token = req.query.token;
      console.log('token',token)
      const tokenData = await User.findOne({token:token});
      console.log('user :',tokenData._id);
      if(tokenData){
        res.render('forget-password',{user_id:tokenData._id})
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
  const orderList = async (req,res)=>{
    try{
        const user = await User.findById(req.session.User_id);
        res.render('')
    }catch(error){
        console.error(error.message)
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
    forget,
    forgetverify,
    forgetPasswordLoad,
    resetPassword,orderList
}