const db = require("../config/db");

// 1. 获取所有标签（含文章数量统计）
exports.getAllTags = async (req, res) => {
  try {
    const sql = `
      SELECT t.*, COUNT(at2.article_id) AS article_count
      FROM tag t
      LEFT JOIN article_tag at2 ON t.id = at2.tag_id
      GROUP BY t.id
      ORDER BY t.create_time DESC
    `;
    const [tags] = await db.query(sql);

    res.json({
      code: 200,
      message: "获取成功",
      data: tags,
    });
  } catch (error) {
    console.error("获取标签列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取单个标签详情
exports.getTagById = async (req, res) => {
  const { id } = req.params;

  try {
    const [tags] = await db.query("SELECT * FROM tag WHERE id = ?", [id]);

    if (tags.length === 0) {
      return res.status(404).json({ code: 404, message: "标签不存在" });
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: tags[0],
    });
  } catch (error) {
    console.error("获取标签详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 新增标签
exports.createTag = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ code: 400, message: "标签名不能为空" });
  }

  try {
    const [existing] = await db.query("SELECT id FROM tag WHERE name = ?", [
      name,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: "标签名已存在" });
    }

    await db.query("INSERT INTO tag (name) VALUES (?)", [name]);

    res.status(201).json({
      code: 201,
      message: "创建成功！",
    });
  } catch (error) {
    console.error("创建标签错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 更新标签
exports.updateTag = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ code: 400, message: "标签名不能为空" });
  }

  try {
    const [tags] = await db.query("SELECT id FROM tag WHERE id = ?", [id]);

    if (tags.length === 0) {
      return res.status(404).json({ code: 404, message: "标签不存在" });
    }

    const [duplicate] = await db.query(
      "SELECT id FROM tag WHERE name = ? AND id != ?",
      [name, id],
    );

    if (duplicate.length > 0) {
      return res.status(400).json({ code: 400, message: "标签名已存在" });
    }

    await db.query("UPDATE tag SET name = ? WHERE id = ?", [name, id]);

    res.json({
      code: 200,
      message: "更新成功！",
    });
  } catch (error) {
    console.error("更新标签错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 删除标签
exports.deleteTag = async (req, res) => {
  const { id } = req.params;

  try {
    const [tags] = await db.query("SELECT id FROM tag WHERE id = ?", [id]);

    if (tags.length === 0) {
      return res.status(404).json({ code: 404, message: "标签不存在" });
    }

    await db.query("DELETE FROM tag WHERE id = ?", [id]);

    res.json({
      code: 200,
      message: "删除成功！",
    });
  } catch (error) {
    console.error("删除标签错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 根据标签获取文章列表
exports.getArticlesByTag = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.create_time,
             c.name AS category_name,
             u.nickname AS author_name, u.avatar AS author_avatar
      FROM article a
      INNER JOIN article_tag at2 ON a.id = at2.article_id
      LEFT JOIN category c ON a.category_id = c.id
      LEFT JOIN user u ON a.user_id = u.id
      WHERE at2.tag_id = ? AND a.status = 1
      ORDER BY a.create_time DESC
    `;
    const [articles] = await db.query(sql, [id]);

    res.json({
      code: 200,
      message: "获取成功",
      data: articles,
    });
  } catch (error) {
    console.error("按标签获取文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
