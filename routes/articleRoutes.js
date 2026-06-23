const express = require("express");
const router = express.Router();

const articleController = require("../controllers/articleController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const upload = require("../middlewares/upload");

// 1. 公开接口：获取文章列表
router.get("/", articleController.getArticleList);
// 搜索文章（公开接口）
router.get("/search", articleController.searchArticles);
// 获取最热文章（公开接口）
router.get("/hot", articleController.getHotArticles);
// 获取最新文章（公开接口）
router.get("/latest", articleController.getLatestArticles);
// 获取推荐文章（公开接口）
router.get("/recommend", articleController.getRecommendArticles);
// 获取文章导航（公开接口）
router.get("/:id/nav", articleController.getArticleNav);

// 2. 图片上传接口
router.post("/upload", authMiddleware, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: "请选择要上传的图片" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    res.json({
      code: 200,
      message: "图片上传成功",
      data: { url: fileUrl },
    });
  } catch (error) {
    console.error("上传接口异常:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
});

// 3. 保护接口
router.post("/", authMiddleware, articleController.createArticle);

// 点赞相关（需登录）
router.post("/:id/like", authMiddleware, articleController.likeArticle);
router.get("/:id/like", authMiddleware, articleController.getLikeStatus);

// 点赞详情（管理员）
router.get(
  "/:id/likes",
  authMiddleware,
  adminMiddleware,
  articleController.getArticleLikes,
);

router.put("/:id", authMiddleware, articleController.updateArticle);
router.delete("/:id", authMiddleware, articleController.deleteArticle);
router.put(
  "/:id/recommend",
  authMiddleware,
  adminMiddleware,
  articleController.toggleRecommend,
);

// 动态路由放最后
router.get("/:id", articleController.getArticleById);

module.exports = router;
