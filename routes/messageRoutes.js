const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const messageController = require("../controllers/messageController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 图片上传配置
const uploadDir = path.join(__dirname, "../uploads/messages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("只支持 jpg/png/gif/webp 格式"));
  },
});

// 公开接口
router.get("/active", messageController.getActiveMessages);

// 需要登录
router.post("/", authMiddleware, messageController.createMessage);
router.post("/:id/like", authMiddleware, messageController.likeMessage);
router.post("/:id/reply", authMiddleware, messageController.replyMessage);
router.post(
  "/upload",
  authMiddleware,
  upload.single("image"),
  messageController.uploadImage,
);
router.get("/liked", authMiddleware, messageController.getLikedStatus);

// 管理员接口
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  messageController.getAllMessages,
);
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  messageController.getMessageById,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  messageController.updateMessage,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  messageController.deleteMessage,
);

module.exports = router;
