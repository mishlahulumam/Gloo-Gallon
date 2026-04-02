package handlers

import (
	"errors"
	"strconv"

	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type AddressHandler struct {
	DB *gorm.DB
}

func (h *AddressHandler) GetMyAddresses(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var addresses []models.Address
	if err := h.DB.Where("user_id = ?", userID).Order("is_default DESC, id ASC").Find(&addresses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list addresses"})
	}

	return c.JSON(fiber.Map{"data": addresses})
}

func (h *AddressHandler) Create(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.CreateAddressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Label == "" || req.FullAddress == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "label and full_address are required"})
	}

	addr := models.Address{
		UserID:      userID,
		Label:       req.Label,
		FullAddress: req.FullAddress,
		Lat:         req.Lat,
		Lng:         req.Lng,
		IsDefault:   req.IsDefault,
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if req.IsDefault {
			if err := tx.Model(&models.Address{}).Where("user_id = ?", userID).Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(&addr).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create address"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": addr})
}

func (h *AddressHandler) Update(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid address ID"})
	}

	var addr models.Address
	if err := h.DB.First(&addr, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Address not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
	}
	if addr.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Address does not belong to user"})
	}

	var req models.UpdateAddressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates := map[string]interface{}{}
	if req.Label != "" {
		updates["label"] = req.Label
	}
	if req.FullAddress != "" {
		updates["full_address"] = req.FullAddress
	}
	if req.Lat != nil {
		updates["lat"] = req.Lat
	}
	if req.Lng != nil {
		updates["lng"] = req.Lng
	}
	if req.IsDefault != nil {
		if *req.IsDefault {
			if err := h.DB.Transaction(func(tx *gorm.DB) error {
				if err := tx.Model(&models.Address{}).Where("user_id = ?", userID).Update("is_default", false).Error; err != nil {
					return err
				}
				updates["is_default"] = true
				return tx.Model(&addr).Updates(updates).Error
			}); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update address"})
			}
			if err := h.DB.First(&addr, addr.ID).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
			}
			return c.JSON(fiber.Map{"data": addr})
		}
		updates["is_default"] = false
	}

	if len(updates) == 0 {
		return c.JSON(fiber.Map{"data": addr})
	}

	if err := h.DB.Model(&addr).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update address"})
	}

	if err := h.DB.First(&addr, addr.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
	}

	return c.JSON(fiber.Map{"data": addr})
}

func (h *AddressHandler) Delete(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid address ID"})
	}

	var addr models.Address
	if err := h.DB.First(&addr, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Address not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
	}
	if addr.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Address does not belong to user"})
	}

	if err := h.DB.Delete(&addr).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete address"})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"message": "Address deleted"}})
}

func (h *AddressHandler) SetDefault(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid address ID"})
	}

	var addr models.Address
	if err := h.DB.First(&addr, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Address not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load address"})
	}
	if addr.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Address does not belong to user"})
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Address{}).Where("user_id = ?", userID).Update("is_default", false).Error; err != nil {
			return err
		}
		return tx.Model(&addr).Update("is_default", true).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to set default address"})
	}

	addr.IsDefault = true
	return c.JSON(fiber.Map{"data": addr})
}
