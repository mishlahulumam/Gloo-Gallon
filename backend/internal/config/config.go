package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort string
	AppEnv  string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret             string
	JWTExpiryHours        int
	JWTRefreshExpiryHours int

	MidtransServerKey    string
	MidtransClientKey    string
	MidtransIsProduction bool

	CORSOrigins string
}

func Load() *Config {
	godotenv.Load()

	jwtExpiry, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	jwtRefreshExpiry, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_HOURS", "168"))
	midtransIsProd, _ := strconv.ParseBool(getEnv("MIDTRANS_IS_PRODUCTION", "false"))

	return &Config{
		AppPort: getEnv("APP_PORT", "8080"),
		AppEnv:  getEnv("APP_ENV", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "gloo_gallon"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:             getEnv("JWT_SECRET", "default-secret"),
		JWTExpiryHours:        jwtExpiry,
		JWTRefreshExpiryHours: jwtRefreshExpiry,

		MidtransServerKey:    getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey:    getEnv("MIDTRANS_CLIENT_KEY", ""),
		MidtransIsProduction: midtransIsProd,

		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:5173"),
	}
}

func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" port=" + c.DBPort +
		" sslmode=" + c.DBSSLMode +
		" TimeZone=Asia/Jakarta"
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
