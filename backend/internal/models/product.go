package models

import (
	"time"

	"gorm.io/gorm"
)

type Product struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"size:255;not null" json:"name"`
	Brand        string         `gorm:"size:255" json:"brand"`
	Price        float64        `gorm:"type:decimal(12,2);not null" json:"price"`
	DepositPrice float64        `gorm:"type:decimal(12,2);default:0" json:"deposit_price"`
	ImageURL     string         `gorm:"size:500" json:"image_url"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Stock *Stock `gorm:"foreignKey:ProductID" json:"stock,omitempty"`
}

type CreateProductRequest struct {
	Name         string  `json:"name" validate:"required"`
	Brand        string  `json:"brand"`
	Price        float64 `json:"price" validate:"required,gt=0"`
	DepositPrice float64 `json:"deposit_price"`
	ImageURL     string  `json:"image_url"`
}

type UpdateProductRequest struct {
	Name         *string  `json:"name"`
	Brand        *string  `json:"brand"`
	Price        *float64 `json:"price"`
	DepositPrice *float64 `json:"deposit_price"`
	ImageURL     *string  `json:"image_url"`
	IsActive     *bool    `json:"is_active"`
}
