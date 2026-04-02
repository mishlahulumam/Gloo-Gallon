package handlers

import (
	"errors"
	"math"
	"strconv"
	"time"

	"gloo-gallon/internal/config"
	"gloo-gallon/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
	"github.com/midtrans/midtrans-go/snap"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

func (h *PaymentHandler) InitiatePayment(c *fiber.Ctx) error {
	customerID, ok := c.Locals("userID").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req models.InitiatePaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.OrderID == 0 || req.Method == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id and method are required"})
	}

	var order models.Order
	if err := h.DB.Preload("Customer").First(&order, req.OrderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Order not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load order"})
	}

	if order.CustomerID != customerID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Order does not belong to user"})
	}

	var existing models.Payment
	if err := h.DB.Where("order_id = ?", order.ID).First(&existing).Error; err == nil {
		if req.Method == models.PaymentMethodMidtrans && existing.Method == models.PaymentMethodMidtrans &&
			existing.Status == models.PaymentStatusPending && existing.MidtransSnapToken != "" {
			return c.JSON(fiber.Map{
				"data": fiber.Map{
					"snap_token":        existing.MidtransSnapToken,
					"order_id":          order.ID,
					"midtrans_order_id": existing.MidtransOrderID,
				},
			})
		}
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Payment already exists for this order"})
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check payment"})
	}

	midtransOrderID := "GLOO-" + strconv.FormatUint(uint64(order.ID), 10) + "-" + strconv.FormatInt(time.Now().Unix(), 10)
	grossAmt := int64(math.Round(order.TotalAmount))

	switch req.Method {
	case models.PaymentMethodMidtrans:
		if h.Cfg.MidtransServerKey == "" {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "Midtrans is not configured"})
		}
		env := midtrans.Sandbox
		if h.Cfg.MidtransIsProduction {
			env = midtrans.Production
		}
		var s snap.Client
		s.New(h.Cfg.MidtransServerKey, env)

		customer := order.Customer
		snapReq := &snap.Request{
			TransactionDetails: midtrans.TransactionDetails{
				OrderID:  midtransOrderID,
				GrossAmt: grossAmt,
			},
			CustomerDetail: &midtrans.CustomerDetails{
				FName: customer.Name,
				Email: customer.Email,
				Phone: customer.Phone,
			},
		}
		snapResp, mErr := s.CreateTransaction(snapReq)
		if mErr != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": mErr.GetMessage()})
		}
		if snapResp == nil || snapResp.Token == "" {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Empty snap token from Midtrans"})
		}

		payment := models.Payment{
			OrderID:           order.ID,
			Method:            models.PaymentMethodMidtrans,
			Amount:            order.TotalAmount,
			Status:            models.PaymentStatusPending,
			MidtransOrderID:   midtransOrderID,
			MidtransSnapToken: snapResp.Token,
		}
		if err := h.DB.Create(&payment).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create payment"})
		}

		return c.JSON(fiber.Map{
			"data": fiber.Map{
				"snap_token":        snapResp.Token,
				"order_id":          order.ID,
				"midtrans_order_id": midtransOrderID,
			},
		})

	case models.PaymentMethodCash, models.PaymentMethodTransfer:
		payment := models.Payment{
			OrderID: order.ID,
			Method:  req.Method,
			Amount:  order.TotalAmount,
			Status:  models.PaymentStatusPending,
		}
		if err := h.DB.Create(&payment).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create payment"})
		}
		return c.JSON(fiber.Map{
			"data": fiber.Map{
				"snap_token": nil,
				"order_id":   order.ID,
			},
		})

	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unsupported payment method"})
	}
}

func (h *PaymentHandler) HandleWebhook(c *fiber.Ctx) error {
	var notif coreapi.TransactionStatusResponse
	if err := c.BodyParser(&notif); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid notification body"})
	}
	if notif.OrderID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id is required"})
	}

	var payment models.Payment
	if err := h.DB.Where("midtrans_order_id = ?", notif.OrderID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Payment not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load payment"})
	}

	now := time.Now()
	ts := notif.TransactionStatus

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		switch ts {
		case "capture", "settlement":
			if ts == "capture" && notif.FraudStatus == "deny" {
				payment.Status = models.PaymentStatusFailed
				if err := tx.Model(&payment).Updates(map[string]interface{}{
					"status": models.PaymentStatusFailed,
				}).Error; err != nil {
					return err
				}
				return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
					Update("payment_status", models.PaymentStatusFailed).Error
			}
			payment.Status = models.PaymentStatusPaid
			payment.PaidAt = &now
			if err := tx.Model(&payment).Updates(map[string]interface{}{
				"status":  models.PaymentStatusPaid,
				"paid_at": now,
			}).Error; err != nil {
				return err
			}
			return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
				Update("payment_status", models.PaymentStatusPaid).Error

		case "deny":
			if err := tx.Model(&payment).Update("status", models.PaymentStatusFailed).Error; err != nil {
				return err
			}
			return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
				Update("payment_status", models.PaymentStatusFailed).Error

		case "cancel":
			if err := tx.Model(&payment).Update("status", models.PaymentStatusFailed).Error; err != nil {
				return err
			}
			return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
				Update("payment_status", models.PaymentStatusFailed).Error

		case "expire":
			if err := tx.Model(&payment).Update("status", models.PaymentStatusExpired).Error; err != nil {
				return err
			}
			return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
				Update("payment_status", models.PaymentStatusExpired).Error

		default:
			return nil
		}
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process webhook"})
	}

	return c.JSON(fiber.Map{"data": fiber.Map{"ok": true}})
}

func (h *PaymentHandler) GetPaymentHistory(c *fiber.Ctx) error {
	var q models.PaginationQuery
	if err := c.QueryParser(&q); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}
	offset := q.GetOffset()

	var total int64
	if err := h.DB.Model(&models.Payment{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count payments"})
	}

	var payments []models.Payment
	if err := h.DB.Preload("Order").Preload("Order.Customer").
		Order("id DESC").Limit(q.Limit).Offset(offset).Find(&payments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list payments"})
	}

	totalPages := int(total) / q.Limit
	if int(total)%q.Limit != 0 {
		totalPages++
	}
	if totalPages == 0 && total > 0 {
		totalPages = 1
	}

	return c.JSON(fiber.Map{
		"data": models.PaginatedResponse{
			Data:       payments,
			Total:      total,
			Page:       q.Page,
			Limit:      q.Limit,
			TotalPages: totalPages,
		},
	})
}

func (h *PaymentHandler) ConfirmManualPayment(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payment ID"})
	}

	var payment models.Payment
	if err := h.DB.First(&payment, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Payment not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load payment"})
	}

	now := time.Now()
	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":  models.PaymentStatusPaid,
			"paid_at": now,
		}).Error; err != nil {
			return err
		}
		return tx.Model(&models.Order{}).Where("id = ?", payment.OrderID).
			Update("payment_status", models.PaymentStatusPaid).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to confirm payment"})
	}

	if err := h.DB.Preload("Order").Preload("Order.Customer").First(&payment, payment.ID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load payment"})
	}

	return c.JSON(fiber.Map{"data": payment})
}
