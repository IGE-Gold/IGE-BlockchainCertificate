# Backend Environment Variables

This document describes all environment variables required for the backend configuration.

## Required Variables

### Server Configuration
- `PORT` - Server port number (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

### Database Configuration
- `CSV_FILE_PATH` - Path to the CSV database file
- `CSV_DELIMITER` - CSV field delimiter character
- `CSV_ENCODING` - CSV file encoding

### Blockchain Configuration
- `PRIVATE_KEY` - Your Polygon wallet private key
- `RPC_URL` - Polygon Amoy testnet RPC endpoint
- `EXPLORER_BASE_URL` - Blockchain explorer base URL
- `GAS_LIMIT_MULTIPLIER` - Gas limit multiplier for transactions
- `MAX_GAS_PRICE` - Maximum gas price in wei

### API Configuration
- `API_VERSION` - API version string
- `API_PREFIX` - API route prefix
- `API_TOKEN` - Authentication token for API access

### Logging Configuration
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `LOG_MAX_SIZE` - Maximum log file size
- `LOG_MAX_FILES` - Maximum number of log files to keep

### Security Configuration
- `CORS_ORIGIN` - CORS allowed origins
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window

### Authentication
- `USERS_CSV_PATH` - Path to users CSV file (default: backend/data/users.csv)

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
