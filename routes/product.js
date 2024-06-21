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
productRouts.get("/", controllProduct.showProduct);
productRouts.get("/addProduct", controllProduct.newProduct);
productRouts.post("/addProduct",handleFileUploads, controllProduct.addProduct);
productRouts.get("/edit-product", controllProduct.editProduct);
productRouts.post("/edit-product",handleFileUploads,controllProduct.updateProduct);
productRouts.get('/showImages',controllProduct.showImages);
productRouts.post('/showImages/:productId/:index', controllProduct.deleteImage);
productRouts.get("/delete-product", controllProduct.deleteProduct);
productRouts.put('/rating',controllProduct.rating);
productRouts.get("/softdeleteProduct", controllProduct.softDeleteProduct);
productRouts.get("/removesoftDeleteP", controllProduct.removeSoftDeletePro);
module.exports = productRouts;
