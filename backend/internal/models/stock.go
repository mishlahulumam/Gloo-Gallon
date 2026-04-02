package models

import "time"

type Stock struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProductID   uint      `gorm:"uniqueIndex;not null" json:"product_id"`
	FullQty     int       `gorm:"default:0" json:"full_qty"`
	EmptyQty    int       `gorm:"default:0" json:"empty_qty"`
	BorrowedQty int       `gorm:"default:0" json:"borrowed_qty"`
	UpdatedAt   time.Time `json:"updated_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type StockLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProductID uint      `gorm:"index;not null" json:"product_id"`
	Type      string    `gorm:"size:20;not null" json:"type"` // in, out, damaged, returned
	Qty       int       `gorm:"not null" json:"qty"`
	Notes     string    `gorm:"type:text" json:"notes"`
	CreatedBy uint      `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type UpdateStockRequest struct {
	Type  string `json:"type" validate:"required,oneof=in out damaged returned"`
	Qty   int    `json:"qty" validate:"required,gt=0"`
	Notes string `json:"notes"`
}
