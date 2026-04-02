package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type GallonLoanHandler struct {
	DB *gorm.DB
}

func (h *GallonLoanHandler) GetAll(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.GallonLoan{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count gallon loans"})
	}

	var loans []models.GallonLoan
	if err := h.DB.Preload("Customer").Preload("Product").
		Order("id DESC").Limit(q.Limit).Offset(offset).Find(&loans).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list gallon loans"})
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
			Data:       loans,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *GallonLoanHandler) GetByCustomer(c *fiber.Ctx) error {
	customerID, err := strconv.ParseUint(c.Params("customerId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid customer ID"})
	}

	var loans []models.GallonLoan
	if err := h.DB.Where("customer_id = ?", uint(customerID)).Preload("Product").
		Order("id DESC").Find(&loans).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list gallon loans"})
	}

	return c.JSON(fiber.Map{"data": loans})
}

func (h *GallonLoanHandler) UpdateReturn(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid loan ID"})
	}

	var req models.UpdateGallonLoanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.ReturnedQty <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "returned_qty must be positive"})
	}

	var loan models.GallonLoan
	if err := h.DB.First(&loan, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Gallon loan not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load gallon loan"})
	}

	newReturned := loan.ReturnedQty + req.ReturnedQty
	if newReturned > loan.LoanedQty {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Returned quantity cannot exceed loaned quantity"})
	}

	outstandingBefore := loan.LoanedQty - loan.ReturnedQty
	fullReturn := newReturned >= loan.LoanedQty

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&loan).Update("returned_qty", newReturned).Error; err != nil {
			return err
		}
		if fullReturn {
			var stock models.Stock
			if err := tx.Where("product_id = ?", loan.ProductID).First(&stock).Error; err != nil {
				return err
			}
			dec := outstandingBefore
			if dec < 0 {
				dec = 0
			}
			newBorrowed := stock.BorrowedQty - dec
			if newBorrowed < 0 {
				newBorrowed = 0
			}
			if err := tx.Model(&stock).Update("borrowed_qty", newBorrowed).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Stock not found for product"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update gallon loan"})
	}

	loan.ReturnedQty = newReturned
	if err := h.DB.Preload("Customer").Preload("Product").First(&loan, loan.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load gallon loan"})
	}

	return c.JSON(fiber.Map{"data": loan})
}
