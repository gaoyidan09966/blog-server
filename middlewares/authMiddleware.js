const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // 从请求头获取 Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // 斩断前缀，只拿纯 token

  if (!token) {
    return res
      .status(401)
      .json({ code: 401, message: "拒绝访问：无权限访问此接口（未登录）" });
  }

  try {
    // 校验 token 是否合法或过期
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 把解密出来的用户信息挂载到请求对象 req 上
    // 这样后续的路由/控制器就可以直接通过 req.user 拿到当前登录者是谁
    req.user = decoded;

    next(); // 放行，进入下一个关卡（控制器）
  } catch (error) {
    return res
      .status(403)
      .json({ code: 403, message: "权限失效：Token 已过期或不合法" });
  }
};
