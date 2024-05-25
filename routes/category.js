const express = require("express");
const categoryRouts = express();

categoryRouts.set('view engine','ejs');
categoryRouts.set('views','./views/category')

const bodyParser = require("body-parser");
categoryRouts.use(bodyParser.json());
categoryRouts.use(bodyParser.urlencoded({extended:true}));

const controllCategory = require('../controller/categoryController');


categoryRouts.get('/',controllCategory.showCategoty);
categoryRouts.get('/category-add',controllCategory.newCategory);
categoryRouts.post('/category-add',controllCategory.addCategory);
categoryRouts.get('/edit-category',controllCategory.editCategory);
categoryRouts.post('/edit-category',controllCategory.updateCategory);
categoryRouts.get('/delete-category',controllCategory.deleteCategory);
categoryRouts.get('/softdeleteCategory',controllCategory.softDeleteCategory);
categoryRouts.get('/removeSoftDelete',controllCategory.removeSoftDeleteCategory);

module.exports=categoryRouts;