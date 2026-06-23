const db = require("../config/db");

// 1. 获取轮播图列表（前台公开，只返回启用的）
exports.getActiveBanners = async (req, res) => {
  try {
    const [banners] = await db.query(
      "SELECT * FROM banner WHERE status = 1 ORDER BY sort_order DESC, create_time DESC",
    );
    res.json({ code: 200, message: "获取成功", data: banners });
  } catch (error) {
    console.error("获取轮播图错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 2. 获取所有轮播图（管理端，含禁用的）
exports.getAllBanners = async (req, res) => {
  try {
    const [banners] = await db.query(
      "SELECT * FROM banner ORDER BY sort_order DESC, create_time DESC",
    );
    res.json({ code: 200, message: "获取成功", data: banners });
  } catch (error) {
    console.error("获取轮播图列表错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 3. 获取单条轮播图
exports.getBannerById = async (req, res) => {
  const { id } = req.params;
  try {
    const [banners] = await db.query("SELECT * FROM banner WHERE id = ?", [id]);
    if (banners.length === 0) {
      return res.status(404).json({ code: 404, message: "轮播图不存在" });
    }
    res.json({ code: 200, message: "获取成功", data: banners[0] });
  } catch (error) {
    console.error("获取轮播图详情错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 4. 新增轮播图
exports.createBanner = async (req, res) => {
  const { title, subtitle, media_url, media_type, link, sort_order, status } =
    req.body;

  if (!media_url) {
    return res.status(400).json({ code: 400, message: "媒体地址不能为空" });
  }

  try {
    await db.query(
      "INSERT INTO banner (title, subtitle, media_url, media_type, link, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        title || "",
        subtitle || "",
        media_url,
        media_type || "image",
        link || "",
        sort_order || 0,
        status !== undefined ? status : 1,
      ],
    );
    res.status(201).json({ code: 201, message: "轮播图创建成功" });
  } catch (error) {
    console.error("创建轮播图错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 5. 修改轮播图
exports.updateBanner = async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, media_url, media_type, link, sort_order, status } =
    req.body;

  try {
    const [result] = await db.query(
      "UPDATE banner SET title = ?, subtitle = ?, media_url = ?, media_type = ?, link = ?, sort_order = ?, status = ? WHERE id = ?",
      [
        title || "",
        subtitle || "",
        media_url,
        media_type || "image",
        link || "",
        sort_order || 0,
        status !== undefined ? status : 1,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "轮播图不存在" });
    }
    res.json({ code: 200, message: "轮播图更新成功" });
  } catch (error) {
    console.error("更新轮播图错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 6. 删除轮播图
exports.deleteBanner = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM banner WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "轮播图不存在" });
    }
    res.json({ code: 200, message: "轮播图删除成功" });
  } catch (error) {
    console.error("删除轮播图错误:", error);
    res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
