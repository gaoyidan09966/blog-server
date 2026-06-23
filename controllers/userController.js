const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 1. 用户注册
exports.register = async (req, res) => {
  const { username, password, nickname } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: "用户名和密码不能为空" });
  }

  try {
    const [existingUser] = await db.query(
      "SELECT id FROM user WHERE username = ?",
      [username],
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ code: 400, message: "用户名已存在" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const defaultNickname =
      nickname || `书友_${Math.floor(Math.random() * 90000 + 10000)}`;
    const sql =
      "INSERT INTO user (username, password, nickname) VALUES (?, ?, ?)";
    await db.query(sql, [username, hashedPassword, defaultNickname]);

    res.status(201).json({ code: 201, message: "注册成功！" });
  } catch (error) {
    console.error("注册错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 用户登录
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: "请输入用户名和密码" });
  }

  try {
    const [users] = await db.query("SELECT * FROM user WHERE username = ?", [
      username,
    ]);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      code: 200,
      message: "登录成功！",
      data: {
        token: "Bearer " + token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("登录错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 获取当前登录用户信息
exports.getUserInfo = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, nickname, avatar, role, bio, create_time FROM user WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: users[0],
    });
  } catch (error) {
    console.error("获取用户信息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 用户列表接口（分页 + 用户名筛选）
exports.getUserList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const username = req.query.username;
    const offset = (page - 1) * pageSize;

    let querySql = `
      SELECT id, username, nickname, avatar, role, create_time
      FROM user
      WHERE 1 = 1
    `;
    let countSql = `SELECT COUNT(*) AS total FROM user WHERE 1 = 1`;
    let queryParams = [];
    let countParams = [];

    // 用户名模糊筛选
    if (username) {
      querySql += ` AND username LIKE ?`;
      countSql += ` AND username LIKE ?`;
      queryParams.push(`%${username}%`);
      countParams.push(`%${username}%`);
    }

    querySql += ` ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    queryParams.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      db.query(countSql, countParams),
      db.query(querySql, queryParams),
    ]);

    const total = countResult[0][0].total;

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: listResult[0],
        total: total,
        page: page,
        pageSize: pageSize,
        totalPage: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("获取用户列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 单条用户信息接口
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.query(
      "SELECT id, username, nickname, avatar, role, create_time FROM user WHERE id = ?",
      [id],
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: users[0],
    });
  } catch (error) {
    console.error("获取用户详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 新增管理员接口
exports.createUser = async (req, res) => {
  const { username, password, nickname, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: "用户名和密码不能为空" });
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM user WHERE username = ?",
      [username],
    );

    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: "用户名已存在" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultNickname =
      nickname || `用户_${Math.floor(Math.random() * 90000 + 10000)}`;

    await db.query(
      "INSERT INTO user (username, password, nickname, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, defaultNickname, role || "user"],
    );

    res.status(201).json({ code: 201, message: "用户创建成功" });
  } catch (error) {
    console.error("创建用户错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 7. 修改管理员接口
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { nickname, role, password } = req.body;

  if (!nickname) {
    return res.status(400).json({ code: 400, message: "昵称不能为空" });
  }

  try {
    const [users] = await db.query("SELECT id FROM user WHERE id = ?", [id]);

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    // 如果传了密码，就一起更新
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE user SET nickname = ?, role = ?, password = ? WHERE id = ?",
        [nickname, role || "user", hashedPassword, id],
      );
    } else {
      await db.query("UPDATE user SET nickname = ?, role = ? WHERE id = ?", [
        nickname,
        role || "user",
        id,
      ]);
    }

    res.json({ code: 200, message: "用户信息更新成功" });
  } catch (error) {
    console.error("更新用户错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 8. 删除管理员接口
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (parseInt(id) === req.user.id) {
      return res
        .status(400)
        .json({ code: 400, message: "不能删除当前登录的管理员账号" });
    }

    const [result] = await db.query("DELETE FROM user WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    res.json({ code: 200, message: "用户删除成功" });
  } catch (error) {
    console.error("删除用户错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 9. 获取管理员信息（公开接口，"关于我"页面用）
exports.getAdminInfo = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, nickname, avatar, create_time FROM user WHERE role = 'admin' LIMIT 1",
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "未找到管理员信息" });
    }

    res.json({
      code: 200,
      message: "获取成功",
      data: users[0],
    });
  } catch (error) {
    console.error("获取管理员信息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 10. 获取用户个人主页信息（需登录）
exports.getUserProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, nickname, avatar, role, bio, create_time FROM user WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    // 统计用户数据
    const [articleCount] = await db.query(
      "SELECT COUNT(*) AS count FROM article WHERE user_id = ?",
      [req.user.id],
    );
    const [commentCount] = await db.query(
      "SELECT COUNT(*) AS count FROM comment WHERE user_id = ?",
      [req.user.id],
    );

    const user = users[0];
    user.article_count = articleCount[0].count;
    user.comment_count = commentCount[0].count;

    res.json({
      code: 200,
      message: "获取成功",
      data: user,
    });
  } catch (error) {
    console.error("获取用户主页信息错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 11. 获取用户发布的文章列表（需登录）
exports.getUserArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const [countResult] = await db.query(
      "SELECT COUNT(*) AS total FROM article WHERE user_id = ?",
      [req.user.id],
    );

    const sql = `
      SELECT a.id, a.title, a.description, a.cover, a.view_count, a.like_count, a.status, a.create_time,
             c.name AS category_name
      FROM article a
      LEFT JOIN category c ON a.category_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.create_time DESC
      LIMIT ? OFFSET ?
    `;
    const [articles] = await db.query(sql, [req.user.id, pageSize, offset]);

    res.json({
      code: 200,
      message: "获取成功",
      data: {
        list: articles,
        total: countResult[0].total,
        page: page,
        pageSize: pageSize,
      },
    });
  } catch (error) {
    console.error("获取用户文章错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 12. 获取用户的评论列表（需登录）
exports.getUserComments = async (req, res) => {
  try {
    const sql = `
      SELECT c.id, c.content, c.create_time,
             a.title AS article_title, a.id AS article_id
      FROM comment c
      LEFT JOIN article a ON c.article_id = a.id
      WHERE c.user_id = ?
      ORDER BY c.create_time DESC
      LIMIT 50
    `;
    const [comments] = await db.query(sql, [req.user.id]);

    res.json({
      code: 200,
      message: "获取成功",
      data: comments,
    });
  } catch (error) {
    console.error("获取用户评论错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 13. 修改个人资料（需登录）
exports.updateProfile = async (req, res) => {
  const { nickname, bio } = req.body;

  if (!nickname) {
    return res.status(400).json({ code: 400, message: "昵称不能为空" });
  }

  try {
    await db.query("UPDATE user SET nickname = ?, bio = ? WHERE id = ?", [
      nickname,
      bio || "",
      req.user.id,
    ]);

    res.json({ code: 200, message: "资料更新成功" });
  } catch (error) {
    console.error("更新个人资料错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
// 14. 上传头像（需登录）
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: "请选择图片" });
    }

    const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    await db.query("UPDATE user SET avatar = ? WHERE id = ?", [
      avatarUrl,
      req.user.id,
    ]);

    res.json({
      code: 200,
      message: "头像更新成功",
      data: { avatar: avatarUrl },
    });
  } catch (error) {
    console.error("上传头像错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 15. 修改密码（需登录）
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 400, message: "请输入原密码和新密码" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ code: 400, message: "新密码不能少于6位" });
  }

  try {
    const [users] = await db.query("SELECT password FROM user WHERE id = ?", [
      req.user.id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: "原密码错误" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE user SET password = ? WHERE id = ?", [
      hashed,
      req.user.id,
    ]);

    res.json({ code: 200, message: "密码修改成功" });
  } catch (error) {
    console.error("修改密码错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
