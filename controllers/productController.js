const db = require("../config/db");

// 1. 获取商品列表（前台公开，支持分类/排序/关键词/分页）
exports.getProductList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const category = req.query.category;
    const sort = req.query.sort;
    const keyword = req.query.keyword;
    const offset = (page - 1) * pageSize;

    let querySql = "SELECT * FROM product WHERE status = 1";
    let countSql = "SELECT COUNT(*) AS total FROM product WHERE status = 1";
    let queryParams = [];
    let countParams = [];

    // 分类筛选
    if (category && category !== "全部") {
      querySql += " AND category = ?";
      countSql += " AND category = ?";
      queryParams.push(category);
      countParams.push(category);
    }

    // 关键词搜索
    if (keyword && keyword.trim()) {
      querySql += " AND name LIKE ?";
      countSql += " AND name LIKE ?";
      queryParams.push(`%${keyword.trim()}%`);
      countParams.push(`%${keyword.trim()}%`);
    }

    // 排序
    switch (sort) {
      case "newest":
        querySql += " ORDER BY create_time DESC";
        break;
      case "sales":
        querySql += " ORDER BY sales DESC";
        break;
      case "price_asc":
        querySql += " ORDER BY price ASC";
        break;
      case "price_desc":
        querySql += " ORDER BY price DESC";
        break;
      default:
        querySql +=
          " ORDER BY is_hot DESC, is_new DESC, sort_order DESC, create_time DESC";
    }

    querySql += " LIMIT ? OFFSET ?";
    queryParams.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      db.query(countSql, countParams),
      db.query(querySql, queryParams),
    ]);

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: listResult[0],
        total: countResult[0][0].total,
        page: page,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("获取商品列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取商品详情（公开）
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const [products] = await db.query("SELECT * FROM product WHERE id = ?", [
      id,
    ]);
    if (products.length === 0) {
      return res.status(404).json({ code: 404, message: "商品不存在" });
    }
    res.json({ code: 200, message: "获取成功", data: products[0] });
  } catch (error) {
    console.error("获取商品详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 获取所有分类（公开）
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT category FROM product WHERE status = 1 AND category IS NOT NULL ORDER BY category",
    );
    const categories = rows.map((r) => r.category);
    categories.unshift("全部");
    res.json({ code: 200, message: "获取成功", data: categories });
  } catch (error) {
    console.error("获取分类错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 管理端：获取所有商品（分页+筛选+排序）
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const name = req.query.name;
    const offset = (page - 1) * pageSize;

    let querySql = "SELECT * FROM product WHERE 1 = 1";
    let countSql = "SELECT COUNT(*) AS total FROM product WHERE 1 = 1";
    let queryParams = [];
    let countParams = [];

    if (name) {
      querySql += " AND name LIKE ?";
      countSql += " AND name LIKE ?";
      queryParams.push(`%${name}%`);
      countParams.push(`%${name}%`);
    }

    querySql += " ORDER BY sort_order DESC, create_time DESC LIMIT ? OFFSET ?";
    queryParams.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      db.query(countSql, countParams),
      db.query(querySql, queryParams),
    ]);

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: listResult[0],
        total: countResult[0][0].total,
        page: page,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("获取商品列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 管理端：新增商品
exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    original_price,
    cover,
    images,
    category,
    stock,
    is_new,
    is_hot,
    status,
    sort_order,
  } = req.body;

  if (!name || !price) {
    return res
      .status(400)
      .json({ code: 400, message: "商品名称和价格不能为空" });
  }

  try {
    await db.query(
      `INSERT INTO product (name, description, price, original_price, cover, images, category, stock, is_new, is_hot, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || "",
        price,
        original_price || null,
        cover || "",
        images || "[]",
        category || "",
        stock || 0,
        is_new || 0,
        is_hot || 0,
        status !== undefined ? status : 1,
        sort_order || 0,
      ],
    );
    res.status(201).json({ code: 201, message: "商品创建成功" });
  } catch (error) {
    console.error("创建商品错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 管理端：修改商品
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    original_price,
    cover,
    images,
    category,
    stock,
    is_new,
    is_hot,
    status,
    sort_order,
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE product SET name=?, description=?, price=?, original_price=?, cover=?, images=?, category=?, stock=?, is_new=?, is_hot=?, status=?, sort_order=? WHERE id=?`,
      [
        name,
        description || "",
        price,
        original_price || null,
        cover || "",
        images || "[]",
        category || "",
        stock || 0,
        is_new || 0,
        is_hot || 0,
        status !== undefined ? status : 1,
        sort_order || 0,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "商品不存在" });
    }
    res.json({ code: 200, message: "商品更新成功" });
  } catch (error) {
    console.error("更新商品错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 7. 管理端：删除商品
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM product WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "商品不存在" });
    }
    res.json({ code: 200, message: "商品删除成功" });
  } catch (error) {
    console.error("删除商品错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
