const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// 管理端路由（固定路径放前面）
router.get(
  "/admin/list",
  authMiddleware,
  adminMiddleware,
  orderController.getAllOrders,
);

// 前台用户路由
router.post("/", authMiddleware, orderController.createOrder);
router.get("/", authMiddleware, orderController.getUserOrders);
router.get("/:id", authMiddleware, orderController.getOrderById);
router.put("/:id/pay", authMiddleware, orderController.payOrder);
router.put("/:id/cancel", authMiddleware, orderController.cancelOrder);
router.delete("/:id", authMiddleware, orderController.deleteOrder);

// 管理端更新状态
router.put(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  orderController.updateOrderStatus,
);

module.exports = router;
