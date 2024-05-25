
const isLogin = async(req,res,next)=>{
    try{
        if(req.session.user_id){}
        else{
            res.redirect('/users');
        }
        next();

    }catch(error){
        console.log(error.massage)
    }
}
const isLogout = async(req,res,next)=>{
    try{
        if(req.session.user_id){
            res.redirect('/home')
        }
        next()
    }catch(error){
        console.log(error.massage)
    }
}
module.exports={
    isLogin,isLogout
}