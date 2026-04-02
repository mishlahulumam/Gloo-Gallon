package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	errInsufficientFull     = errors.New("insufficient full qty")
	errInsufficientBorrowed = errors.New("insufficient borrowed qty")
)

type StockHandler struct {
	DB *gorm.DB
}

func (h *StockHandler) GetAll(c *fiber.Ctx) error {
	var stocks []models.Stock
	if err := h.DB.Preload("Product").Order("id ASC").Find(&stocks).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list stocks"})
	}
	return c.JSON(fiber.Map{"data": stocks})
}

func (h *StockHandler) GetByProduct(c *fiber.Ctx) error {
	productID, err := strconv.ParseUint(c.Params("productId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var stock models.Stock
	if err := h.DB.Preload("Product").Where("product_id = ?", uint(productID)).First(&stock).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Stock not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load stock"})
	}

	return c.JSON(fiber.Map{"data": stock})
}

func localsUserID(c *fiber.Ctx) uint {
	v := c.Locals("userID")
	if v == nil {
		return 0
	}
	id, ok := v.(uint)
	if !ok {
		return 0
	}
	return id
}

func (h *StockHandler) UpdateStock(c *fiber.Ctx) error {
	productID, err := strconv.ParseUint(c.Params("productId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var req models.UpdateStockRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Qty <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Quantity must be greater than zero"})
	}
	switch req.Type {
	case "in", "out", "damaged", "returned":
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid stock movement type"})
	}

	createdBy := localsUserID(c)

	var outStock models.Stock
	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		var stock models.Stock
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("product_id = ?", uint(productID)).First(&stock).Error; err != nil {
			return err
		}

		switch req.Type {
		case "in":
			stock.FullQty += req.Qty
		case "out":
			if stock.FullQty < req.Qty {
				return errInsufficientFull
			}
			stock.FullQty -= req.Qty
			stock.BorrowedQty += req.Qty
		case "damaged":
			if stock.FullQty < req.Qty {
				return errInsufficientFull
			}
			stock.FullQty -= req.Qty
		case "returned":
			if stock.BorrowedQty < req.Qty {
				return errInsufficientBorrowed
			}
			stock.EmptyQty += req.Qty
			stock.BorrowedQty -= req.Qty
		}

		if err := tx.Save(&stock).Error; err != nil {
			return err
		}

		log := models.StockLog{
			ProductID: uint(productID),
			Type:      req.Type,
			Qty:       req.Qty,
			Notes:     req.Notes,
			CreatedBy: createdBy,
		}
		if err := tx.Create(&log).Error; err != nil {
			return err
		}

		outStock = stock
		return nil
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Stock not found"})
		}
		if errors.Is(err, errInsufficientFull) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Insufficient full stock"})
		}
		if errors.Is(err, errInsufficientBorrowed) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Insufficient borrowed quantity"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update stock"})
	}

	if err := h.DB.Preload("Product").First(&outStock, outStock.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load stock"})
	}

	return c.JSON(fiber.Map{"data": outStock})
}

func (h *StockHandler) GetLogs(c *fiber.Ctx) error {
	productID, err := strconv.ParseUint(c.Params("productId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.StockLog{}).Where("product_id = ?", uint(productID)).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count logs"})
	}

	var logs []models.StockLog
	if err := h.DB.Where("product_id = ?", uint(productID)).Order("created_at DESC").Limit(q.Limit).Offset(offset).Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list logs"})
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
			Data:       logs,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}
