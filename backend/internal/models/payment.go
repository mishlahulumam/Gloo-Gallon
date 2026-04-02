package models

import "time"

type PaymentMethod string

const (
	PaymentMethodMidtrans PaymentMethod = "midtrans"
	PaymentMethodCash     PaymentMethod = "cash"
	PaymentMethodTransfer PaymentMethod = "transfer"
)

type Payment struct {
	ID                uint          `gorm:"primaryKey" json:"id"`
	OrderID           uint          `gorm:"index;not null" json:"order_id"`
	Method            PaymentMethod `gorm:"size:30;not null" json:"method"`
	Amount            float64       `gorm:"type:decimal(12,2);not null" json:"amount"`
	Status            PaymentStatus `gorm:"size:30;not null;default:'pending'" json:"status"`
	MidtransOrderID   string        `gorm:"size:255" json:"midtrans_order_id,omitempty"`
	MidtransSnapToken string        `gorm:"size:500" json:"midtrans_snap_token,omitempty"`
	PaidAt            *time.Time    `json:"paid_at"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`

	Order Order `gorm:"foreignKey:OrderID" json:"order,omitempty"`
}

type InitiatePaymentRequest struct {
	OrderID uint          `json:"order_id" validate:"required"`
	Method  PaymentMethod `json:"method" validate:"required"`
}
