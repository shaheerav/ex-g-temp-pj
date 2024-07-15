const category = require('../models/category');
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
        const normalizedName = req.body.name.toLowerCase();
        const user = await User.findById(req.session.User_id);

        const existingCategory = await Category.findOne({ name: normalizedName }).collation({ locale: 'en', strength: 2 });

        if (existingCategory) {
            return res.render('category-add', { admin: user, message: 'Category with this name already exists.' });
        }

        let category = new Category({
            name: normalizedName,
            description: req.body.description,
        });

        category = await category.save();
        res.redirect('/category');
    } catch (error) {
        const user = await User.findById(req.session.User_id);
        console.log(error.message);
        res.render('category-add', { admin: user, message: 'An error occurred while adding the category.' });
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
const offerPage = async(req,res)=>{
    try{
        const categoryid = req.query.id;
        const user = await User.findById(req.session.User_id);
        const category = await Category.findById(categoryid);
        res.render('offer',{admin:user,category});

    }catch(error){
        res.status(500).send('server error');
    }
};
const categoryOffer = async (req,res)=>{
    try{
        const { categoryId } = req.params;
        console.log(categoryId,'id')
        const { offer, offerStart, offerEnd } = req.body;
        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $set: { offer, offerStart, offerEnd } },
            { new: true }
          );
          if (!category) {
            return res.status(404).json({ success: false, message: 'Product not found' });
          }
          
          res.json({ success: true, message: 'Offer added successfully', category });
        } catch (error) {
          console.error('Error updating offer:', error);
          res.status(500).json({ success: false, message:'server error'})
}
};
const removeOffer = async(req,res)=>{
    try{
        const categoryId = req.query.id;
        await Category.findByIdAndUpdate(categoryId,{offer:'',offerStart:'',offerEnd:''});
         
        res.redirect(`/category/offers?id=${categoryId}`)
        

    }catch(error){
        res.status(500).send('server Error');
    }
}
module.exports ={
    showCategoty,
    newCategory,
    addCategory,
    editCategory,
    updateCategory,
    deleteCategory,
    softDeleteCategory,
    removeSoftDeleteCategory,
    offerPage,categoryOffer,
    removeOffer
}