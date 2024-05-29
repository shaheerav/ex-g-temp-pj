const { json } = require("body-parser");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/products");
const Address = require('../models/address');
const userRouts = require("../routes/users");


module.exports = {addToCart,
}