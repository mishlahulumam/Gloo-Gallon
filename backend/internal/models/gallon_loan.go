package models

import "time"

type GallonLoan struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CustomerID  uint      `gorm:"index;not null" json:"customer_id"`
	ProductID   uint      `gorm:"index;not null" json:"product_id"`
	LoanedQty   int       `gorm:"not null;default:0" json:"loaned_qty"`
	ReturnedQty int       `gorm:"not null;default:0" json:"returned_qty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Customer User    `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Product  Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type UpdateGallonLoanRequest struct {
	ReturnedQty int `json:"returned_qty" validate:"required,gt=0"`
}
