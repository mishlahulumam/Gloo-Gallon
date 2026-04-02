package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type CustomerHandler struct {
	DB *gorm.DB
}

func (h *CustomerHandler) GetAll(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.User{}).Where("role = ?", models.RoleCustomer).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count customers"})
	}

	var users []models.User
	if err := h.DB.Where("role = ?", models.RoleCustomer).Order("id DESC").Limit(q.Limit).Offset(offset).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list customers"})
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
			Data:       users,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *CustomerHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid customer ID"})
	}

	var user models.User
	if err := h.DB.Preload("Addresses").Preload("Orders").Where("id = ? AND role = ?", uint(id), models.RoleCustomer).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Customer not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load customer"})
	}

	return c.JSON(fiber.Map{"data": user})
}

func (h *CustomerHandler) GetGallonLoans(c *fiber.Ctx) error {
	customerID, err := strconv.ParseUint(c.Params("customerId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid customer ID"})
	}

	var count int64
	if err := h.DB.Model(&models.User{}).Where("id = ? AND role = ?", uint(customerID), models.RoleCustomer).Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to verify customer"})
	}
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Customer not found"})
	}

	var loans []models.GallonLoan
	if err := h.DB.Preload("Product").Where("customer_id = ?", uint(customerID)).Order("id ASC").Find(&loans).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list gallon loans"})
	}

	return c.JSON(fiber.Map{"data": loans})
}
