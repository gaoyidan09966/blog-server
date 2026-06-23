const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 获取所有标签（公开）
router.get("/", tagController.getAllTags);

// 获取单个标签详情（公开）
router.get("/:id", tagController.getTagById);

// 新增标签（需管理员权限）
router.post("/", authMiddleware, adminMiddleware, tagController.createTag);

// 更新标签（需管理员权限）
router.put("/:id", authMiddleware, adminMiddleware, tagController.updateTag);

// 删除标签（需管理员权限）
router.delete("/:id", authMiddleware, adminMiddleware, tagController.deleteTag);

// 根据标签获取文章（公开）
router.get("/:id/articles", tagController.getArticlesByTag);

module.exports = router;
