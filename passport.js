const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('./models/userModel');
require ('dotenv').config();

passport.serializeUser((user,done)=>{
    done(null,user._id);
})
passport.deserializeUser( async function(id,done){
    try {
        const user = await User.findById(id);
        done(null, user);  // Retrieve user from the database
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/callback",
    passReqToCallback:true

},
/*function (request,accessToken,refreshToken,profile,done){
    userProfile=profile;
    return done (null , profile);
}*/
async (request,accessToken, refreshToken , profile , done)=>{
    try{
        let user = await User.findOne({googleId:profile.id});
        if(!user){
            user = await User.create({
                googleId : profile.id,
                name:profile.displayName,
                email:profile.email[0].value,
                username:profile.email[0].value,
                password:'',
                mobile:'',
                is_admin:'',
                is_verify:true,
                otp_generate:'',
                is_blocked:false,
                otpVerify:true,
                token:''
            });
        }
        request.session.user = user;
        return done (null ,user);
    }catch(err){
        return done (err,null);
    }
}
));


module.exports= passport;