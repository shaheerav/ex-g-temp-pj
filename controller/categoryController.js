const Category = require('../models/category');
const User = require('../models/userModel');
const showCategoty = async (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try{
        const user = await User.findById(req.session.User_id); 
        const category = await Category.find().skip(skip).limit(limit);
        const totalproduct = await Category.countDocuments();
        const totalPages = Math.ceil(totalproduct/limit);
        res.render('category',{category:category,admin:user,currentPage: page, totalPages: totalPages});

    }catch(error){
        console.log(error.message);
    }
};
const newCategory = async (req,res)=>{
    try{
        const user = await User.findById(req.session.User_id);
        
        res.render('category-add',{admin:user,message:''});
    }catch(error){
        console.log(error.message);
    }
}
const addCategory = async (req,res)=>{
    
        
        try {
            let category = new Category({
                name: req.body.name,
                description: req.body.description,
            });
    
            category = await category.save();
    
            res.redirect('/category');
        } catch (error) {
            const user = await User.findById(req.session.User_id);
    
            if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
                // Duplicate key error
                res.render('category-add', { admin: user, message: 'Category with this name already exists.' });
            } else {
                // Other error
                console.log(error.message);
                res.render('category-add', { admin: user, message: 'An error occurred while adding the category.' });
            }
        }
}; 

const editCategory = async(req,res)=>{
    try{
        const user = await User.findById(req.session.User_id);
        const id = req.query.id;
        const category = await Category.findById ({_id:id});
        if(category){
            res.render('edit-category',{category:category,admin:user,message:''})
        }else{
            res.redirect('/category');
        }
    }catch(error){
        console.log(error.message);
    }
};
const updateCategory = async (req,res)=>{
    try{
    const id = req.body.id
    console.log(id,'category id');
        const category = await Category.findByIdAndUpdate(id,{$set:{
            name:req.body.name,
            description:req.body.description
        }});
        res.redirect('/category');

    }catch(error){
        const user = await User.findById(req.session.User_id);
        const id = req.body.id;
        const category = await Category.findById(id);
    
            if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
                // Duplicate key error
                res.render('edit-category', { admin: user,category:category, message: 'Category with this name already exists.' });
            } else {
                // Other error
                console.log(error.message);
                res.render('edit-category', { admin: user,category:category, message: 'An error occurred while adding the category.' });
            }
    }
};
const deleteCategory = async (req,res)=>{
    try{
        const id = req.query.id;
        await Category.deleteOne({_id:id});
        res.redirect('/category')

    }catch(error){
        console.log(error.message);
    }
};
const softDeleteCategory = async(req,res)=>{
    try{
        const id= req.query.id;
        await Category.updateOne({_id:id},{$set:{softDelete:true}});
        res.redirect('/category');
    }catch(error){
        console.log(error.message);
    }
};
const removeSoftDeleteCategory = async (req,res)=>{
    try{
        const id = req.query.id;
        await Category.updateOne({_id:id},{$set:{softDelete:false}});
        res.redirect("/category");
    
    }catch(error){
        console.log(error.message);
    }
};
module.exports ={
    showCategoty,
    newCategory,
    addCategory,
    editCategory,
    updateCategory,
    deleteCategory,
    softDeleteCategory,
    removeSoftDeleteCategory
}