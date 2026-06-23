const db = require("../config/db");

// 1. 发表评论 / 回复 (受保护接口)
exports.createComment = async (req, res) => {
  const { article_id, parent_id, reply_to_user_id, content } = req.body;
  const user_id = req.user.id; // 从第一阶段写的 authMiddleware 鉴权锁中动态切出当前登录用户ID

  if (!content || !article_id) {
    return res
      .status(400)
      .json({ code: 400, message: "文章ID和评论内容不能为空" });
  }

  try {
    const sql = `
      INSERT INTO comment (article_id, user_id, parent_id, reply_to_user_id, content)
      VALUES (?, ?, ?, ?, ?)
    `;
    // 【异步等待①】：执行磁盘插入
    const [result] = await db.query(sql, [
      article_id,
      user_id,
      parent_id || null,
      reply_to_user_id || null,
      content,
    ]);

    res.status(201).json({
      code: 201,
      message: "评论发表成功",
      data: { commentId: result.insertId },
    });
  } catch (error) {
    console.error("发表评论错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取某篇文章的评论树状列表 (公开接口)
exports.getCommentsByArticle = async (req, res) => {
  const { articleId } = req.params;

  try {
    // 【异步等待②】：多表联查，一次性把评论内容、评论者昵称/头像、被回复者昵称全部拉出来
    const sql = `
      SELECT c.*, 
             u.nickname AS user_name, u.avatar AS user_avatar,
             ru.nickname AS reply_to_user_name
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN user ru ON c.reply_to_user_id = ru.id
      WHERE c.article_id = ?
      ORDER BY c.create_time ASC
    `;
    const [allComments] = await db.query(sql, [articleId]);

    // ==================== 核心算法：将一维数组重组为树状父子结构 ====================
    const commentMap = {};
    const rootComments = [];

    // 1. 先建立扁平映射字典
    allComments.forEach((comment) => {
      comment.replies = []; // 预留子回复数组容器
      commentMap[comment.id] = comment;
    });

    // 2. 扫描归类
    allComments.forEach((comment) => {
      if (comment.parent_id === null) {
        // 是一级评论，直接推入根节点
        rootComments.push(comment);
      } else {
        // 是二级/多级回复，找到它的物理父级评论，塞进父级的 replies 数组里
        const parent = commentMap[comment.parent_id];
        if (parent) {
          parent.replies.push(comment);
        }
      }
    });

    res.json({
      code: 200,
      message: "获取评论成功",
      data: rootComments, // 只返回组装好子孙节点的顶级评论树
    });
  } catch (error) {
    console.error("获取评论树错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取最新评论（公开，首页用）
exports.getLatestComments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const sql = `
      SELECT c.id, c.content, c.create_time,
             u.nickname AS user_name, u.avatar AS user_avatar,
             a.title AS article_title, a.id AS article_id
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN article a ON c.article_id = a.id
      ORDER BY c.create_time DESC
      LIMIT ?
    `;
    const [comments] = await db.query(sql, [limit]);

    res.json({ code: 200, message: "获取成功", data: comments });
  } catch (error) {
    console.error("获取最新评论错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取所有评论列表（管理端，分页 + 筛选）
exports.getCommentList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const articleTitle = req.query.article_title;
    const userName = req.query.user_name;
    const offset = (page - 1) * pageSize;

    let querySql = `
      SELECT c.id, c.content, c.parent_id, c.article_id, c.user_id, c.create_time,
             u.username, u.nickname AS user_name,
             a.title AS article_title
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN article a ON c.article_id = a.id
      WHERE 1 = 1
    `;
    let countSql = `
      SELECT COUNT(*) AS total
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN article a ON c.article_id = a.id
      WHERE 1 = 1
    `;
    let queryParams = [];
    let countParams = [];

    if (articleTitle) {
      querySql += ` AND a.title LIKE ?`;
      countSql += ` AND a.title LIKE ?`;
      queryParams.push(`%${articleTitle}%`);
      countParams.push(`%${articleTitle}%`);
    }

    if (userName) {
      querySql += ` AND (u.username LIKE ? OR u.nickname LIKE ?)`;
      countSql += ` AND (u.username LIKE ? OR u.nickname LIKE ?)`;
      queryParams.push(`%${userName}%`, `%${userName}%`);
      countParams.push(`%${userName}%`, `%${userName}%`);
    }

    querySql += ` ORDER BY c.create_time DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      db.query(countSql, countParams),
      db.query(querySql, queryParams),
    ]);

    const total = countResult[0][0].total;

    const comments = listResult[0].map((item) => ({
      ...item,
      is_reply: item.parent_id !== null && item.parent_id !== 0,
    }));

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: comments,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPage: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("获取评论列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取单条评论详情（管理端）
exports.getCommentById = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT c.id, c.content, c.parent_id, c.article_id, c.user_id, c.create_time,
             u.username, u.nickname AS user_name,
             a.title AS article_title
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN article a ON c.article_id = a.id
      WHERE c.id = ?
    `;
    const [comments] = await db.query(sql, [id]);

    if (comments.length === 0) {
      return res.status(404).json({ code: 404, message: "评论不存在" });
    }

    const comment = comments[0];
    if (comment.parent_id) {
      const [parents] = await db.query(
        "SELECT id, content FROM comment WHERE id = ?",
        [comment.parent_id],
      );
      comment.parent_content =
        parents.length > 0 ? parents[0].content : "已删除";
    }

    res.json({ code: 200, message: "获取成功", data: comment });
  } catch (error) {
    console.error("获取评论详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 删除评论（管理端，含子评论一并删除）
exports.adminDeleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM comment WHERE parent_id = ?", [id]);

    const [result] = await db.query("DELETE FROM comment WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "评论不存在" });
    }

    res.json({ code: 200, message: "评论删除成功" });
  } catch (error) {
    console.error("删除评论错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
