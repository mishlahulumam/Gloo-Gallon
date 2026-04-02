package models

import (
	"time"

	"gorm.io/gorm"
)

type Address struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Label       string         `gorm:"size:100;not null" json:"label"`
	FullAddress string         `gorm:"type:text;not null" json:"full_address"`
	Lat         *float64       `json:"lat"`
	Lng         *float64       `json:"lng"`
	IsDefault   bool           `gorm:"default:false" json:"is_default"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

type CreateAddressRequest struct {
	Label       string   `json:"label" validate:"required"`
	FullAddress string   `json:"full_address" validate:"required"`
	Lat         *float64 `json:"lat"`
	Lng         *float64 `json:"lng"`
	IsDefault   bool     `json:"is_default"`
}

type UpdateAddressRequest struct {
	Label       string   `json:"label"`
	FullAddress string   `json:"full_address"`
	Lat         *float64 `json:"lat"`
	Lng         *float64 `json:"lng"`
	IsDefault   *bool    `json:"is_default"`
}
