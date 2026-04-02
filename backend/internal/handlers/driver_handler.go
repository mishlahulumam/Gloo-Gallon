package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DriverHandler struct {
	DB *gorm.DB
}

func (h *DriverHandler) GetAll(c *fiber.Ctx) error {
	var drivers []models.Driver
	if err := h.DB.Order("name ASC").Find(&drivers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list drivers"})
	}
	return c.JSON(fiber.Map{"data": drivers})
}

func (h *DriverHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid driver ID"})
	}

	var driver models.Driver
	if err := h.DB.First(&driver, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Driver not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load driver"})
	}

	return c.JSON(fiber.Map{"data": driver})
}

func (h *DriverHandler) Create(c *fiber.Ctx) error {
	var req models.CreateDriverRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Name == "" || req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and phone are required"})
	}

	driver := models.Driver{
		Name:     req.Name,
		Phone:    req.Phone,
		Area:     req.Area,
		IsActive: true,
	}
	if err := h.DB.Create(&driver).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create driver"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": driver})
}

func (h *DriverHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid driver ID"})
	}

	var driver models.Driver
	if err := h.DB.First(&driver, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Driver not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load driver"})
	}

	var req models.UpdateDriverRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Area != nil {
		updates["area"] = *req.Area
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) == 0 {
		return c.JSON(fiber.Map{"data": driver})
	}

	if err := h.DB.Model(&driver).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update driver"})
	}

	if err := h.DB.First(&driver, driver.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load driver"})
	}

	return c.JSON(fiber.Map{"data": driver})
}

func (h *DriverHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid driver ID"})
	}

	res := h.DB.Delete(&models.Driver{}, uint(id))
	if res.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete driver"})
	}
	if res.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Driver not found"})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"message": "Driver deleted"}})
}
