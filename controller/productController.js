
const Product = require('../models/products');
const multer = require('multer');
const Category = require('../models/category');
const User = require('../models/userModel');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const { default: mongoose, set } = require('mongoose');

const showProduct = async (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try{
        const product = await Product.find().populate('category').skip(skip).limit(limit);
        const totalproduct = await Product.countDocuments();
        const totalPages = Math.ceil(totalproduct/limit);
        const user = await User.findById(req.session.User_id);
        res.render('product',{product:product,admin:user,currentPage: page, totalPages: totalPages}); 
    }catch(error){
        console.log(error.message);
    }
}; 
const newProduct = async (req,res)=>{
    try{ 
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const category = await Category.find();
        const user = await User.findById(req.session.User_id);
        res.render('addProduct',{category:category,validSizes:validSizes,admin:user,message:''});
    }catch(error){
        console.log(error.message);
    }
};
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Adjust the upload directory as needed
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage }).array('images[]');

// Middleware to handle file uploads and validation
const handleFileUploads = (req, res, next) => {
    upload(req, res, function (err) {
        if (err) {
            console.error('Error uploading files:', err);
            return res.status(500).json({ error: 'Failed to upload files' });
        }
        next();
    });
};
const addProduct =  async (req, res) => {
    try {
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const { name, brand, description, category, price,color } = req.body;
        const user = await User.findById(req.session.User_id);
        const sizes = req.body.size
        const categories = await Category.find();
        //looking the values are array
        if (!Array.isArray(sizes)) {
            return res.render('addProduct', {
              message: 'Sizes must be an array',
              category: categories,
              validSizes,
            });
          }
      
          // Validate sizes
          for (const sizeEntry of sizes) {
            if (!validSizes.includes(sizeEntry.size)) {
              return res.render('addProduct', {
                message: `Invalid size: ${sizeEntry.size}`,
                category: categories,
                validSizes,
              });
            }
          }
      
          const productSizes = sizes.map(sizeEntry => ({
            size: sizeEntry.size,
            stock: parseInt(sizeEntry.stock),
          }));
      
        const imagePaths = req.files.map(file => file.filename);
        console.log('Uploaded image paths:', imagePaths); 
        let images = new Set (imagePaths);
        let finalImage = Array.from(images)
        let product = new Product({
            name,
            brand,
            description,
            category,
            color,
            size: productSizes,
            price: parseFloat(price),
            image: finalImage, 
        });

        product = await product.save();
        console.log('Product saved:', product);

        if (!product) {
            return res.render('addProduct', {
                message: 'Not able to add product',
                category: categories,
                validSizes,
                admin: user
            });
        }

        res.status(200).json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};


const editProduct = async(req,res)=>{
    try{
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const id = req.query.id;
        const product = await Product.findById({_id:id});
        const user = await User.findById(req.session.User_id);
        const category = await Category.find();
        console.log('product in edit page :', product)
        if(product){
            res.render('edit-product',{product:product,admin:user,category,validSizes:validSizes,message:""});
        }else{
            res.redirect('/product');
        }

    }catch(error){
        console.log(error.message);
        
    }
};
const updateProduct = async (req,res)=>{
    try{
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const {id, name, brand, description, category, size, price} = req.body;
        const user = await User.findById(req.session.User_id);
        const categories = await Category.find();
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        let finalImage = product.image;

        if (req.files && req.files.length > 0) {
            const imagePaths = req.files.map(file => file.filename);
            console.log('Uploaded image paths:', imagePaths); 
            finalImage = finalImage.concat(imagePaths); 
        }
         
        const updatedProduct = await Product.findByIdAndUpdate(id, {
            $set: {
                name,
                brand,
                description,
                category,
                price,
                image: finalImage,
            }
        }, { new: true });
        if (size && size.length > 0) {
            updatedProduct.size = []; // Clear existing sizes and update with new ones
            size.forEach((entry) => {
              updatedProduct.size.push({
                size: entry.size,
                stock: entry.stock
              });
            });
          }
      
          await updatedProduct.save();

        console.log(updatedProduct, "updating done");
if(!updateProduct){
    return res.status(404).send('Product not found');
}
res.redirect('/product')

    }catch(error){
        console.error(error.message);
    }
};
const deleteProduct = async(req,res)=>{
    try{
        const id = req.query.id;
        await Product.deleteOne({_id:id});
        res.redirect('/product');
    }catch(error){
        console.error('Error deleting product:', error);
        res.status(500).send('Internal Server Error');
    }
};
const softDeleteProduct = async(req,res)=>{
    try{
        const id = req.query.id;
        await Product.updateOne({_id:id},{$set:{softDelete:true}});
        res.redirect('/product');

    }catch(error){
        console.log(error.message);
    }
};
const removeSoftDeletePro = async(req,res)=>{
    try{
        const id = req.query.id;
        await Product.updateOne({_id:id},{$set:{softDelete:false}});
        res.redirect('/product');

    }catch(error){
        console.log(error.message);
    }
};
const showImages = async (req,res)=>{
    try{
        const user = await User.findById(req.session.User_id); 
        const id = req.query.id;
        const product = await Product.findById({_id:id});
        if(!product){
            return res.status(404).send ('Product not found');
        }
        res.render('showImages',{product,admin:user});
    }catch(error){
        console.error('Image has some problems');
        res.status(500).send('Internet server Error');
    }
};
const deleteImage = async (req, res) => {
    try{
        console.log('code come to deletion code');
        const user = await User.findById(req.session.User_id);
      const productId = req.params.productId;
      const index = parseInt(req.params.index);
  
      const product = await Product.findById(productId);
  
      if (!product || index < 0 || index >= product.image.length) {
        return res.status(404).send('Image not found');
      }
      const deletedImage = product.image[index];
      product.image.splice(index,1);
      await product.save();

      const imagePath = path.join (__dirname,'../public/uploads',deletedImage);
      
      fs.unlink(imagePath,(err)=>{
        if(err){
            console.error('Failed to delete image file:',err);
        }else{
            console.log('Image file deleted successfully');
            res.redirect(`/product/showImages?id=${productId}`)
        }
      });
      
    }catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).send('Internal Server Error');
    }
  };
const rating = async(req,res)=>{
    const { _id } =req.user ;
    const {stars,productId} = req.body;
    try{
        const product = await Product.findById(productId);
    let alreadyRated = product.rating.find(
        (userId)=>userId.postedby.toString()===_id.toString()
    );
    if(alreadyRated){
        const updatedRating = await Product.updateOne(
            {
            ratings:{$elemMatch: alreadyRated},
        },
        {
                $set:{"rating.$.star":star},
            },{
                new:true,
            }
    );
}else{
    const rateProduct = await Product.findByIdAndUpdate(
        productId,{
            $push:{
                rating:{
                    star:star,
                    postedby:_id,
                },
                },
            },{
                new:true,
            }
        );
        }
        const getallratings = await Product.findById(productId);
        let totalRating = getallratings.rating.length;
        let ratingsum = getallratings.rating
        .map((item)=> item.star)
        .reduce((acc,cur)=> acc+cur,0); 
        let actualRating = Math.round(ratingsum/totalRating);
        await Product.findByIdAndUpdate(productId,{totalrating:actualRating},{
            new:true
        });
        res.json(finalproduct)

}catch{
    throw new Error(error);

}};
const offerPageLoad = async (req,res)=>{
    try{
        const productId = req.query.id;
        console.log(productId);
        const user = await User.findById(req.session.User_id);
        const product = await Product.findById(productId);

        const offer = product.offer;
        console.log(product)
        
        
        res.render('offer',{admin:user,product})


    }catch(error){
        res.status(500).send('Server error',error.message);
    }
}
const productOffer = async (req,res)=>{
    try{
        const { productId } = req.params;
        const { offer, offerStart, offerEnd } = req.body;
        const product = await Product.findByIdAndUpdate(
            productId,
            { $set: { offer, offerStart, offerEnd } },
            { new: true }
          );
          if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
          }
          
          res.json({ success: true, message: 'Offer added successfully', product });
        } catch (error) {
          console.error('Error updating offer:', error);
          res.status(500).json({ success: false, message:'server error'})
}
}
const removeOffer = async(req,res)=>{
    try{
        const productId = req.query.id;
        console.log(productId,'id')
        await Product.findByIdAndUpdate(productId,{offer:null,offerStart:null,offerEnd:null});
         
        res.redirect(`/product/offers?id=${productId}`)
        

    }catch(error){
        res.status(500).send('server Error');
    }
};
const searchProduct = async(req,res)=>{
    try{
        const user = await User.findById(req.session.User_id);
        const product = await Product.find();
        res.render('search',{admin:user,product})
    }catch(error){
        console.error('server error',error.message);
        res.status(500).send('Server Error');
    }
}
module.exports = {
    showProduct,
    newProduct,
    addProduct,
    editProduct,
    deleteProduct,
    updateProduct,
    softDeleteProduct,
    removeSoftDeletePro,
    showImages,
    deleteImage,
    rating,
    productOffer,offerPageLoad,
    removeOffer,
    searchProduct
}