const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 公开接口
router.post("/send", chatController.sendMessage);
router.get("/hot-questions", chatController.getHotQuestions);
router.get("/my-replies", chatController.getMyReplies);
router.get("/status", chatController.getServiceStatus);

// 管理员接口
router.get("/", authMiddleware, adminMiddleware, chatController.getAllMessages);
router.get(
  "/unread",
  authMiddleware,
  adminMiddleware,
  chatController.getUnreadCount,
);
router.post(
  "/:id/reply",
  authMiddleware,
  adminMiddleware,
  chatController.replyMessage,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  chatController.deleteMessage,
);
router.get(
  "/status-admin",
  authMiddleware,
  adminMiddleware,
  chatController.getServiceStatusAdmin,
);
router.post(
  "/toggle-status",
  authMiddleware,
  adminMiddleware,
  chatController.toggleServiceStatus,
);

module.exports = router;
