const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 公开接口
router.get("/list", productController.getProductList);
router.get("/categories", productController.getCategories);
router.get("/:id", productController.getProductById);

// 管理员接口
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  productController.getAllProducts,
);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  productController.createProduct,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.updateProduct,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.deleteProduct,
);

module.exports = router;
