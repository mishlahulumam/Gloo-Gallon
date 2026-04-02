package handlers

import (
	"errors"
	"strconv"
	"time"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SubscriptionHandler struct {
	DB *gorm.DB
}

func (h *SubscriptionHandler) GetMySubscriptions(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var subs []models.Subscription
	if err := h.DB.Where("customer_id = ?", customerID).Preload("Product").Preload("Address").
		Order("id DESC").Find(&subs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list subscriptions"})
	}

	return c.JSON(fiber.Map{"data": subs})
}

func (h *SubscriptionHandler) Create(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.ProductID == 0 || req.AddressID == 0 || req.Qty <= 0 || req.IntervalDays <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid subscription fields"})
	}

	var addr models.Address
	if err := h.DB.First(&addr, req.AddressID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Address not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
	}
	if addr.UserID != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Address does not belong to user"})
	}

	var product models.Product
	if err := h.DB.First(&product, req.ProductID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
	}
	if !product.IsActive {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Product is not active"})
	}

	sub := models.Subscription{
		CustomerID:   customerID,
		ProductID:    req.ProductID,
		AddressID:    req.AddressID,
		Qty:          req.Qty,
		IntervalDays: req.IntervalDays,
		NextOrderAt:  time.Now().AddDate(0, 0, req.IntervalDays),
		IsActive:     true,
	}

	if err := h.DB.Create(&sub).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create subscription"})
	}

	if err := h.DB.Preload("Product").Preload("Address").First(&sub, sub.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load subscription"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": sub})
}

func (h *SubscriptionHandler) Update(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid subscription ID"})
	}

	var sub models.Subscription
	if err := h.DB.First(&sub, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Subscription not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load subscription"})
	}
	if sub.CustomerID != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Subscription does not belong to user"})
	}

	var req models.UpdateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.AddressID != nil {
		var addr models.Address
		if err := h.DB.First(&addr, *req.AddressID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Address not found"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
		}
		if addr.UserID != customerID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Address does not belong to user"})
		}
	}

	updates := map[string]interface{}{}
	if req.Qty != nil {
		if *req.Qty <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "qty must be positive"})
		}
		updates["qty"] = *req.Qty
	}
	if req.IntervalDays != nil {
		if *req.IntervalDays <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "interval_days must be positive"})
		}
		updates["interval_days"] = *req.IntervalDays
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.AddressID != nil {
		updates["address_id"] = *req.AddressID
	}

	if len(updates) == 0 {
		if err := h.DB.Preload("Product").Preload("Address").First(&sub, sub.ID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load subscription"})
		}
		return c.JSON(fiber.Map{"data": sub})
	}

	if err := h.DB.Model(&sub).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update subscription"})
	}

	if err := h.DB.Preload("Product").Preload("Address").First(&sub, sub.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load subscription"})
	}

	return c.JSON(fiber.Map{"data": sub})
}

func (h *SubscriptionHandler) Cancel(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid subscription ID"})
	}

	var sub models.Subscription
	if err := h.DB.First(&sub, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Subscription not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load subscription"})
	}
	if sub.CustomerID != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Subscription does not belong to user"})
	}

	if err := h.DB.Model(&sub).Update("is_active", false).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to cancel subscription"})
	}

	sub.IsActive = false
	return c.JSON(fiber.Map{"data": sub})
}

func (h *SubscriptionHandler) GetAll(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.Subscription{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count subscriptions"})
	}

	var subs []models.Subscription
	if err := h.DB.Preload("Customer").Preload("Product").
		Order("id DESC").Limit(q.Limit).Offset(offset).Find(&subs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list subscriptions"})
	}

	totalPages := int(total) / q.Limit
	if int(total)%q.Limit != 0 {
		totalPages++
	}
	if totalPages == 0 && total > 0 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"data": models.PaginatedResponse{
			Data:       subs,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}
