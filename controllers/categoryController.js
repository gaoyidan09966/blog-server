const db = require("../config/db");

// 1. 创建分类
exports.createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ code: 400, message: "分类名称不能为空" });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM category WHERE name = ?",
      [name],
    );
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: "该分类名称已存在" });
    }

    const sql = "INSERT INTO category (name) VALUES (?)";
    await db.query(sql, [name]);

    res.status(201).json({ code: 201, message: "分类创建成功" });
  } catch (error) {
    console.error("创建分类错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取所有分类列表（含文章数量统计）
exports.getAllCategories = async (req, res) => {
  try {
    const sql = `
      SELECT c.*, COUNT(a.id) AS article_count
      FROM category c
      LEFT JOIN article a ON c.id = a.category_id AND a.status = 1
      GROUP BY c.id
      ORDER BY c.create_time DESC
    `;
    const [categories] = await db.query(sql);

    res.json({
      code: 200,
      message: "获取分类列表成功",
      data: categories,
    });
  } catch (error) {
    console.error("获取分类错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 获取单个分类详情
exports.getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const [categories] = await db.query("SELECT * FROM category WHERE id = ?", [
      id,
    ]);

    if (categories.length === 0) {
      return res.status(404).json({ code: 404, message: "分类不存在" });
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: categories[0],
    });
  } catch (error) {
    console.error("获取分类详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 修改分类
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ code: 400, message: "分类名称不能为空" });
  }

  try {
    const sql = "UPDATE category SET name = ? WHERE id = ?";
    const [result] = await db.query(sql, [name, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "未找到该分类" });
    }

    res.json({ code: 200, message: "分类修改成功" });
  } catch (error) {
    console.error("修改分类错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 删除分类
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query("DELETE FROM category WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "未找到该分类" });
    }

    res.json({ code: 200, message: "分类删除成功" });
  } catch (error) {
    console.error("删除分类错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
