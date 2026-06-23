const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 1. 获取分类列表：任何人都可以访问（不需要任何中间件拦截）
router.get("/", categoryController.getAllCategories);

// 2. 获取单个分类详情（公开接口）
router.get("/:id", categoryController.getCategoryById);

// 3. 增、删、改：必须登录（authMiddleware），且必须是管理员（adminMiddleware）
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  categoryController.createCategory,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryController.deleteCategory,
);

module.exports = router;
