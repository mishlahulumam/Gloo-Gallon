package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type OrderHandler struct {
	DB *gorm.DB
}

func (h *OrderHandler) GetAll(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	qb := h.DB.Model(&models.Order{})
	if st := c.Query("status"); st != "" {
		qb = qb.Where("status = ?", st)
	}

	var total int64
	if err := qb.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count orders"})
	}

	var orders []models.Order
	if err := qb.Preload("Customer").Preload("Items").Preload("Items.Product").
		Preload("Address").Preload("Payment").
		Order("id DESC").Limit(q.Limit).Offset(offset).Find(&orders).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list orders"})
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
			Data:       orders,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *OrderHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	var order models.Order
	if err := h.DB.Preload("Customer").Preload("Items").Preload("Items.Product").
		Preload("Address").Preload("Payment").Preload("Delivery").Preload("Delivery.Driver").
		First(&order, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	return c.JSON(fiber.Map{"data": order})
}

func (h *OrderHandler) GetMyOrders(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	qb := h.DB.Model(&models.Order{}).Where("customer_id = ?", customerID)

	var total int64
	if err := qb.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count orders"})
	}

	var orders []models.Order
	if err := qb.Preload("Items").Preload("Items.Product").Preload("Address").Preload("Payment").
		Order("id DESC").Limit(q.Limit).Offset(offset).Find(&orders).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list orders"})
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
			Data:       orders,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *OrderHandler) Create(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.AddressID == 0 || len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "address_id and items are required"})
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

	var order models.Order
	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		var total float64
		items := make([]models.OrderItem, 0, len(req.Items))

		for _, line := range req.Items {
			if line.Qty <= 0 || line.ProductID == 0 {
				return errInvalidOrderItem
			}
			var product models.Product
			if err := tx.First(&product, line.ProductID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errProductNotFound
				}
				return err
			}
			if !product.IsActive {
				return errProductInactive
			}
			unit := product.Price
			total += unit * float64(line.Qty)
			items = append(items, models.OrderItem{
				ProductID: line.ProductID,
				Qty:       line.Qty,
				UnitPrice: unit,
			})
		}

		order = models.Order{
			CustomerID:    customerID,
			AddressID:     req.AddressID,
			Status:        models.OrderStatusPending,
			PaymentStatus: models.PaymentStatusPending,
			TotalAmount:   total,
			Notes:         req.Notes,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		if errors.Is(err, errProductNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
		}
		if errors.Is(err, errProductInactive) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Product is not active"})
		}
		if errors.Is(err, errInvalidOrderItem) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order line item"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create order"})
	}

	if err := h.DB.Preload("Items").Preload("Items.Product").First(&order, order.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": order})
}

var (
	errInvalidOrderItem = errors.New("invalid order item")
	errProductNotFound  = errors.New("product not found")
	errProductInactive  = errors.New("product inactive")
)

func (h *OrderHandler) UpdateStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	var req models.UpdateOrderStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status is required"})
	}

	var order models.Order
	if err := h.DB.First(&order, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	if err := h.DB.Model(&order).Update("status", req.Status).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update order"})
	}

	if err := h.DB.Preload("Customer").Preload("Items").Preload("Items.Product").
		Preload("Address").Preload("Payment").First(&order, order.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	return c.JSON(fiber.Map{"data": order})
}

func (h *OrderHandler) Cancel(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid order ID"})
	}

	var order models.Order
	if err := h.DB.First(&order, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	if order.CustomerID != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Order does not belong to user"})
	}
	if order.Status != models.OrderStatusPending {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Only pending orders can be cancelled"})
	}

	if err := h.DB.Model(&order).Update("status", models.OrderStatusCancelled).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to cancel order"})
	}

	order.Status = models.OrderStatusCancelled
	return c.JSON(fiber.Map{"data": order})
}
