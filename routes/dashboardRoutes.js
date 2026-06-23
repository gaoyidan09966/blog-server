const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 全部需要管理员权限
router.get(
  "/stats",
  authMiddleware,
  adminMiddleware,
  dashboardController.getStats,
);
router.get(
  "/view-trend",
  authMiddleware,
  adminMiddleware,
  dashboardController.getViewTrend,
);
router.get(
  "/category-stats",
  authMiddleware,
  adminMiddleware,
  dashboardController.getCategoryStats,
);
router.get(
  "/latest-articles",
  authMiddleware,
  adminMiddleware,
  dashboardController.getLatestArticles,
);
router.get(
  "/latest-comments",
  authMiddleware,
  adminMiddleware,
  dashboardController.getLatestComments,
);

module.exports = router;
