package middleware

import (
	"strings"
	"time"

	"gloo-gallon/internal/config"
	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint        `json:"user_id"`
	Email  string      `json:"email"`
	Role   models.Role `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(cfg *config.Config, user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(cfg.JWTExpiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func GenerateRefreshToken(cfg *config.Config, user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(cfg.JWTRefreshExpiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ParseToken(cfg *config.Config, tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

func AuthRequired(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing authorization header"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid authorization format"})
		}

		claims, err := ParseToken(cfg, parts[1])
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

func AdminOnly() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("userRole").(models.Role)
		if !ok || role != models.RoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Admin access required"})
		}
		return c.Next()
	}
}

func CustomerOnly() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("userRole").(models.Role)
		if !ok || role != models.RoleCustomer {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Customer access required"})
		}
		return c.Next()
	}
}
