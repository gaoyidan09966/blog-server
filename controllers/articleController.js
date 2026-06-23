const db = require("../config/db");

// 1. 发布文章 (需要登录，支持标签)
exports.createArticle = async (req, res) => {
  const {
    title,
    description,
    content,
    cover,
    category_id,
    status,
    tagIds,
    is_recommend,
  } = req.body;
  const user_id = req.user.id;

  if (!title || !content) {
    return res
      .status(400)
      .json({ code: 400, message: "文章标题和正文不能为空" });
  }

  try {
    const sql = `
      INSERT INTO article (title, description, content, cover, category_id, user_id, status, is_recommend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [
      title,
      description,
      content,
      cover,
      category_id,
      user_id,
      status || 1,
      is_recommend || 0,
    ]);

    if (tagIds && tagIds.length > 0) {
      const articleId = result.insertId;
      const values = tagIds.map((tagId) => [articleId, tagId]);
      await db.query("INSERT INTO article_tag (article_id, tag_id) VALUES ?", [
        values,
      ]);
    }

    res.status(201).json({ code: 201, message: "文章发布成功" });
  } catch (error) {
    console.error("发布文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取文章列表 (公开接口：支持分页、按分类筛选、按标签筛选、含标签)
exports.getArticleList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const categoryId = req.query.category_id;
    const tagId = req.query.tag_id;

    const offset = (page - 1) * pageSize;

    let querySql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.status, a.is_recommend, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar,
             GROUP_CONCAT(DISTINCT t.name) AS tag_names,
             GROUP_CONCAT(DISTINCT t.id) AS tag_ids
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      LEFT JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN tag t ON at2.tag_id = t.id
      WHERE a.status = 1
    `;

    let countSql = `SELECT COUNT(*) AS total FROM article WHERE status = 1`;
    let queryParams = [];
    let countParams = [];

    // 按分类筛选
    if (categoryId) {
      querySql += ` AND a.category_id = ?`;
      countSql += ` AND category_id = ?`;
      queryParams.push(categoryId);
      countParams.push(categoryId);
    }

    // 按标签筛选
    if (tagId) {
      querySql += ` AND EXISTS (
        SELECT 1 FROM article_tag at3 WHERE at3.article_id = a.id AND at3.tag_id = ?
      )`;
      countSql += ` AND EXISTS (
        SELECT 1 FROM article_tag at4 WHERE at4.article_id = article.id AND at4.tag_id = ?
      )`;
      queryParams.push(tagId);
      countParams.push(tagId);
    }

    querySql += ` GROUP BY a.id ORDER BY a.create_time DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    const [countResultTask, listResultTask] = await Promise.all([
      db.query(countSql, countParams),
      db.query(querySql, queryParams),
    ]);

    const total = countResultTask[0][0].total;
    const articles = listResultTask[0].map((article) => ({
      ...article,
      tag_names: article.tag_names ? article.tag_names.split(",") : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(",").map(Number) : [],
    }));

    res.json({
      code: 200,
      message: "获取文章列表成功",
      data: {
        list: articles,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPage: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("获取文章列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 修改/编辑文章 (需要登录，支持更新标签)
exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    content,
    cover,
    category_id,
    status,
    tagIds,
    is_recommend,
  } = req.body;

  try {
    const [articles] = await db.query(
      "SELECT user_id FROM article WHERE id = ?",
      [id],
    );
    if (articles.length === 0) {
      return res.status(404).json({ code: 404, message: "文章不存在" });
    }

    if (articles[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ code: 403, message: "权限不足：你只能编辑自己的文章" });
    }

    const sql = `
      UPDATE article
      SET title = ?, description = ?, content = ?, cover = ?, category_id = ?, status = ?, is_recommend = ?
      WHERE id = ?
    `;
    await db.query(sql, [
      title,
      description,
      content,
      cover,
      category_id,
      status,
      is_recommend || 0,
      id,
    ]);

    await db.query("DELETE FROM article_tag WHERE article_id = ?", [id]);

    if (tagIds && tagIds.length > 0) {
      const values = tagIds.map((tagId) => [id, tagId]);
      await db.query("INSERT INTO article_tag (article_id, tag_id) VALUES ?", [
        values,
      ]);
    }

    res.json({ code: 200, message: "文章更新成功" });
  } catch (error) {
    console.error("更新文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 删除文章 (需要登录，同时删除标签关联)
exports.deleteArticle = async (req, res) => {
  const { id } = req.params;

  try {
    const [articles] = await db.query(
      "SELECT user_id FROM article WHERE id = ?",
      [id],
    );
    if (articles.length === 0) {
      return res.status(404).json({ code: 404, message: "文章不存在" });
    }

    if (articles[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ code: 403, message: "权限不足：你只能删除自己的文章" });
    }

    await db.query("DELETE FROM article_tag WHERE article_id = ?", [id]);
    await db.query("DELETE FROM article WHERE id = ?", [id]);
    res.json({ code: 200, message: "文章删除成功" });
  } catch (error) {
    console.error("删除文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 获取单篇文章详情 (公开接口，含标签)
exports.getArticleById = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "UPDATE article SET view_count = view_count + 1 WHERE id = ?",
      [id],
    );

    const sql = `
      SELECT a.*, c.name AS category_name, u.nickname AS author_name, u.avatar AS author_avatar,
             GROUP_CONCAT(DISTINCT t.name) AS tag_names,
             GROUP_CONCAT(DISTINCT t.id) AS tag_ids
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      LEFT JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN tag t ON at2.tag_id = t.id
      WHERE a.id = ? AND a.status = 1
      GROUP BY a.id
    `;
    const [articles] = await db.query(sql, [id]);

    if (articles.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: "文章不存在或已被删除" });
    }

    const article = articles[0];
    article.tag_names = article.tag_names ? article.tag_names.split(",") : [];
    article.tag_ids = article.tag_ids
      ? article.tag_ids.split(",").map(Number)
      : [];

    res.json({
      code: 200,
      message: "获取文章详情成功",
      data: article,
    });
  } catch (error) {
    console.error("获取文章详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 搜索文章（公开接口，模糊匹配标题和摘要）
exports.searchArticles = async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ code: 400, message: "搜索关键词不能为空" });
  }

  try {
    const likeKeyword = `%${keyword.trim()}%`;

    const sql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar,
             GROUP_CONCAT(DISTINCT t.name) AS tag_names,
             GROUP_CONCAT(DISTINCT t.id) AS tag_ids
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      LEFT JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN tag t ON at2.tag_id = t.id
      WHERE a.status = 1 AND (a.title LIKE ? OR a.description LIKE ?)
      GROUP BY a.id
      ORDER BY a.create_time DESC
      LIMIT 50
    `;
    const [articles] = await db.query(sql, [likeKeyword, likeKeyword]);

    const formatted = articles.map((article) => ({
      ...article,
      tag_names: article.tag_names ? article.tag_names.split(",") : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(",").map(Number) : [],
    }));

    res.json({
      code: 200,
      message: "搜索成功",
      data: {
        keyword: keyword.trim(),
        total: formatted.length,
        list: formatted,
      },
    });
  } catch (error) {
    console.error("搜索文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 7. 获取热门文章（公开，按阅读量排序）
exports.getHotArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const sql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar,
             GROUP_CONCAT(DISTINCT t.name) AS tag_names,
             GROUP_CONCAT(DISTINCT t.id) AS tag_ids
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      LEFT JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN tag t ON at2.tag_id = t.id
      WHERE a.status = 1
      GROUP BY a.id
      ORDER BY a.view_count DESC, a.like_count DESC
      LIMIT ?
    `;
    const [articles] = await db.query(sql, [limit]);

    const formatted = articles.map((article) => ({
      ...article,
      tag_names: article.tag_names ? article.tag_names.split(",") : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(",").map(Number) : [],
    }));

    res.json({ code: 200, message: "获取成功", data: formatted });
  } catch (error) {
    console.error("获取热门文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 8. 获取最新文章（公开）
exports.getLatestArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const sql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar,
             GROUP_CONCAT(DISTINCT t.name) AS tag_names,
             GROUP_CONCAT(DISTINCT t.id) AS tag_ids
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      LEFT JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN tag t ON at2.tag_id = t.id
      WHERE a.status = 1
      GROUP BY a.id
      ORDER BY a.create_time DESC
      LIMIT ?
    `;
    const [articles] = await db.query(sql, [limit]);

    const formatted = articles.map((article) => ({
      ...article,
      tag_names: article.tag_names ? article.tag_names.split(",") : [],
      tag_ids: article.tag_ids ? article.tag_ids.split(",").map(Number) : [],
    }));

    res.json({ code: 200, message: "获取成功", data: formatted });
  } catch (error) {
    console.error("获取最新文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取上下篇文章
exports.getArticleNav = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);

    const [current] = await db.query(
      "SELECT create_time FROM article WHERE id = ?",
      [articleId],
    );

    if (current.length === 0) {
      return res.status(404).json({ code: 404, message: "文章不存在" });
    }

    const createTime = current[0].create_time;

    const [prevRows] = await db.query(
      "SELECT id, title FROM article WHERE status = 1 AND create_time > ? ORDER BY create_time ASC LIMIT 1",
      [createTime],
    );

    const [nextRows] = await db.query(
      "SELECT id, title FROM article WHERE status = 1 AND create_time < ? ORDER BY create_time DESC LIMIT 1",
      [createTime],
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        prev: prevRows.length > 0 ? prevRows[0] : null,
        next: nextRows.length > 0 ? nextRows[0] : null,
      },
    });
  } catch (error) {
    console.error("获取上下篇文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 点赞文章
exports.likeArticle = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // 检查是否已点赞
    const [existing] = await db.query(
      "SELECT id FROM user_like WHERE user_id = ? AND article_id = ?",
      [user_id, id],
    );

    if (existing.length > 0) {
      // 已点赞 → 取消点赞
      await db.query(
        "DELETE FROM user_like WHERE user_id = ? AND article_id = ?",
        [user_id, id],
      );
      await db.query(
        "UPDATE article SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
        [id],
      );

      const [article] = await db.query(
        "SELECT like_count FROM article WHERE id = ?",
        [id],
      );

      return res.json({
        code: 200,
        message: "取消点赞",
        data: { liked: false, like_count: article[0].like_count },
      });
    }

    // 未点赞 → 点赞
    await db.query(
      "INSERT INTO user_like (user_id, article_id) VALUES (?, ?)",
      [user_id, id],
    );
    await db.query(
      "UPDATE article SET like_count = like_count + 1 WHERE id = ?",
      [id],
    );

    const [article] = await db.query(
      "SELECT like_count FROM article WHERE id = ?",
      [id],
    );

    res.json({
      code: 200,
      message: "点赞成功",
      data: { liked: true, like_count: article[0].like_count },
    });
  } catch (error) {
    console.error("点赞操作错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取点赞状态
exports.getLikeStatus = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await db.query(
      "SELECT id FROM user_like WHERE user_id = ? AND article_id = ?",
      [user_id, id],
    );

    const [article] = await db.query(
      "SELECT like_count FROM article WHERE id = ?",
      [id],
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        liked: existing.length > 0,
        like_count: article.length > 0 ? article[0].like_count : 0,
      },
    });
  } catch (error) {
    console.error("获取点赞状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取某篇文章的点赞用户列表（管理端）
exports.getArticleLikes = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT ul.id, ul.user_id, ul.create_time,
             u.username, u.nickname, u.avatar
      FROM user_like ul
      LEFT JOIN user u ON ul.user_id = u.id
      WHERE ul.article_id = ?
      ORDER BY ul.create_time DESC
    `;
    const [likes] = await db.query(sql, [id]);

    // 获取文章标题
    const [articles] = await db.query(
      "SELECT title, like_count FROM article WHERE id = ?",
      [id],
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        article: articles.length > 0 ? articles[0] : null,
        likes: likes,
      },
    });
  } catch (error) {
    console.error("获取点赞用户列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 获取推荐文章（前台首页）
exports.getRecommendArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const sql = `
      SELECT a.id, a.title, a.cover, a.view_count, a.like_count,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      WHERE a.status = 1 AND a.is_recommend = 1
      ORDER BY a.view_count DESC, a.create_time DESC
      LIMIT ?
    `;
    const [articles] = await db.query(sql, [limit]);
    res.json({ code: 200, message: "获取成功", data: articles });
  } catch (error) {
    console.error("获取推荐文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
// 切换推荐状态（管理端）
exports.toggleRecommend = async (req, res) => {
  const { id } = req.params;
  const { is_recommend } = req.body;

  try {
    await db.query("UPDATE article SET is_recommend = ? WHERE id = ?", [
      is_recommend ? 1 : 0,
      id,
    ]);
    res.json({ code: 200, message: "更新成功" });
  } catch (error) {
    console.error("切换推荐状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
