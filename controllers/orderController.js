const db = require("../config/db");

// 生成订单编号
const generateOrderNo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${y}${m}${d}${h}${min}${s}${random}`;
};

// 1. 创建订单（前台：从购物车结算）
exports.createOrder = async (req, res) => {
  const user_id = req.user.id;
  const { items, receiver_name, receiver_phone, receiver_address, remark } =
    req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ code: 400, message: "订单商品不能为空" });
  }

  try {
    // 计算总金额并校验商品
    let total_amount = 0;
    const productIds = items.map((item) => item.product_id);
    const [products] = await db.query(
      "SELECT id, name, cover, price, stock FROM product WHERE id IN (?)",
      [productIds],
    );

    const productMap = {};
    products.forEach((p) => (productMap[p.id] = p));

    // 校验库存
    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) {
        return res
          .status(400)
          .json({ code: 400, message: `商品不存在: ${item.product_id}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          code: 400,
          message: `「${product.name}」库存不足，剩余 ${product.stock} 件`,
        });
      }
      total_amount += product.price * item.quantity;
    }

    const order_no = generateOrderNo();

    // 创建订单
    const [orderResult] = await db.query(
      `INSERT INTO \`order\` (order_no, user_id, total_amount, status, receiver_name, receiver_phone, receiver_address, remark)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        order_no,
        user_id,
        total_amount,
        receiver_name || "",
        receiver_phone || "",
        receiver_address || "",
        remark || "",
      ],
    );

    const orderId = orderResult.insertId;

    // 创建订单商品 + 扣减库存
    for (const item of items) {
      const product = productMap[item.product_id];
      await db.query(
        "INSERT INTO order_item (order_id, product_id, product_name, product_cover, price, quantity) VALUES (?, ?, ?, ?, ?, ?)",
        [
          orderId,
          product.id,
          product.name,
          product.cover || "",
          product.price,
          item.quantity,
        ],
      );
      await db.query(
        "UPDATE product SET stock = stock - ?, sales = sales + ? WHERE id = ?",
        [item.quantity, item.quantity, product.id],
      );
    }

    res.status(201).json({
      code: 201,
      message: "订单创建成功",
      data: { order_id: orderId, order_no, total_amount },
    });
  } catch (error) {
    console.error("创建订单错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取用户的订单列表
exports.getUserOrders = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT * FROM \`order\` WHERE user_id = ? ORDER BY create_time DESC`,
      [user_id],
    );

    // 查每个订单的商品
    for (const order of orders) {
      const [items] = await db.query(
        "SELECT * FROM order_item WHERE order_id = ?",
        [order.id],
      );
      order.items = items;
    }

    res.json({ code: 200, message: "获取成功", data: orders });
  } catch (error) {
    console.error("获取订单列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 获取订单详情
exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const [orders] = await db.query("SELECT * FROM `order` WHERE id = ?", [id]);

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: "订单不存在" });
    }

    const [items] = await db.query(
      "SELECT * FROM order_item WHERE order_id = ?",
      [id],
    );

    const order = orders[0];
    order.items = items;

    res.json({ code: 200, message: "获取成功", data: order });
  } catch (error) {
    console.error("获取订单详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 模拟支付
exports.payOrder = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [orders] = await db.query(
      "SELECT * FROM `order` WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: "订单不存在" });
    }

    if (orders[0].status !== 0) {
      return res.status(400).json({ code: 400, message: "订单状态不允许支付" });
    }

    await db.query(
      "UPDATE `order` SET status = 1, pay_time = NOW() WHERE id = ?",
      [id],
    );

    res.json({ code: 200, message: "支付成功（模拟）" });
  } catch (error) {
    console.error("支付错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 取消订单
exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [orders] = await db.query(
      "SELECT * FROM `order` WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: "订单不存在" });
    }

    if (orders[0].status !== 0) {
      return res
        .status(400)
        .json({ code: 400, message: "只能取消待付款的订单" });
    }

    // 恢复库存
    const [items] = await db.query(
      "SELECT * FROM order_item WHERE order_id = ?",
      [id],
    );
    for (const item of items) {
      await db.query(
        "UPDATE product SET stock = stock + ?, sales = sales - ? WHERE id = ?",
        [item.quantity, item.quantity, item.product_id],
      );
    }

    await db.query("UPDATE `order` SET status = 4 WHERE id = ?", [id]);

    res.json({ code: 200, message: "订单已取消" });
  } catch (error) {
    console.error("取消订单错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 删除订单
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [orders] = await db.query(
      "SELECT * FROM `order` WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (orders.length === 0) {
      return res.status(404).json({ code: 404, message: "订单不存在" });
    }

    if (orders[0].status === 1) {
      return res.status(400).json({ code: 400, message: "已付款订单不能删除" });
    }

    await db.query("DELETE FROM order_item WHERE order_id = ?", [id]);
    await db.query("DELETE FROM `order` WHERE id = ?", [id]);

    res.json({ code: 200, message: "订单已删除" });
  } catch (error) {
    console.error("删除订单错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 7. 管理端：获取所有订单
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status;
    const keyword = req.query.keyword;
    const offset = (page - 1) * pageSize;

    let where = "1=1";
    let params = [];

    if (status !== undefined && status !== "") {
      where += " AND o.status = ?";
      params.push(status);
    }

    if (keyword) {
      where +=
        " AND (o.order_no LIKE ? OR u.username LIKE ? OR o.receiver_name LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const countSql = `SELECT COUNT(*) AS total FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id WHERE ${where}`;
    const [countResult] = await db.query(countSql, params);
    const total = countResult[0].total;

    const querySql = `
      SELECT o.*, u.username, u.nickname
      FROM \`order\` o
      LEFT JOIN user u ON o.user_id = u.id
      WHERE ${where}
      ORDER BY o.create_time DESC
      LIMIT ? OFFSET ?
    `;
    const [orders] = await db.query(querySql, [...params, pageSize, offset]);

    for (const order of orders) {
      const [items] = await db.query(
        "SELECT * FROM order_item WHERE order_id = ?",
        [order.id],
      );
      order.items = items;
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: { list: orders, total, page, pageSize },
    });
  } catch (error) {
    console.error("获取所有订单错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 8. 管理端：更新订单状态
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query("UPDATE `order` SET status = ? WHERE id = ?", [status, id]);
    res.json({ code: 200, message: "状态更新成功" });
  } catch (error) {
    console.error("更新订单状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
