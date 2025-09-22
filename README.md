# IGE Gold Certificate System

A blockchain-based certificate management system for gold products, built with Node.js, React, and Polygon blockchain.

> **⚠️ PROPRIETARY SOFTWARE**  
> This software is proprietary and confidential. It is owned by **IGE Gold s.r.l.** and is intended for internal use only. Unauthorized distribution, copying, or modification is strictly prohibited.

## 🚀 Features

- **Blockchain Integration**: Certificates stored on Polygon Amoy testnet
- **CSV Database**: Local CSV file management with automatic backups
- **Modern UI**: Clean, dark-themed React frontend
- **Excel-like Editor**: Advanced CSV editing capabilities
- **Authentication**: Token-based API security
- **Real-time Validation**: Serial number validation and uniqueness checks

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Polygon wallet with testnet MATIC
- Git

## 🛠️ Installation

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IGE-BlockchainCertificate
   ```

2. **Run the installer**
   ```bash
   install.bat
   ```

3. **Configure environment variables**
   - Edit `backend/.env` with your blockchain credentials
   - Edit `frontend/.env` with your API configuration
   - See `backend/ENV_VARIABLES.md` and `frontend/ENV_VARIABLES.md` for details

4. **Start the system**
   ```bash
   start-all.bat
   ```

### Manual Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Configure your .env file
   npm start
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp env.example .env
   # Configure your .env file
   npm start
   ```

## 🔧 Configuration

### Backend Configuration

The backend requires several environment variables. Copy `backend/env.example` to `backend/.env` and configure:

- **Blockchain**: Private key, RPC URL, gas settings
- **API**: Authentication token, CORS settings
- **Database**: CSV file paths and settings
- **Security**: Rate limiting, logging configuration

### Frontend Configuration

The frontend requires API connection settings. Copy `frontend/env.example` to `frontend/.env` and configure:

- **API**: Backend URL and authentication token
- **App**: Application name and version
- **Auth**: Login credentials

## 🌐 Usage

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

### Default Credentials

- **Username**: 1234567890
- **Password**: 0987654321

### Main Features

1. **Create Certificate**: Generate and register new certificates
2. **Verify Certificate**: Check certificate authenticity on blockchain
3. **Certificate List**: View and manage all certificates
4. **CSV Editor**: Advanced Excel-like editing capabilities
5. **Statistics**: System usage and blockchain status

## 🔗 Blockchain Integration

### Network
- **Network**: Polygon Amoy Testnet
- **Explorer**: https://amoy.polygonscan.com
- **RPC**: https://rpc-amoy.polygon.technology

### Certificate Data
Certificates are stored on-chain with the following structure:
```json
{
  "type": "GOLD_CERTIFICATE",
  "version": "1.0",
  "serial": "certificate_serial",
  "company": { "name": "...", "tax_code": "..." },
  "product": { "metal": "...", "weight": "...", "location": {...} },
  "disclaimer": "Blockchain authentication notice"
}
```

## 📁 Project Structure

```
IGE-BlockchainCertificate/
├── backend/                 # Node.js backend
│   ├── utils/              # Utility modules
│   ├── logs/               # Application logs
│   ├── .env                # Backend configuration
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── styles/         # CSS styles
│   └── .env                # Frontend configuration
├── data/                   # CSV database
├── backups/                # CSV backups
├── install.bat             # Installation script
├── start-all.bat           # Launch script
└── README.md               # This file
```

## 🔒 Security

- **Private Keys**: Never commit private keys to version control
- **Environment Files**: Keep `.env` files secure and local
- **API Tokens**: Use strong, unique authentication tokens
- **HTTPS**: Use HTTPS in production environments

## 🐛 Troubleshooting

### Common Issues

1. **Blockchain Connection Failed**
   - Check your private key format
   - Verify RPC URL is accessible
   - Ensure you have testnet MATIC

2. **API Authentication Error**
   - Verify API_TOKEN matches between frontend and backend
   - Check CORS configuration

3. **CSV File Errors**
   - Ensure data directory exists
   - Check file permissions
   - Verify CSV format

### Logs

- **Backend Logs**: `backend/logs/`
- **Application Logs**: `backend/logs/app.log`
- **Error Logs**: `backend/logs/error.log`
- **Blockchain Logs**: `backend/logs/blockchain.log`

## 📝 API Documentation

### Endpoints

- `GET /api/health` - System health check
- `POST /api/generate-serial` - Generate new serial number
- `POST /api/validate-serial` - Validate serial number
- `POST /api/write-certificate` - Create new certificate
- `GET /api/certificate/:serial` - Get certificate details
- `GET /api/certificates` - List all certificates
- `GET /api/stats` - System statistics

### Authentication

All API requests require authentication via:
- Header: `Authorization: Bearer <token>`
- Query parameter: `?token=<token>`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License & Copyright

**© 2025 IGE Gold s.r.l. All rights reserved.**

This software is proprietary and confidential. It is owned by IGE Gold s.r.l. and is intended for internal use only. No part of this software may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of IGE Gold s.r.l.

**Unauthorized use, copying, or distribution is strictly prohibited and may result in legal action.**

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the environment variable documentation
- Check the application logs for error details

---

**IGE Gold Certificate System** - Secure, blockchain-authenticated gold product certification.
