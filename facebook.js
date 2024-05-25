const passportf = require('passport');
const facebookStrategy = require('passport-facebook').Strategy;
const config = require('./config/config');

passportf.serializeUser(function(user,cb){
    cb(null,user);
});
passportf.deserializeUser(function(obj,cb){
    cb(null,obj);
});
passportf.use(new facebookStrategy({
    clientID:config.facebookAuth.clientID,
    clientSecret:config.facebookAuth.clientSecret,
    callbackURL:config.facebookAuth.callbackURL
},
function(accessTocken,refreshToken,profile,done){
    return done(null, profile);
}
));

module.exports= passportf;