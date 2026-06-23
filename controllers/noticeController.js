const db = require("../config/db");

// 1. 获取启用的购买须知（前台公开）
exports.getActiveNotices = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM purchase_notice WHERE status = 1 ORDER BY sort_order DESC, create_time ASC",
    );
    res.json({ code: 200, message: "获取成功", data: rows });
  } catch (error) {
    console.error("获取购买须知错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 管理端：获取所有购买须知（分页）
exports.getAllNotices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const [countResult] = await db.query(
      "SELECT COUNT(*) AS total FROM purchase_notice",
    );
    const [rows] = await db.query(
      "SELECT * FROM purchase_notice ORDER BY sort_order DESC, create_time ASC LIMIT ? OFFSET ?",
      [pageSize, offset],
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: rows,
        total: countResult[0].total,
        page: page,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("获取购买须知列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 管理端：新增购买须知
exports.createNotice = async (req, res) => {
  const { icon, title, description, sort_order, status } = req.body;

  if (!title || !description) {
    return res.status(400).json({ code: 400, message: "标题和内容不能为空" });
  }

  try {
    await db.query(
      "INSERT INTO purchase_notice (icon, title, description, sort_order, status) VALUES (?, ?, ?, ?, ?)",
      [
        icon || "📌",
        title,
        description,
        sort_order || 0,
        status !== undefined ? status : 1,
      ],
    );
    res.status(201).json({ code: 201, message: "创建成功" });
  } catch (error) {
    console.error("创建购买须知错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 管理端：修改购买须知
exports.updateNotice = async (req, res) => {
  const { id } = req.params;
  const { icon, title, description, sort_order, status } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE purchase_notice SET icon=?, title=?, description=?, sort_order=?, status=? WHERE id=?",
      [
        icon || "📌",
        title,
        description,
        sort_order || 0,
        status !== undefined ? status : 1,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "记录不存在" });
    }
    res.json({ code: 200, message: "更新成功" });
  } catch (error) {
    console.error("更新购买须知错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 管理端：删除购买须知
exports.deleteNotice = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "DELETE FROM purchase_notice WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "记录不存在" });
    }
    res.json({ code: 200, message: "删除成功" });
  } catch (error) {
    console.error("删除购买须知错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
