const db = require("../config/db");

// 仪表盘统计数据
exports.getStats = async (req, res) => {
  try {
    const [[articleResult]] = await db.query(
      "SELECT COUNT(*) AS total FROM article",
    );
    const [[commentResult]] = await db.query(
      "SELECT COUNT(*) AS total FROM comment",
    );
    const [[userResult]] = await db.query("SELECT COUNT(*) AS total FROM user");

    // 总访问量：所有文章阅读量之和
    const [[viewResult]] = await db.query(
      "SELECT IFNULL(SUM(view_count), 0) AS total FROM article",
    );

    // 昨日新增文章
    const [[yesterdayArticles]] = await db.query(
      "SELECT COUNT(*) AS total FROM article WHERE DATE(create_time) = CURDATE() - INTERVAL 1 DAY",
    );

    // 昨日新增评论
    const [[yesterdayComments]] = await db.query(
      "SELECT COUNT(*) AS total FROM comment WHERE DATE(create_time) = CURDATE() - INTERVAL 1 DAY",
    );

    // 昨日新增用户
    const [[yesterdayUsers]] = await db.query(
      "SELECT COUNT(*) AS total FROM user WHERE DATE(create_time) = CURDATE() - INTERVAL 1 DAY",
    );

    // 今日新增（用于"较昨日"对比）
    const [[todayArticles]] = await db.query(
      "SELECT COUNT(*) AS total FROM article WHERE DATE(create_time) = CURDATE()",
    );
    const [[todayComments]] = await db.query(
      "SELECT COUNT(*) AS total FROM comment WHERE DATE(create_time) = CURDATE()",
    );
    const [[todayUsers]] = await db.query(
      "SELECT COUNT(*) AS total FROM user WHERE DATE(create_time) = CURDATE()",
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        articles: {
          total: articleResult.total,
          today: todayArticles.total,
          yesterday: yesterdayArticles.total,
        },
        comments: {
          total: commentResult.total,
          today: todayComments.total,
          yesterday: yesterdayComments.total,
        },
        users: {
          total: userResult.total,
          today: todayUsers.total,
          yesterday: yesterdayUsers.total,
        },
        views: { total: viewResult.total },
      },
    });
  } catch (error) {
    console.error("获取统计数据错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 最近7天访问量趋势
exports.getViewTrend = async (req, res) => {
  try {
    const sql = `
      SELECT DATE(create_time) AS date, SUM(view_count) AS views
      FROM article
      WHERE create_time >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(create_time)
      ORDER BY date ASC
    `;
    const [rows] = await db.query(sql);

    // 补全7天数据
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const found = rows.find((r) => {
        const rDate = new Date(r.date).toISOString().split("T")[0];
        return rDate === dateStr;
      });
      result.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        views: found ? found.views : 0,
      });
    }

    res.json({ code: 200, message: "获取成功", data: result });
  } catch (error) {
    console.error("获取趋势数据错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 文章分类统计
exports.getCategoryStats = async (req, res) => {
  try {
    const sql = `
      SELECT c.name AS category_name, COUNT(a.id) AS count
      FROM category c
      LEFT JOIN article a ON c.id = a.category_id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `;
    const [rows] = await db.query(sql);

    res.json({ code: 200, message: "获取成功", data: rows });
  } catch (error) {
    console.error("获取分类统计错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 最新文章（前6条）
exports.getLatestArticles = async (req, res) => {
  try {
    const sql = `
      SELECT a.id, a.title, a.status, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      ORDER BY a.create_time DESC
      LIMIT 6
    `;
    const [articles] = await db.query(sql);

    res.json({ code: 200, message: "获取成功", data: articles });
  } catch (error) {
    console.error("获取最新文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 最新评论（前6条）
exports.getLatestComments = async (req, res) => {
  try {
    const sql = `
      SELECT c.id, c.content, c.create_time,
             u.nickname AS user_name,
             a.title AS article_title
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN article a ON c.article_id = a.id
      ORDER BY c.create_time DESC
      LIMIT 6
    `;
    const [comments] = await db.query(sql);

    res.json({ code: 200, message: "获取成功", data: comments });
  } catch (error) {
    console.error("获取最新评论错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
