package database

import (
	"fmt"
	"log"

	"gloo-gallon/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&count)
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	admin := models.User{
		Name:         "Admin",
		Email:        "admin@gloogallon.com",
		PasswordHash: string(hash),
		Phone:        "08123456789",
		Role:         models.RoleAdmin,
		IsActive:     true,
	}
	db.Create(&admin)

	products := []models.Product{
		{Name: "Galon Aqua", Brand: "Aqua", Price: 20000, DepositPrice: 50000, IsActive: true},
		{Name: "Galon Le Minerale", Brand: "Le Minerale", Price: 18000, DepositPrice: 45000, IsActive: true},
		{Name: "Galon VIT", Brand: "VIT", Price: 15000, DepositPrice: 40000, IsActive: true},
	}
	db.Create(&products)

	for _, p := range products {
		db.Create(&models.Stock{
			ProductID: p.ID,
			FullQty:   50,
			EmptyQty:  20,
		})
	}

	fmt.Println("Database seeded successfully")
}
