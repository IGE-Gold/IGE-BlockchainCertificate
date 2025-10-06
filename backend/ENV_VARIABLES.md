# Backend Environment Variables

This document describes all environment variables required for the backend configuration.

## Required Variables

### Server Configuration
- `PORT` - Server port number (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

### Database Configuration
- `CSV_FILE_PATH` - Path to the CSV database file
- `CSV_DELIMITER` - CSV field delimiter character (default: ;)
- `CSV_ENCODING` - CSV file encoding (default: utf8)
- `BACKUP_PATH` - Path to backup directory
- `BACKUP_RETENTION_DAYS` - Number of days to keep backups
- `AUTO_BACKUP` - Enable automatic backups (true/false)

### Blockchain Configuration
- `POLYGON_RPC_URL` - Polygon Amoy testnet RPC endpoint
- `PRIVATE_KEY` - Your Polygon wallet private key
- `CHAIN_ID` - Blockchain chain ID
- `EXPLORER_BASE_URL` - Blockchain explorer base URL
- `GAS_LIMIT_MULTIPLIER` - Gas limit multiplier for transactions (default: 1.2)
- `MAX_GAS_PRICE` - Maximum gas price in wei

### API Configuration
- `API_VERSION` - API version string
- `API_PREFIX` - API route prefix (default: /api)
- `API_TOKEN` - Authentication token for API access

### Logging Configuration
- `LOG_PATH` - Path to log files directory
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `LOG_MAX_SIZE` - Maximum log file size
- `LOG_MAX_FILES` - Maximum number of log files to keep

### Security Configuration
- `CORS_ORIGIN` - CORS allowed origins
- `HELMET_ENABLED` - Enable Helmet security headers (true/false)
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window

### File Upload Configuration
- `MAX_FILE_SIZE` - Maximum file size for uploads (in bytes)
- `ALLOWED_FILE_TYPES` - Comma-separated list of allowed MIME types

### Serial Generation Configuration
- `SERIAL_LENGTH` - Length of generated serial numbers (default: 7)
- `MAX_PROGRESSIVE` - Maximum progressive number per year (default: 99999)

### Authentication
- `USERS_CSV_PATH` - Path to users CSV file (default: backend/data/users.csv)

## Example Configuration

```env
# Server
PORT=3001
NODE_ENV=development

# Database
CSV_FILE_PATH=./data/certificates.csv
CSV_DELIMITER=;
CSV_ENCODING=utf8
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30
AUTO_BACKUP=true

# Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_private_key_here
CHAIN_ID=80002
EXPLORER_BASE_URL=https://amoy.polygonscan.com/tx/
GAS_LIMIT_MULTIPLIER=1.2
MAX_GAS_PRICE=50000000000

# API
API_VERSION=v1
API_PREFIX=/api
API_TOKEN=your_secure_token_here

# Logging
LOG_PATH=./logs
LOG_LEVEL=info
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Security
CORS_ORIGIN=http://localhost:3000
HELMET_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=text/csv,application/csv

# Serial Generation
SERIAL_LENGTH=7
MAX_PROGRESSIVE=99999

# Authentication
USERS_CSV_PATH=./data/users.csv
```

## Setup Instructions

1. Copy `env.example` to `.env`
2. Fill in all required variables with your actual values
3. Never commit the `.env` file to version control
4. Keep your private key secure and never share it

## Security Notes

- The private key should be kept absolutely secure
- Use strong, unique values for API_TOKEN
- In production, use environment-specific values
- Regularly rotate sensitive credentials
- Set appropriate CORS origins for production
- Configure rate limiting based on expected traffic
