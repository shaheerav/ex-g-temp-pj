const express = require("express");
const productRouts = express();
const multer = require("multer");

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
    const isValid = File_type_map[file.mimetype];
    let uploadError = new Error("invalid image type");
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "./public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = File_type_map[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

const controllProduct = require("../controller/productController");
productRouts.get("/", controllProduct.showProduct);
productRouts.get("/addProduct", controllProduct.newProduct);
productRouts.post(
  "/addProduct",
  uploadOptions.fields([{name:'image',maxCount:10},{name:'imagecr',maxCount:1}]),
  async(req,res)=>{
    try{
      await controllProduct.addProduct(req,res);
    }catch(error){
      console.error('Error adding product: ',error);
      res.status(500).send('Internal Server Error');
    }
  }
);
productRouts.get("/edit-product", controllProduct.editProduct);
productRouts.post("/edit-product",
 uploadOptions.fields([{ name: 'image', maxCount: 10 }, { name: 'imagecr', maxCount: 1 }]),
 async (req,res)=>{
  try{
    await controllProduct.updateProduct(req,res);
  }catch(error){
    console.error('Error editing Product ',error);
    res.status(500).send('Internal server Error');
  }
}
);
productRouts.get('/showImages',controllProduct.showImages);
productRouts.post('/showImages/:productId/:index', controllProduct.deleteImage);

productRouts.get("/delete-product", controllProduct.deleteProduct);

productRouts.put('/rating',controllProduct.rating);

productRouts.get("/softdeleteProduct", controllProduct.softDeleteProduct);
productRouts.get("/removesoftDeleteP", controllProduct.removeSoftDeletePro);

module.exports = productRouts;
