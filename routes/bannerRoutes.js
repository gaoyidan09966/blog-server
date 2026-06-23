const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/bannerController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 公开接口
router.get("/active", bannerController.getActiveBanners);

// 管理员接口
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  bannerController.getAllBanners,
);
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  bannerController.getBannerById,
);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  bannerController.createBanner,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  bannerController.updateBanner,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  bannerController.deleteBanner,
);

module.exports = router;
