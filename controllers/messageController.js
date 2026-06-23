const db = require("../config/db");

// 1. 获取留言列表（含回复）
exports.getActiveMessages = async (req, res) => {
  try {
    const [messages] = await db.query(
      "SELECT * FROM message_wall WHERE status = 1 ORDER BY is_top DESC, like_count DESC, create_time DESC",
    );

    // 批量获取所有回复
    if (messages.length > 0) {
      const ids = messages.map((m) => m.id);
      const [replies] = await db.query(
        `SELECT * FROM message_reply WHERE message_id IN (${ids
          .map(() => "?")
          .join(",")}) ORDER BY create_time ASC`,
        ids,
      );
      messages.forEach((msg) => {
        msg.replies = replies.filter((r) => r.message_id === msg.id);
      });
    }

    res.json({ code: 200, message: "获取成功", data: messages });
  } catch (error) {
    console.error("获取留言列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 发表留言（需登录，防重复）
exports.createMessage = async (req, res) => {
  const { content, nickname, color, emoji, image_url } = req.body;
  const user_id = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ code: 400, message: "留言内容不能为空" });
  }

  // 防重复：同一用户 10 秒内不能发重复内容
  try {
    const [recent] = await db.query(
      "SELECT id FROM message_wall WHERE user_id = ? AND content = ? AND create_time > DATE_SUB(NOW(), INTERVAL 10 SECOND)",
      [user_id, content.trim()],
    );
    if (recent.length > 0) {
      return res.status(429).json({ code: 429, message: "请勿重复提交" });
    }
  } catch (e) {}

  const colors = [
    "#667eea",
    "#4ECDC4",
    "#FF6B6B",
    "#FCD34D",
    "#A78BFA",
    "#F472B6",
    "#34D399",
    "#FB923C",
  ];
  const emojis = [
    "💬",
    "🌟",
    "☀️",
    "❤️",
    "🌙",
    "📖",
    "🎨",
    "🎵",
    "🔥",
    "💡",
    "🍀",
    "🌈",
  ];

  const randomColor =
    color || colors[Math.floor(Math.random() * colors.length)];
  const randomEmoji =
    emoji || emojis[Math.floor(Math.random() * emojis.length)];

  try {
    const [result] = await db.query(
      "INSERT INTO message_wall (user_id, nickname, content, color, emoji, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [
        user_id,
        nickname || req.user.username || "匿名",
        content.trim(),
        randomColor,
        randomEmoji,
        image_url || null,
      ],
    );

    res.status(201).json({
      code: 201,
      message: "留言成功",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("发表留言错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 点赞留言（防重复点赞）
exports.likeMessage = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await db.query(
      "SELECT id FROM message_like WHERE message_id = ? AND user_id = ?",
      [id, user_id],
    );

    if (existing.length > 0) {
      // 取消点赞
      await db.query(
        "DELETE FROM message_like WHERE message_id = ? AND user_id = ?",
        [id, user_id],
      );
      await db.query(
        "UPDATE message_wall SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
        [id],
      );
    } else {
      // 点赞
      await db.query(
        "INSERT INTO message_like (message_id, user_id) VALUES (?, ?)",
        [id, user_id],
      );
      await db.query(
        "UPDATE message_wall SET like_count = like_count + 1 WHERE id = ?",
        [id],
      );
    }

    const [msg] = await db.query(
      "SELECT like_count FROM message_wall WHERE id = ?",
      [id],
    );

    res.json({
      code: 200,
      message: existing.length > 0 ? "取消点赞" : "点赞成功",
      data: { like_count: msg[0].like_count, liked: existing.length === 0 },
    });
  } catch (error) {
    console.error("点赞留言错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 回复留言
exports.replyMessage = async (req, res) => {
  const { id } = req.params;
  const { content, nickname, reply_to } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!content || !content.trim()) {
    return res.status(400).json({ code: 400, message: "回复内容不能为空" });
  }

  try {
    const [msg] = await db.query("SELECT id FROM message_wall WHERE id = ?", [
      id,
    ]);
    if (msg.length === 0) {
      return res.status(404).json({ code: 404, message: "留言不存在" });
    }

    const [result] = await db.query(
      "INSERT INTO message_reply (message_id, user_id, nickname, content, reply_to) VALUES (?, ?, ?, ?, ?)",
      [
        id,
        user_id,
        nickname || req.user?.username || "匿名",
        content.trim(),
        reply_to || null,
      ],
    );

    const [reply] = await db.query("SELECT * FROM message_reply WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({ code: 201, message: "回复成功", data: reply[0] });
  } catch (error) {
    console.error("回复留言错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 上传图片
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: "请选择图片" });
    }
    const imageUrl = `/uploads/messages/${req.file.filename}`;
    res.json({ code: 200, message: "上传成功", data: { url: imageUrl } });
  } catch (error) {
    console.error("上传图片错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 获取用户点赞状态
exports.getLikedStatus = async (req, res) => {
  const user_id = req.user.id;
  try {
    const [rows] = await db.query(
      "SELECT message_id FROM message_like WHERE user_id = ?",
      [user_id],
    );
    res.json({
      code: 200,
      message: "获取成功",
      data: rows.map((r) => r.message_id),
    });
  } catch (error) {
    console.error("获取点赞状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// ==================== 管理端 ====================

// 7. 管理端：获取所有留言（分页 + 筛选）
exports.getAllMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const nickname = req.query.nickname;
    const offset = (page - 1) * pageSize;

    let querySql = "SELECT * FROM message_wall WHERE 1 = 1";
    let countSql = "SELECT COUNT(*) AS total FROM message_wall WHERE 1 = 1";
    let queryParams = [];
    let countParams = [];

    if (nickname) {
      querySql += " AND nickname LIKE ?";
      countSql += " AND nickname LIKE ?";
      queryParams.push(`%${nickname}%`);
      countParams.push(`%${nickname}%`);
    }

    querySql += " ORDER BY is_top DESC, create_time DESC LIMIT ? OFFSET ?";
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
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("获取留言列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 8. 管理端：获取单条留言
exports.getMessageById = async (req, res) => {
  const { id } = req.params;
  try {
    const [messages] = await db.query(
      "SELECT * FROM message_wall WHERE id = ?",
      [id],
    );
    if (messages.length === 0)
      return res.status(404).json({ code: 404, message: "留言不存在" });
    res.json({ code: 200, message: "获取成功", data: messages[0] });
  } catch (error) {
    console.error("获取留言详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 9. 管理端：修改留言
exports.updateMessage = async (req, res) => {
  const { id } = req.params;
  const { nickname, content, color, emoji, status, is_top } = req.body;
  if (!content)
    return res.status(400).json({ code: 400, message: "留言内容不能为空" });

  try {
    const [result] = await db.query(
      "UPDATE message_wall SET nickname = ?, content = ?, color = ?, emoji = ?, status = ?, is_top = ? WHERE id = ?",
      [
        nickname || "匿名",
        content,
        color || "#667eea",
        emoji || "💬",
        status !== undefined ? status : 1,
        is_top || 0,
        id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ code: 404, message: "留言不存在" });
    res.json({ code: 200, message: "留言更新成功" });
  } catch (error) {
    console.error("更新留言错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 10. 管理端：删除留言
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM message_wall WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ code: 404, message: "留言不存在" });
    res.json({ code: 200, message: "留言删除成功" });
  } catch (error) {
    console.error("删除留言错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
