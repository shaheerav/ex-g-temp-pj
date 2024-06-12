const Product = require('../models/products');
const multer = require('multer');
const Category = require('../models/category');
const User = require('../models/userModel');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const { default: mongoose } = require('mongoose');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      const fileName = file.originalname.split(' ').join('-');
      cb(null, fileName + '-' + Date.now);
    }
  })
  
  const uploadOptions = multer({ storage: storage })

const showProduct = async (req,res)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try{
        console.log('shows the product');
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
}
const addProduct = async (req, res) => {
    try {
        const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const inputSize = req.body.size;

        const category = await Category.find();

        if (!validSizes.includes(inputSize)) {
            return res.render('addProduct', {
                message: `Invalid size: ${inputSize}`,
                category: category,
                validSizes: validSizes,
            });
        }

        const outputPath = path.join(__dirname, "../public/croppedImages");
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }
        const arrayOfImages = [];
        if (req.files && req.files['image']) {
            for (let i = 0; i < req.files['image'].length; i++) {
                let imageName = req.files['image'][i].filename;
                // Perform image cropping here using sharp
                await sharp(req.files['image'][i].path)
                    .resize(200, 250) // Adjust the width and height as needed
                    .toFile(path.join(outputPath, imageName));
                arrayOfImages.push(imageName);
            }
        }

        let product = new Product({
            name: req.body.name,
            brand: req.body.brand,
            description: req.body.description,
            category: req.body.category,
            size: inputSize,
            price: parseFloat(req.body.price),
            stock: parseInt(req.body.stock),
            image: arrayOfImages,
            imagecr: req.body.imagecr,
        });

        product = await product.save();
        console.log(product,'products');
        if (!product) {
            return res.render('addProduct', {
                message: 'Not able to add product',
                category,
                validSizes,
            });
        }
        res.redirect('/product');

    } catch (error) {
        console.error('Error adding product:', error);
        const user = await User.findById(req.session.User_id);
        res.status(500).send({ success: false, msg: 'Internal Server Error' });
        if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
            // Duplicate key error
            res.render('category-add', { admin: user, message: 'Please check your added entries' });
        } else {
            // Other error
            console.log(error.message);
            res.render('category-add', { admin: user, message: 'An error occurred while adding the product.' });
        }
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
            res.render('edit-product',{product:product,admin:user,category,validSizes:validSizes});
        }else{
            res.redirect('/product');
        }

    }catch(error){
        console.log(error.message);
        
    }
};
const updateProduct = async (req,res)=>{
    try{
        const user = await User.findById(req.session.User_id);
        const category = await Category.find();

        const outputPath = path.join(__dirname, "../public/croppedImages");
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
          }


            const arrayOfImages = [];
          if(req.files && req.files['image']){
            for (let i = 0; i < req.files['image'].length; i++) {
                let imageName = req.files['image'][i].filename;
                // Perform image cropping here using sharp
                await sharp(req.files['image'][i].path)
                  .resize(200, 250) // Adjust the width and height as needed
                  .toFile(path.join(outputPath, imageName));
                arrayOfImages.push(imageName);
                }
          }
            
          
          let imagecrPath = '';
        if (req.files && req.files['imagecr'] && req.files['imagecr'][0]) {
            const imagecrFile = req.files['imagecr'][0];
            const imagecrName = imagecrFile.filename;
            imagecrPath = path.join(outputPath, imagecrName);
            await sharp(imagecrFile.path)
                .resize(200, 250) // Adjust the width and height as needed
                .toFile(imagecrPath);
        }

        const productId = req.body.id;
          if(!productId){
            return res.status(400).send('Product ID is required');
          }

          const categoryObjectId = new mongoose.Types.ObjectId(req.body.category);
          const existingProduct = await Product.findById(productId);
          if(!existingProduct){
            return res.status(404).send('Product not found');
          }
          const updatedImages = existingProduct.image ? existingProduct.image.concat(arrayOfImages) : arrayOfImages;
        
        const updateProduct = await Product.findByIdAndUpdate(productId,{
            $set:{
            name:req.body.name,
            brand:req.body.brand,
            description:req.body.description,
            category:categoryObjectId,
            size:req.body.size,
            price:req.body.price,
            stock:req.body.stock,
            image:updatedImages,
            imagecr:imagecrPath
        },
    },
    {new:true}
);
if(!updateProduct){
    return res.status(404).send('Product not found');
}
        res.redirect('/product');

    }catch(error){
        console.log(error.message);
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
        await Product.updateOne({_id:id},{$et:{softDelete:true}});
        res.redirect('/product');

    }catch(error){
        console.log(error.message);
    }
};
const removeSoftDeletePro = async(req,res)=>{
    try{
        const id = req.query.id;
        await Product.updateOne({_id:id},{$et:{softDelete:false}});
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

}}

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
    rating
}