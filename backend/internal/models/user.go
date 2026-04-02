package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin    Role = "admin"
	RoleCustomer Role = "customer"
)

type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"size:255;not null" json:"name"`
	Email        string         `gorm:"size:255;uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"size:255;not null" json:"-"`
	Phone        string         `gorm:"size:20" json:"phone"`
	Role         Role           `gorm:"size:20;not null;default:'customer'" json:"role"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Addresses     []Address      `gorm:"foreignKey:UserID" json:"addresses,omitempty"`
	Orders        []Order        `gorm:"foreignKey:CustomerID" json:"orders,omitempty"`
	GallonLoans   []GallonLoan   `gorm:"foreignKey:CustomerID" json:"gallon_loans,omitempty"`
	Subscriptions []Subscription `gorm:"foreignKey:CustomerID" json:"subscriptions,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Phone    string `json:"phone"`
}

type AuthResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=6"`
}
