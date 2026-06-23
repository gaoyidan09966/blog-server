const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. 磁盘存储引擎配置
const storage = multer.diskStorage({
  // 确定存放的物理路径
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    // 如果物理文件夹不存在，自动异步/同步创建它，确保写入不报错
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  // 独一无二的文件名重命名算法
  filename: (req, file, cb) => {
    // 提取原文件的后缀名（如 .png）
    const ext = path.extname(file.originalname);
    // 算法：当前时间戳 + 随机数 + 原后缀。绝对防止多用户上传同名文件导致覆盖
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  },
});

// 2. 企业级文件类型过滤器（只允许图片）
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  // 校验后缀名和 MimeType 类型
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true); // 是合规图片，放行！
  } else {
    cb(new Error("格式错误：仅允许上传 JPG/PNG/GIF 格式的图片！"), false);
  }
};

// 3. 实例化 Multer 引擎
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 限制文件最大为 2MB
  },
});

module.exports = upload;
