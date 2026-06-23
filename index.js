const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const articleRoutes = require("./routes/articleRoutes");
const commentRoutes = require("./routes/commentRoutes");
const tagRoutes = require("./routes/tagRoutes");
const archiveRoutes = require("./routes/archiveRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const chatRoutes = require("./routes/chatRoutes");
const orderRoutes = require("./routes/orderRoutes");

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静态资源托管
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// 路由配置
app.use("/api/user", userRoutes); // 添加用户路由
app.use("/api/category", categoryRoutes); // 添加分类路由
app.use("/api/article", articleRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/tag", tagRoutes);
app.use("/api/archive", archiveRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/product", productRoutes);
app.use("/api/notice", noticeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/order", orderRoutes);
// 测试数据库连接的异步函数
async function checkDatabase() {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("--- 🚀 数据库连接成功！测试查询结果:", rows[0].result);
  } catch (error) {
    console.error("--- ❌ 数据库连接失败，请检查配置！");
    console.error(error.message);
    process.exit(1);
  }
}

// 执行连接测试
checkDatabase();

// 基础根路由
app.get("/", (req, res) => {
  res.json({
    code: 200,
    message: "服务端已启动",
    data: null,
  });
});

// 监听端口
app.listen(PORT, () => {
  console.log(`--- 🌐 服务端已在端口 ${PORT} 成功架设 ---`);
});
