package models

import (
	"time"

	"gorm.io/gorm"
)

type Driver struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Phone     string         `gorm:"size:20;not null" json:"phone"`
	Area      string         `gorm:"size:255" json:"area"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateDriverRequest struct {
	Name  string `json:"name" validate:"required"`
	Phone string `json:"phone" validate:"required"`
	Area  string `json:"area"`
}

type UpdateDriverRequest struct {
	Name     *string `json:"name"`
	Phone    *string `json:"phone"`
	Area     *string `json:"area"`
	IsActive *bool   `json:"is_active"`
}
