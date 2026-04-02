package handlers

import (
	"errors"
	"strings"

	"gloo-gallon/internal/config"
	"gloo-gallon/internal/middleware"
	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

type refreshTokenBody struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email and password are required"})
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sign in"})
	}
	if !user.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Account is disabled"})
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	token, err := middleware.GenerateToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue token"})
	}
	refresh, err := middleware.GenerateRefreshToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue refresh token"})
	}

	return c.JSON(fiber.Map{
		"data": models.AuthResponse{
			Token:        token,
			RefreshToken: refresh,
			User:         user,
		},
	})
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name, email, and password are required"})
	}
	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}

	var existing models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email is already registered"})
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check email"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user := models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
		Phone:        strings.TrimSpace(req.Phone),
		Role:         models.RoleCustomer,
		IsActive:     true,
	}
	if err := h.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create account"})
	}

	token, err := middleware.GenerateToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue token"})
	}
	refresh, err := middleware.GenerateRefreshToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue refresh token"})
	}

	return c.JSON(fiber.Map{
		"data": models.AuthResponse{
			Token:        token,
			RefreshToken: refresh,
			User:         user,
		},
	})
}

func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var body refreshTokenBody
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	body.RefreshToken = strings.TrimSpace(body.RefreshToken)
	if body.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "refresh_token is required"})
	}

	claims, err := middleware.ParseToken(h.Cfg, body.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired refresh token"})
	}

	var user models.User
	if err := h.DB.First(&user, claims.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load user"})
	}
	if !user.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Account is disabled"})
	}

	token, err := middleware.GenerateToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue token"})
	}
	refresh, err := middleware.GenerateRefreshToken(h.Cfg, &user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to issue refresh token"})
	}

	return c.JSON(fiber.Map{
		"data": models.AuthResponse{
			Token:        token,
			RefreshToken: refresh,
			User:         user,
		},
	})
}

func (h *AuthHandler) parseUserID(c *fiber.Ctx) (uint, bool) {
	v := c.Locals("userID")
	if v == nil {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		return 0, false
	}
	id, ok := v.(uint)
	if !ok {
		_ = c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		return 0, false
	}
	return id, true
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	userID, ok := h.parseUserID(c)
	if !ok {
		return nil
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load profile"})
	}

	return c.JSON(fiber.Map{"data": user})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := h.parseUserID(c)
	if !ok {
		return nil
	}

	var req models.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load user"})
	}

	if n := strings.TrimSpace(req.Name); n != "" {
		user.Name = n
	}
	user.Phone = strings.TrimSpace(req.Phone)

	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	return c.JSON(fiber.Map{"data": user})
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID, ok := h.parseUserID(c)
	if !ok {
		return nil
	}

	var req models.ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.OldPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Old and new password are required"})
	}
	if len(req.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 6 characters"})
	}

	var user models.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load user"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Current password is incorrect"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}
	user.PasswordHash = string(hash)
	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"message": "Password updated successfully"}})
}
