package models

type PaginationQuery struct {
	Page  int    `query:"page"`
	Limit int    `query:"limit"`
	Sort  string `query:"sort"`
	Order string `query:"order"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

type DashboardStats struct {
	TodayOrders      int64   `json:"today_orders"`
	PendingOrders    int64   `json:"pending_orders"`
	TodayRevenue     float64 `json:"today_revenue"`
	MonthRevenue     float64 `json:"month_revenue"`
	TotalCustomers   int64   `json:"total_customers"`
	ActiveProducts   int64   `json:"active_products"`
	LowStockProducts int64   `json:"low_stock_products"`
	BorrowedGallons  int64   `json:"borrowed_gallons"`
}

func (p *PaginationQuery) GetOffset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 10
	}
	return (p.Page - 1) * p.Limit
}
