const db = require("../config/db");

// 获取归档列表（按年月分组）
exports.getArchives = async (req, res) => {
  try {
    // 只查最简单的字段，不用任何SQL函数
    const [articles] = await db.query(
      "SELECT id, title, create_time FROM article WHERE status = 1 ORDER BY create_time DESC",
    );

    // 用 JavaScript 在内存中按年月分组
    const grouped = {};
    articles.forEach((article) => {
      const date = new Date(article.create_time);
      const ym =
        date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      if (!grouped[ym]) {
        grouped[ym] = [];
      }
      grouped[ym].push({
        id: article.id,
        title: article.title,
        create_time: article.create_time,
      });
    });

    // 转为数组格式
    const archives = Object.keys(grouped).map((ym) => ({
      year_month: ym,
      count: grouped[ym].length,
      articles: grouped[ym],
    }));

    res.json({
      code: 200,
      message: "获取归档成功",
      data: {
        total: articles.length,
        archives: archives,
      },
    });
  } catch (error) {
    console.error("获取归档错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
