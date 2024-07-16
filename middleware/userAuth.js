
const isLogin = async(req,res,next)=>{
    console.log('Session:', req.session);
    try{
        if(req.session.user_id){
            return next();
        }
        else{
            
            res.redirect('/users');
        }

    }catch(error){
        console.log(error.message);
        res.status(500).send('Internal Sever Error');
    }
}
const isLogout = async(req,res,next)=>{
    try{
        if(req.session.user_id){
            res.redirect('/')
        }else{
            return next();
        }
        
    }catch(error){
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}
module.exports={
    isLogin,isLogout
}