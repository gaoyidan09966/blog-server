const db = require("../config/db");

// 自动回复知识库（带追问按钮）
const autoReplies = [
  {
    keywords: ["技术栈", "什么技术", "用的什么", "用了什么"],
    answer:
      "本站使用 Vue3 + Express + MySQL 全栈开发，前端使用 Element Plus，后端使用 RESTful API 架构。",
    followUps: ["前端用了什么UI库？", "后端用了什么框架？"],
  },
  {
    keywords: ["前端", "UI库", "组件"],
    answer:
      "前端使用 Vue3 + Element Plus + Vite 构建，支持响应式布局和暗黑模式（计划中）。",
    followUps: ["后端用了什么？", "项目开源吗？"],
  },
  {
    keywords: ["后端", "服务器", "express"],
    answer:
      "后端使用 Express 框架，MySQL 数据库，JWT 身份认证，RESTful API 设计。",
    followUps: ["数据库用的什么？", "项目开源吗？"],
  },
  {
    keywords: ["转载", "引用", "复制"],
    answer:
      "文章可以转载，请注明出处和原文链接即可。如果需要开白名单，请通过留言墙告知。",
    followUps: ["如何联系博主？"],
  },
  {
    keywords: ["投稿", "合作", "联系"],
    answer:
      "感谢你的关注！可以通过页面底部的联系方式或留言墙与我沟通，我会尽快回复。",
    followUps: ["留言墙在哪里？"],
  },
  {
    keywords: ["购买", "怎么买", "商品", "周边"],
    answer:
      "周边商品功能暂未开放线上支付，如有购买意向请通过留言墙或联系方式与我沟通。",
    followUps: ["如何联系博主？"],
  },
  {
    keywords: ["评论", "留言", "发表"],
    answer: "登录后即可在文章底部发表评论，也可以在留言墙页面留下你的话。",
    followUps: ["怎么注册账号？"],
  },
  {
    keywords: ["注册", "账号", "登录"],
    answer: "点击页面右上角的「登录」按钮，可以注册新账号或使用已有账号登录。",
    followUps: ["登录后能做什么？"],
  },
  {
    keywords: ["开源", "代码", "github", "源码"],
    answer:
      "本站项目目前未开源，如对技术实现感兴趣，可以查看「关于我」页面了解技术细节。",
    followUps: ["技术栈是什么？"],
  },
  {
    keywords: ["留言墙", "在哪里"],
    answer: "导航栏顶部有「留言墙」入口，或者直接访问 /messages 路径即可。",
    followUps: ["需要登录吗？"],
  },
];

// 匹配自动回复
function matchAutoReply(message) {
  const msg = message.toLowerCase();
  for (const item of autoReplies) {
    if (item.keywords.some((kw) => msg.includes(kw))) {
      return {
        answer: item.answer,
        followUps: item.followUps || null,
      };
    }
  }
  return null;
}

// 发送消息
exports.sendMessage = async (req, res) => {
  const { content, nickname } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ code: 400, message: "消息内容不能为空" });
  }

  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"] || "";

    // ★ 插入后返回 ID
    const [result] = await db.query(
      "INSERT INTO chat_message (nickname, content, ip, user_agent) VALUES (?, ?, ?, ?)",
      [nickname || "访客", content.trim(), ip, userAgent],
    );

    const match = matchAutoReply(content.trim());

    res.json({
      code: 200,
      message: "发送成功",
      data: {
        dbId: result.insertId, // ★ 返回数据库ID
        reply: match ? match.answer : null,
        followUps: match ? match.followUps : null,
      },
    });
  } catch (error) {
    console.error("发送消息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取热门问题（前台）
exports.getHotQuestions = async (req, res) => {
  const questions = [
    { icon: "📝", text: "博客使用什么技术栈？" },
    { icon: "💬", text: "如何发表评论？" },
    { icon: "📤", text: "文章可以转载吗？" },
    { icon: "🛍️", text: "商品如何购买？" },
    { icon: "🤝", text: "如何投稿合作？" },
    { icon: "💻", text: "项目是开源的吗？" },
  ];

  res.json({ code: 200, message: "获取成功", data: questions });
};

// 3. 管理端：获取所有消息（分页）
exports.getAllMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [countResult] = await db.query(
      "SELECT COUNT(*) AS total FROM chat_message",
    );
    const [rows] = await db.query(
      "SELECT * FROM chat_message ORDER BY create_time DESC LIMIT ? OFFSET ?",
      [pageSize, offset],
    );

    // 未回复数量
    const [unreadResult] = await db.query(
      "SELECT COUNT(*) AS total FROM chat_message WHERE is_replied = 0",
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: rows,
        total: countResult[0].total,
        unread: unreadResult[0].total,
        page: page,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("获取消息列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 管理端：回复消息
exports.replyMessage = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ code: 400, message: "回复内容不能为空" });
  }

  try {
    const [result] = await db.query(
      "UPDATE chat_message SET reply = ?, is_replied = 1 WHERE id = ?",
      [reply.trim(), id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "消息不存在" });
    }

    res.json({ code: 200, message: "回复成功" });
  } catch (error) {
    console.error("回复消息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 管理端：删除消息
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM chat_message WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "消息不存在" });
    }
    res.json({ code: 200, message: "删除成功" });
  } catch (error) {
    console.error("删除消息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 管理端：获取未回复数量（用于导航角标）
exports.getUnreadCount = async (req, res) => {
  try {
    const [result] = await db.query(
      "SELECT COUNT(*) AS total FROM chat_message WHERE is_replied = 0",
    );
    res.json({
      code: 200,
      message: "获取成功",
      data: { unread: result[0].total },
    });
  } catch (error) {
    console.error("获取未读数错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 7. 前台：根据昵称获取最新回复（轮询）
exports.getMyReplies = async (req, res) => {
  const nickname = req.query.nickname;
  const afterId = parseInt(req.query.afterId) || 0;

  if (!nickname) {
    return res.json({ code: 200, message: "获取成功", data: [] });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, nickname, content, reply, is_replied, create_time
       FROM chat_message
       WHERE nickname = ? AND is_replied = 1 AND reply IS NOT NULL AND reply != '' AND id > ?
       ORDER BY id ASC`,
      [nickname, afterId],
    );

    res.json({ code: 200, message: "获取成功", data: rows });
  } catch (error) {
    console.error("获取回复错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
// 8. 获取客服在线状态（前台）
exports.getServiceStatus = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM chat_setting WHERE setting_key = 'service_online'",
    );
    const online = rows.length > 0 ? rows[0].setting_value === "1" : true;
    res.json({ code: 200, message: "获取成功", data: { online } });
  } catch (error) {
    console.error("获取客服状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 9. 切换客服在线状态（管理端）
exports.toggleServiceStatus = async (req, res) => {
  const { online } = req.body;
  try {
    await db.query(
      "UPDATE chat_setting SET setting_value = ? WHERE setting_key = 'service_online'",
      [online ? "1" : "0"],
    );
    res.json({ code: 200, message: online ? "已上线" : "已下线" });
  } catch (error) {
    console.error("切换客服状态错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 10. 获取客服状态详情（管理端）
exports.getServiceStatusAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM chat_setting WHERE setting_key = 'service_online'",
    );
    const online = rows.length > 0 ? rows[0].setting_value === "1" : true;

    // 今日消息数
    const today = new Date().toISOString().split("T")[0];
    const [todayResult] = await db.query(
      "SELECT COUNT(*) AS total FROM chat_message WHERE DATE(create_time) = ?",
      [today],
    );

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        online,
        todayCount: todayResult[0].total,
      },
    });
  } catch (error) {
    console.error("获取状态详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
