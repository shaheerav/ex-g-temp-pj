const express = require("express");
const categoryRouts = express();

categoryRouts.set('view engine','ejs');
categoryRouts.set('views','./views/category')

const bodyParser = require("body-parser");
categoryRouts.use(bodyParser.json());
categoryRouts.use(bodyParser.urlencoded({extended:true}));
const authAdmin = require('../middleware/adminAuth');
const controllCategory = require('../controller/categoryController');


categoryRouts.get('/',authAdmin.isLogin,controllCategory.showCategoty);
categoryRouts.get('/category-add',authAdmin.isLogin,controllCategory.newCategory);
categoryRouts.post('/category-add',authAdmin.isLogin,controllCategory.addCategory);
categoryRouts.get('/edit-category',authAdmin.isLogin,controllCategory.editCategory);
categoryRouts.post('/edit-category',authAdmin.isLogin,controllCategory.updateCategory);
categoryRouts.get('/delete-category',authAdmin.isLogin,controllCategory.deleteCategory);
categoryRouts.get('/softdeleteCategory',authAdmin.isLogin,controllCategory.softDeleteCategory);
categoryRouts.get('/removeSoftDelete',authAdmin.isLogin,controllCategory.removeSoftDeleteCategory);

module.exports=categoryRouts;