package models

import "time"

type Subscription struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CustomerID  uint      `gorm:"index;not null" json:"customer_id"`
	ProductID   uint      `gorm:"not null" json:"product_id"`
	AddressID   uint      `gorm:"not null" json:"address_id"`
	Qty         int       `gorm:"not null;default:1" json:"qty"`
	IntervalDays int      `gorm:"not null;default:7" json:"interval_days"`
	NextOrderAt time.Time `json:"next_order_at"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Customer User    `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Product  Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Address  Address `gorm:"foreignKey:AddressID" json:"address,omitempty"`
}

type CreateSubscriptionRequest struct {
	ProductID    uint `json:"product_id" validate:"required"`
	AddressID    uint `json:"address_id" validate:"required"`
	Qty          int  `json:"qty" validate:"required,gt=0"`
	IntervalDays int  `json:"interval_days" validate:"required,gt=0"`
}

type UpdateSubscriptionRequest struct {
	Qty          *int  `json:"qty"`
	IntervalDays *int  `json:"interval_days"`
	IsActive     *bool `json:"is_active"`
	AddressID    *uint `json:"address_id"`
}
