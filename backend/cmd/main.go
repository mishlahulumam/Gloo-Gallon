package main

import (
	"fmt"
	"log"

	"gloo-gallon/internal/config"
	"gloo-gallon/internal/database"
	"gloo-gallon/internal/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	cfg := config.Load()
	db := database.Connect(cfg)

	database.Migrate(db)
	database.Seed(db)

	app := fiber.New(fiber.Config{
		AppName:      "Gloo-Gallon API",
		ErrorHandler: customErrorHandler,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		AllowCredentials: true,
	}))

	routes.Setup(app, db, cfg)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "app": "Gloo-Gallon API"})
	})

	addr := fmt.Sprintf(":%s", cfg.AppPort)
	log.Printf("Server starting on %s", addr)
	log.Fatal(app.Listen(addr))
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}
