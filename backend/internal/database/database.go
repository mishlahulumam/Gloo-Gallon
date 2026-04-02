package database

import (
	"fmt"
	"log"

	"gloo-gallon/internal/config"
	"gloo-gallon/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) *gorm.DB {
	logLevel := logger.Silent
	if cfg.AppEnv == "development" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connected successfully")
	return db
}

func Migrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.User{},
		&models.Address{},
		&models.Product{},
		&models.Stock{},
		&models.StockLog{},
		&models.Order{},
		&models.OrderItem{},
		&models.Driver{},
		&models.Delivery{},
		&models.Payment{},
		&models.GallonLoan{},
		&models.Subscription{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	fmt.Println("Database migrated successfully")
}
