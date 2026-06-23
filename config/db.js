const mysql = require("mysql2");
require("dotenv").config(); // 加载.env文件的配置到 process.env 中

// 创建企业级数据库连接池（Pool）
// 相比单连接，连接池可以复用连接，避免频繁创建/销毁连接带来的性能开销，是高并发的基石
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true, // 当连接池满了，后续请求是否等待
  connectionLimit: 10, // 连接池最大连接数
  queueLimit: 0, // 排队请求无限制
});

// 导出 promise 版本的连接池，以便我们能够使用全新的 async/await 语法
module.exports = pool.promise();
