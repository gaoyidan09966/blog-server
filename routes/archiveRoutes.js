const express = require("express");
const router = express.Router();
const archiveController = require("../controllers/archiveController");

// 获取归档列表（公开接口）
router.get("/", archiveController.getArchives);

module.exports = router;
