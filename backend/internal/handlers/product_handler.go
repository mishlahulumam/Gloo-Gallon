package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ProductHandler struct {
	DB *gorm.DB
}

func (h *ProductHandler) GetAll(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.Product{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count products"})
	}

	var products []models.Product
	if err := h.DB.Preload("Stock").Order("id DESC").Limit(q.Limit).Offset(offset).Find(&products).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list products"})
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
			Data:       products,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var product models.Product
	if err := h.DB.Preload("Stock").First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
	}

	return c.JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
	var req models.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Name == "" || req.Price <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and positive price are required"})
	}

	product := models.Product{
		Name:         req.Name,
		Brand:        req.Brand,
		Price:        req.Price,
		DepositPrice: req.DepositPrice,
		ImageURL:     req.ImageURL,
		IsActive:     true,
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&product).Error; err != nil {
			return err
		}
		stock := models.Stock{
			ProductID: product.ID,
			FullQty:   0,
			EmptyQty:  0,
		}
		return tx.Create(&stock).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create product"})
	}

	if err := h.DB.Preload("Stock").First(&product, product.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var product models.Product
	if err := h.DB.First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
	}

	var req models.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Brand != nil {
		updates["brand"] = *req.Brand
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.DepositPrice != nil {
		updates["deposit_price"] = *req.DepositPrice
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) == 0 {
		if err := h.DB.Preload("Stock").First(&product, product.ID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
		}
		return c.JSON(fiber.Map{"data": product})
	}

	if err := h.DB.Model(&product).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update product"})
	}

	if err := h.DB.Preload("Stock").First(&product, product.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load product"})
	}

	return c.JSON(fiber.Map{"data": product})
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	res := h.DB.Delete(&models.Product{}, uint(id))
	if res.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete product"})
	}
	if res.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"message": "Product deleted"}})
}
