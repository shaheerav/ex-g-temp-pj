const express = require("express");
const productRouts = express();
const multer = require("multer");
const path = require('path');
productRouts.set("view engine", "ejs");
productRouts.set("views", "./views/product");

const bodyParser = require("body-parser");
productRouts.use(bodyParser.json());
productRouts.use(bodyParser.urlencoded({ extended: true }));
const File_type_map = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './public/uploads'); 
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage }).array('images[]');

const handleFileUploads = (req, res, next) => {
  upload(req, res, function (err) {
      if (err) {
          console.error('Error uploading files:', err);
          return res.status(500).json({ error: 'Failed to upload files' });
      }
      next();
  });
};

const controllProduct = require("../controller/productController");
const authAdmin = require("../middleware/adminAuth");

productRouts.get("/", authAdmin.isLogin, controllProduct.showProduct);
productRouts.get("/addProduct", authAdmin.isLogin,controllProduct.newProduct);
productRouts.post("/addProduct",authAdmin.isLogin,handleFileUploads, controllProduct.addProduct);
productRouts.get("/edit-product",authAdmin.isLogin, controllProduct.editProduct);
productRouts.post("/edit-product",authAdmin.isLogin,handleFileUploads,controllProduct.updateProduct);
productRouts.get('/showImages',authAdmin.isLogin,controllProduct.showImages);
productRouts.post('/showImages/:productId/:index',authAdmin.isLogin, controllProduct.deleteImage);
productRouts.get("/delete-product",authAdmin.isLogin, controllProduct.deleteProduct);
productRouts.put('/rating',authAdmin.isLogin,controllProduct.rating);
productRouts.get("/softdeleteProduct",authAdmin.isLogin, controllProduct.softDeleteProduct);
productRouts.get("/removesoftDeleteP",authAdmin.isLogin, controllProduct.removeSoftDeletePro);
productRouts.get('/offers',authAdmin.isLogin,controllProduct.offerPageLoad);
productRouts.post('/:productId/offer',authAdmin.isLogin,controllProduct.productOffer);
productRouts.get('/offerRemove',authAdmin.isLogin,controllProduct.removeOffer);
productRouts.get('/search',authAdmin.isLogin,controllProduct.searchProduct)
module.exports = productRouts;
