module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      code: 403,
      message: "权限不足，请使用管理员账号登录",
    });
  }
  next();
};
