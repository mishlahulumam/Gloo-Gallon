package models

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusConfirmed  OrderStatus = "confirmed"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusDelivering OrderStatus = "delivering"
	OrderStatusDelivered  OrderStatus = "delivered"
	OrderStatusCompleted  OrderStatus = "completed"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "pending"
	PaymentStatusPaid    PaymentStatus = "paid"
	PaymentStatusFailed  PaymentStatus = "failed"
	PaymentStatusExpired PaymentStatus = "expired"
	PaymentStatusRefund  PaymentStatus = "refund"
)

type Order struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	CustomerID    uint           `gorm:"index;not null" json:"customer_id"`
	AddressID     uint           `gorm:"not null" json:"address_id"`
	Status        OrderStatus    `gorm:"size:30;not null;default:'pending'" json:"status"`
	PaymentStatus PaymentStatus  `gorm:"size:30;not null;default:'pending'" json:"payment_status"`
	TotalAmount   float64        `gorm:"type:decimal(12,2);not null" json:"total_amount"`
	Notes         string         `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	Customer   User        `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Address    Address     `gorm:"foreignKey:AddressID" json:"address,omitempty"`
	Items      []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	Payment    *Payment    `gorm:"foreignKey:OrderID" json:"payment,omitempty"`
	Delivery   *Delivery   `gorm:"foreignKey:OrderID" json:"delivery,omitempty"`
}

type OrderItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	OrderID   uint    `gorm:"index;not null" json:"order_id"`
	ProductID uint    `gorm:"not null" json:"product_id"`
	Qty       int     `gorm:"not null" json:"qty"`
	UnitPrice float64 `gorm:"type:decimal(12,2);not null" json:"unit_price"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type CreateOrderRequest struct {
	AddressID uint               `json:"address_id" validate:"required"`
	Items     []OrderItemRequest `json:"items" validate:"required,min=1"`
	Notes     string             `json:"notes"`
}

type OrderItemRequest struct {
	ProductID uint `json:"product_id" validate:"required"`
	Qty       int  `json:"qty" validate:"required,gt=0"`
}

type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" validate:"required"`
}
