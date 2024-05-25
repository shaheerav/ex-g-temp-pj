const isLogin = async (req,res,next)=>{
    try{
        console.log('Inside isLogin middleware');
        if(req.session.User_id){
            next();
        }
        else{
            res.redirect('/admin');
        }
        

    }catch(error){
        console.log(error.massage);
    }
}
const isLogout = async (req,res,next)=>{
    try{
        console.log('Inside logout controller');
        if(req.session.User_id){
            res.redirect('/admin/home');
        }
        next();

    }catch(error){
        console.log(error.massage)
    }
}
module.exports = {
    isLogin,
    isLogout
}