package models

import "time"

type DeliveryStatus string

const (
	DeliveryStatusAssigned  DeliveryStatus = "assigned"
	DeliveryStatusPickedUp  DeliveryStatus = "picked_up"
	DeliveryStatusOnTheWay  DeliveryStatus = "on_the_way"
	DeliveryStatusDelivered DeliveryStatus = "delivered"
)

type Delivery struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	OrderID     uint           `gorm:"index;not null" json:"order_id"`
	DriverID    uint           `gorm:"index;not null" json:"driver_id"`
	Status      DeliveryStatus `gorm:"size:30;not null;default:'assigned'" json:"status"`
	ScheduledAt *time.Time     `json:"scheduled_at"`
	DeliveredAt *time.Time     `json:"delivered_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`

	Order  Order  `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	Driver Driver `gorm:"foreignKey:DriverID" json:"driver,omitempty"`
}

type AssignDeliveryRequest struct {
	OrderID     uint       `json:"order_id" validate:"required"`
	DriverID    uint       `json:"driver_id" validate:"required"`
	ScheduledAt *time.Time `json:"scheduled_at"`
}

type UpdateDeliveryStatusRequest struct {
	Status DeliveryStatus `json:"status" validate:"required"`
}
