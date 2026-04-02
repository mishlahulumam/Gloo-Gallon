package handlers

import (
	"time"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	DB *gorm.DB
}

func (h *DashboardHandler) GetStats(c *fiber.Ctx) error {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var stats models.DashboardStats

	if err := h.DB.Model(&models.Order{}).
		Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).
		Count(&stats.TodayOrders).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load today orders"})
	}

	if err := h.DB.Model(&models.Order{}).
		Where("status = ?", models.OrderStatusPending).
		Count(&stats.PendingOrders).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load pending orders"})
	}

	var todayRevenue struct {
		Sum float64
	}
	if err := h.DB.Model(&models.Order{}).
		Select("COALESCE(SUM(total_amount), 0) AS sum").
		Where("payment_status = ? AND created_at >= ? AND created_at < ?", models.PaymentStatusPaid, startOfDay, endOfDay).
		Scan(&todayRevenue).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load today revenue"})
	}
	stats.TodayRevenue = todayRevenue.Sum

	var monthRevenue struct {
		Sum float64
	}
	if err := h.DB.Model(&models.Order{}).
		Select("COALESCE(SUM(total_amount), 0) AS sum").
		Where("payment_status = ? AND created_at >= ?", models.PaymentStatusPaid, startOfMonth).
		Scan(&monthRevenue).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load month revenue"})
	}
	stats.MonthRevenue = monthRevenue.Sum

	if err := h.DB.Model(&models.User{}).
		Where("role = ?", models.RoleCustomer).
		Count(&stats.TotalCustomers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count customers"})
	}

	if err := h.DB.Model(&models.Product{}).
		Where("is_active = ?", true).
		Count(&stats.ActiveProducts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count active products"})
	}

	if err := h.DB.Model(&models.Stock{}).
		Joins("JOIN products ON products.id = stocks.product_id AND products.deleted_at IS NULL").
		Where("stocks.full_qty < ?", 10).
		Count(&stats.LowStockProducts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count low stock"})
	}

	var borrowed struct {
		Sum int64
	}
	if err := h.DB.Model(&models.Stock{}).
		Select("COALESCE(SUM(borrowed_qty), 0) AS sum").
		Scan(&borrowed).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sum borrowed gallons"})
	}
	stats.BorrowedGallons = borrowed.Sum

	return c.JSON(fiber.Map{"data": stats})
}
