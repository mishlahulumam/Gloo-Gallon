# Gloo-Gallon

Aplikasi PWA untuk antar jemput galon minum, manajemen stok, dan pendataan customer.

## Tech Stack

| Layer      | Teknologi                                       |
|------------|------------------------------------------------|
| Backend    | Go 1.22 (Fiber v2) + GORM                      |
| Frontend   | React 18 + Vite + TailwindCSS v4               |
| Database   | PostgreSQL 16                                   |
| Auth       | JWT (access + refresh token)                    |
| Payment    | Midtrans Snap                                   |
| PWA        | vite-plugin-pwa (Service Worker, installable)   |
| Container  | Docker + Docker Compose                         |

---

## Quick Start (Docker)

Cara tercepat untuk menjalankan seluruh aplikasi — hanya butuh **Docker** dan **Docker Compose**.

### 1. Clone & konfigurasi

```bash
git clone <repo-url> gloo-gallon
cd gloo-gallon
cp .env.example .env
```

Edit `.env` sesuai kebutuhan (password database, JWT secret, Midtrans keys).

### 2. Jalankan semua service

```bash
docker compose up --build -d
```

Ini akan menjalankan 3 container:

| Service      | Port  | Deskripsi                                    |
|--------------|-------|----------------------------------------------|
| `db`         | 5432  | PostgreSQL 16                                |
| `backend`    | 8080  | Go Fiber API server                          |
| `frontend`   | 80    | Nginx serving React SPA + reverse proxy API  |

### 3. Akses aplikasi

Buka **http://localhost** di browser.

### 4. Hentikan

```bash
docker compose down
```

Untuk menghapus data database juga:

```bash
docker compose down -v
```

---

## Manual Setup (Tanpa Docker)

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+

### 1. Database

```sql
CREATE DATABASE gloo_gallon;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env → sesuaikan DB_HOST, DB_USER, DB_PASSWORD

go mod tidy
go run cmd/main.go
```

Server berjalan di `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`. Vite proxy meneruskan `/api/*` ke backend.

---

## Default Credentials

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| Admin    | admin@gloogallon.com   | admin123  |

Customer mendaftar sendiri melalui halaman **Register**.

Saat pertama kali dijalankan, backend akan otomatis:
- Migrate semua tabel
- Seed akun admin
- Seed 3 produk galon (Aqua, Le Minerale, VIT) dengan stok awal

---

## Environment Variables

| Variable                  | Default                     | Deskripsi                        |
|---------------------------|-----------------------------|----------------------------------|
| `DB_USER`                 | `postgres`                  | Username PostgreSQL              |
| `DB_PASSWORD`             | `postgres`                  | Password PostgreSQL              |
| `DB_NAME`                 | `gloo_gallon`               | Nama database                    |
| `JWT_SECRET`              | (harus diganti)             | Secret key untuk JWT signing     |
| `JWT_EXPIRY_HOURS`        | `24`                        | Masa berlaku access token (jam)  |
| `JWT_REFRESH_EXPIRY_HOURS`| `168`                       | Masa berlaku refresh token (jam) |
| `MIDTRANS_SERVER_KEY`     | -                           | Server key dari Midtrans         |
| `MIDTRANS_CLIENT_KEY`     | -                           | Client key dari Midtrans         |
| `MIDTRANS_IS_PRODUCTION`  | `false`                     | `true` untuk production Midtrans |
| `CORS_ORIGINS`            | `http://localhost`          | Allowed CORS origins             |

---

## Features

### Admin Panel
- **Dashboard** — statistik harian: pesanan masuk, pendapatan, stok menipis, galon dipinjam
- **Pesanan** — list semua pesanan, filter status, update status, assign kurir
- **Produk** — CRUD produk galon (nama, merek, harga, harga deposit)
- **Stok** — update stok galon isi/kosong, log perubahan, alert stok menipis
- **Customer** — list pelanggan, detail profil, riwayat pesanan, pinjaman galon
- **Kurir** — CRUD data kurir & area jangkauan
- **Pengiriman** — assign kurir ke pesanan, update status pengiriman
- **Pembayaran** — riwayat transaksi, konfirmasi pembayaran manual
- **Laporan** — ringkasan penjualan & export CSV

### Customer App
- **Pesan Galon** — pilih produk, atur jumlah, pilih alamat, checkout
- **Tracking** — timeline visual status pesanan real-time
- **Riwayat Pesanan** — semua pesanan lengkap dengan detail
- **Pembayaran** — Midtrans Snap (online) / cash / transfer
- **Langganan** — atur pengiriman rutin otomatis
- **Alamat** — kelola banyak alamat pengiriman
- **Profil** — edit data diri & ganti password

### PWA
- Installable (add to home screen)
- Service Worker caching untuk asset statis
- Offline fallback page

---

## API Endpoints

### Auth (Public)

| Method | Endpoint              | Deskripsi          |
|--------|-----------------------|--------------------|
| POST   | `/api/auth/login`     | Login              |
| POST   | `/api/auth/register`  | Register customer  |
| POST   | `/api/auth/refresh`   | Refresh JWT token  |

### Profile (Authenticated)

| Method | Endpoint                 | Deskripsi        |
|--------|--------------------------|------------------|
| GET    | `/api/profile`           | Get profile      |
| PUT    | `/api/profile`           | Update profile   |
| PUT    | `/api/profile/password`  | Change password  |

### Products (Authenticated)

| Method | Endpoint            | Deskripsi          |
|--------|---------------------|--------------------|
| GET    | `/api/products`     | List semua produk  |
| GET    | `/api/products/:id` | Detail produk      |

### Customer

| Method | Endpoint                             | Deskripsi              |
|--------|--------------------------------------|------------------------|
| GET    | `/api/customer/orders`               | Pesanan saya           |
| POST   | `/api/customer/orders`               | Buat pesanan baru      |
| PUT    | `/api/customer/orders/:id/cancel`    | Batalkan pesanan       |
| GET    | `/api/customer/orders/:id`           | Detail pesanan         |
| POST   | `/api/customer/payments/initiate`    | Initiate pembayaran    |
| GET    | `/api/customer/addresses`            | List alamat            |
| POST   | `/api/customer/addresses`            | Tambah alamat          |
| PUT    | `/api/customer/addresses/:id`        | Update alamat          |
| DELETE | `/api/customer/addresses/:id`        | Hapus alamat           |
| PUT    | `/api/customer/addresses/:id/default`| Set alamat default     |
| GET    | `/api/customer/subscriptions`        | List langganan         |
| POST   | `/api/customer/subscriptions`        | Buat langganan         |
| PUT    | `/api/customer/subscriptions/:id`    | Update langganan       |
| PUT    | `/api/customer/subscriptions/:id/cancel` | Batalkan langganan |

### Admin

| Method | Endpoint                                    | Deskripsi              |
|--------|---------------------------------------------|------------------------|
| GET    | `/api/admin/dashboard`                      | Dashboard stats        |
| GET    | `/api/admin/orders`                         | Semua pesanan          |
| GET    | `/api/admin/orders/:id`                     | Detail pesanan         |
| PUT    | `/api/admin/orders/:id/status`              | Update status pesanan  |
| POST   | `/api/admin/products`                       | Tambah produk          |
| PUT    | `/api/admin/products/:id`                   | Update produk          |
| DELETE | `/api/admin/products/:id`                   | Hapus produk           |
| GET    | `/api/admin/stock`                          | Semua stok             |
| GET    | `/api/admin/stock/:productId`               | Stok per produk        |
| PUT    | `/api/admin/stock/:productId`               | Update stok            |
| GET    | `/api/admin/stock/:productId/logs`          | Log perubahan stok     |
| GET    | `/api/admin/drivers`                        | List kurir             |
| POST   | `/api/admin/drivers`                        | Tambah kurir           |
| PUT    | `/api/admin/drivers/:id`                    | Update kurir           |
| DELETE | `/api/admin/drivers/:id`                    | Hapus kurir            |
| GET    | `/api/admin/deliveries`                     | List pengiriman        |
| POST   | `/api/admin/deliveries`                     | Assign pengiriman      |
| PUT    | `/api/admin/deliveries/:id/status`          | Update status kirim    |
| GET    | `/api/admin/customers`                      | List customer          |
| GET    | `/api/admin/customers/:id`                  | Detail customer        |
| GET    | `/api/admin/customers/:id/gallon-loans`     | Pinjaman galon         |
| GET    | `/api/admin/payments`                       | Riwayat pembayaran     |
| PUT    | `/api/admin/payments/:id/confirm`           | Konfirmasi manual      |
| GET    | `/api/admin/subscriptions`                  | Semua langganan        |
| GET    | `/api/admin/gallon-loans`                   | Semua pinjaman galon   |
| PUT    | `/api/admin/gallon-loans/:id/return`        | Update pengembalian    |

### Webhook (Public)

| Method | Endpoint                  | Deskripsi                  |
|--------|---------------------------|----------------------------|
| POST   | `/api/payments/webhook`   | Midtrans payment callback  |

---

## Architecture

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ :80
                    ┌──────▼──────┐
                    │   Nginx     │
                    │  (Frontend) │
                    └──┬──────┬───┘
          static files │      │ /api/*
                       │      │
                       │ ┌────▼─────┐
                       │ │  Fiber   │ :8080
                       │ │ (Backend)│
                       │ └────┬─────┘
                       │      │
                       │ ┌────▼─────┐
                       │ │PostgreSQL│ :5432
                       │ └──────────┘
                       │
                  ┌────▼─────┐
                  │ Midtrans │
                  │   Snap   │
                  └──────────┘
```

---

## Project Structure

```
gloo-gallon/
├── docker-compose.yml          # Orchestrate semua service
├── .env.example                # Template environment variables
├── README.md
│
├── backend/
│   ├── Dockerfile              # Multi-stage Go build
│   ├── cmd/main.go             # Entry point
│   ├── internal/
│   │   ├── config/             # Environment config loader
│   │   ├── database/           # DB connection, migration, seed
│   │   ├── handlers/           # 12 HTTP handler files
│   │   ├── middleware/         # JWT auth & role guard
│   │   ├── models/             # GORM models & request/response types
│   │   └── routes/             # Route registration
│   ├── .env.example
│   └── go.mod
│
└── frontend/
    ├── Dockerfile              # Multi-stage Node build + Nginx
    ├── nginx.conf              # Nginx config (SPA + API proxy)
    ├── src/
    │   ├── components/
    │   │   ├── ui/             # Button, Input, Card, Modal, Table, dll
    │   │   └── layout/         # AdminLayout, CustomerLayout, ProtectedRoute
    │   ├── pages/
    │   │   ├── auth/           # LoginPage, RegisterPage
    │   │   ├── admin/          # 9 halaman admin
    │   │   └── customer/       # 7 halaman customer
    │   ├── services/           # 12 API service modules (axios)
    │   ├── store/              # Zustand auth store
    │   └── utils/              # Utility functions
    ├── vite.config.js
    └── package.json
```

---

## Docker Commands

```bash
# Build & jalankan semua
docker compose up --build -d

# Lihat logs
docker compose logs -f
docker compose logs -f backend

# Restart satu service
docker compose restart backend

# Rebuild satu service
docker compose up --build -d backend

# Hentikan semua
docker compose down

# Hentikan + hapus volume database
docker compose down -v

# Masuk ke container
docker compose exec backend sh
docker compose exec db psql -U postgres -d gloo_gallon
```

---

## License

MIT
