const express = require("express");
const router = express.Router();
const noticeController = require("../controllers/noticeController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 公开接口
router.get("/active", noticeController.getActiveNotices);

// 管理员接口
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  noticeController.getAllNotices,
);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  noticeController.createNotice,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  noticeController.updateNotice,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  noticeController.deleteNotice,
);

module.exports = router;
