const express = require("express");
const cartRouts = express();
const session = require("express-session");
cartRouts.use(session({
    secret:'brrbrr',
    resave:true,
    saveUninitialized:true
}));

cartRouts.set('view engine','ejs');
cartRouts.set('views','./views/cart')
const bodyParser = require("body-parser");
cartRouts.use(bodyParser.json());
cartRouts.use(bodyParser.urlencoded({extended:true}));
const controllCart = require('../controller/cartCondroller');
const auth = require('../middleware/userAuth');

cartRouts.get('/',controllCart.addToCart);

module.exports = cartRouts;