package handlers

import (
	"errors"
	"strconv"
	"time"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DeliveryHandler struct {
	DB *gorm.DB
}

func (h *DeliveryHandler) GetAll(c *fiber.Ctx) error {
	q := h.DB.Model(&models.Delivery{}).
		Preload("Order").
		Preload("Order.Customer").
		Preload("Driver")

	if s := c.Query("status"); s != "" {
		q = q.Where("status = ?", models.DeliveryStatus(s))
	}

	if dateStr := c.Query("date"); dateStr != "" {
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid date format, use YYYY-MM-DD"})
		}
		start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		end := start.Add(24 * time.Hour)
		q = q.Where("deliveries.created_at >= ? AND deliveries.created_at < ?", start, end)
	}

	var deliveries []models.Delivery
	if err := q.Order("deliveries.id DESC").Find(&deliveries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list deliveries"})
	}

	return c.JSON(fiber.Map{"data": deliveries})
}

func (h *DeliveryHandler) Assign(c *fiber.Ctx) error {
	var req models.AssignDeliveryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var order models.Order
	if err := h.DB.First(&order, req.OrderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	var existing int64
	if err := h.DB.Model(&models.Delivery{}).Where("order_id = ?", req.OrderID).Count(&existing).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check delivery"})
	}
	if existing > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Order already has a delivery assigned"})
	}

	var driver models.Driver
	if err := h.DB.First(&driver, req.DriverID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Driver not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load driver"})
	}

	delivery := models.Delivery{
		OrderID:     req.OrderID,
		DriverID:    req.DriverID,
		Status:      models.DeliveryStatusAssigned,
		ScheduledAt: req.ScheduledAt,
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&delivery).Error; err != nil {
			return err
		}
		return tx.Model(&models.Order{}).Where("id = ?", req.OrderID).Update("status", models.OrderStatusProcessing).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign delivery"})
	}

	if err := h.DB.Preload("Order").Preload("Order.Customer").Preload("Driver").First(&delivery, delivery.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load delivery"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": delivery})
}

func (h *DeliveryHandler) UpdateStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid delivery ID"})
	}

	var req models.UpdateDeliveryStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var delivery models.Delivery
	if err := h.DB.First(&delivery, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Delivery not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load delivery"})
	}

	delivery.Status = req.Status
	if req.Status == models.DeliveryStatusDelivered {
		now := time.Now()
		delivery.DeliveredAt = &now
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&delivery).Error; err != nil {
			return err
		}
		if req.Status == models.DeliveryStatusDelivered {
			return tx.Model(&models.Order{}).Where("id = ?", delivery.OrderID).Update("status", models.OrderStatusDelivered).Error
		}
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update delivery"})
	}

	if err := h.DB.Preload("Order").Preload("Order.Customer").Preload("Driver").First(&delivery, delivery.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load delivery"})
	}

	return c.JSON(fiber.Map{"data": delivery})
}
