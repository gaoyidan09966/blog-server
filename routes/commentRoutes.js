const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 公开接口
router.get("/latest", commentController.getLatestComments);

// 需要登录
router.post("/", authMiddleware, commentController.createComment);
router.get("/:articleId", commentController.getCommentsByArticle);

// 管理员接口
router.get(
  "/admin/list",
  authMiddleware,
  adminMiddleware,
  commentController.getCommentList,
);
router.get(
  "/admin/detail/:id",
  authMiddleware,
  adminMiddleware,
  commentController.getCommentById,
);
router.delete(
  "/admin/:id",
  authMiddleware,
  adminMiddleware,
  commentController.adminDeleteComment,
);

module.exports = router;
