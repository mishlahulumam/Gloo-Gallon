package routes

import (
	"gloo-gallon/internal/config"
	"gloo-gallon/internal/handlers"
	"gloo-gallon/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	authHandler := &handlers.AuthHandler{DB: db, Cfg: cfg}
	productHandler := &handlers.ProductHandler{DB: db}
	stockHandler := &handlers.StockHandler{DB: db}
	orderHandler := &handlers.OrderHandler{DB: db}
	driverHandler := &handlers.DriverHandler{DB: db}
	deliveryHandler := &handlers.DeliveryHandler{DB: db}
	customerHandler := &handlers.CustomerHandler{DB: db}
	dashboardHandler := &handlers.DashboardHandler{DB: db}
	paymentHandler := &handlers.PaymentHandler{DB: db, Cfg: cfg}
	addressHandler := &handlers.AddressHandler{DB: db}
	subscriptionHandler := &handlers.SubscriptionHandler{DB: db}
	gallonLoanHandler := &handlers.GallonLoanHandler{DB: db}

	api := app.Group("/api")

	// Public routes
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)
	auth.Post("/register", authHandler.Register)
	auth.Post("/refresh", authHandler.RefreshToken)

	// Payment webhook (no auth)
	api.Post("/payments/webhook", paymentHandler.HandleWebhook)

	// Protected routes
	protected := api.Group("", middleware.AuthRequired(cfg))

	// Profile
	protected.Get("/profile", authHandler.GetProfile)
	protected.Put("/profile", authHandler.UpdateProfile)
	protected.Put("/profile/password", authHandler.ChangePassword)

	// Public product listing (authenticated)
	protected.Get("/products", productHandler.GetAll)
	protected.Get("/products/:id", productHandler.GetByID)

	// Customer routes
	customer := protected.Group("/customer", middleware.CustomerOnly())
	customer.Get("/orders", orderHandler.GetMyOrders)
	customer.Post("/orders", orderHandler.Create)
	customer.Put("/orders/:id/cancel", orderHandler.Cancel)
	customer.Get("/orders/:id", orderHandler.GetByID)
	customer.Post("/payments/initiate", paymentHandler.InitiatePayment)
	customer.Get("/addresses", addressHandler.GetMyAddresses)
	customer.Post("/addresses", addressHandler.Create)
	customer.Put("/addresses/:id", addressHandler.Update)
	customer.Delete("/addresses/:id", addressHandler.Delete)
	customer.Put("/addresses/:id/default", addressHandler.SetDefault)
	customer.Get("/subscriptions", subscriptionHandler.GetMySubscriptions)
	customer.Post("/subscriptions", subscriptionHandler.Create)
	customer.Put("/subscriptions/:id", subscriptionHandler.Update)
	customer.Put("/subscriptions/:id/cancel", subscriptionHandler.Cancel)

	// Admin routes
	admin := protected.Group("/admin", middleware.AdminOnly())
	admin.Get("/dashboard", dashboardHandler.GetStats)

	admin.Get("/orders", orderHandler.GetAll)
	admin.Get("/orders/:id", orderHandler.GetByID)
	admin.Put("/orders/:id/status", orderHandler.UpdateStatus)

	admin.Post("/products", productHandler.Create)
	admin.Put("/products/:id", productHandler.Update)
	admin.Delete("/products/:id", productHandler.Delete)

	admin.Get("/stock", stockHandler.GetAll)
	admin.Get("/stock/:productId", stockHandler.GetByProduct)
	admin.Put("/stock/:productId", stockHandler.UpdateStock)
	admin.Get("/stock/:productId/logs", stockHandler.GetLogs)

	admin.Get("/drivers", driverHandler.GetAll)
	admin.Get("/drivers/:id", driverHandler.GetByID)
	admin.Post("/drivers", driverHandler.Create)
	admin.Put("/drivers/:id", driverHandler.Update)
	admin.Delete("/drivers/:id", driverHandler.Delete)

	admin.Get("/deliveries", deliveryHandler.GetAll)
	admin.Post("/deliveries", deliveryHandler.Assign)
	admin.Put("/deliveries/:id/status", deliveryHandler.UpdateStatus)

	admin.Get("/customers", customerHandler.GetAll)
	admin.Get("/customers/:id", customerHandler.GetByID)
	admin.Get("/customers/:id/gallon-loans", customerHandler.GetGallonLoans)

	admin.Get("/payments", paymentHandler.GetPaymentHistory)
	admin.Put("/payments/:id/confirm", paymentHandler.ConfirmManualPayment)

	admin.Get("/subscriptions", subscriptionHandler.GetAll)

	admin.Get("/gallon-loans", gallonLoanHandler.GetAll)
	admin.Get("/gallon-loans/customer/:customerId", gallonLoanHandler.GetByCustomer)
	admin.Put("/gallon-loans/:id/return", gallonLoanHandler.UpdateReturn)

	// Midtrans client key endpoint (for frontend)
	protected.Get("/config/midtrans", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"client_key":    cfg.MidtransClientKey,
			"is_production": cfg.MidtransIsProduction,
		})
	})
}
