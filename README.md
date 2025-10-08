# IGE Gold Certificate System

A blockchain-based certificate management system for gold products, built with Node.js, React, and Polygon blockchain.

**Author:** Giuseppe Bosi  
**Company:** [IGE Gold S.p.A.](https://www.ige.gold/)

> **⚠️ PROPRIETARY SOFTWARE**  
> This software is proprietary and confidential. It is owned by **IGE Gold S.p.A.** and is intended for internal use only. Unauthorized distribution, copying, or modification is strictly prohibited.

## 🚀 Features

- **Blockchain Integration**: Certificates stored on Polygon Amoy testnet
- **CSV Database**: Local CSV file management with automatic backups
- **Modern UI**: Clean, dark-themed React frontend
- **Excel-like Editor**: Advanced CSV editing capabilities
- **Authentication**: Token-based API security
- **Real-time Validation**: Serial number validation and uniqueness checks
- **Auto-expanding Display**: Certificate data shows without scrollbars
- **Professional Screenshots**: Complete visual documentation
- **Smart Serial Generation**: YYNNNNN format with year-based progressive numbering

## 📸 Screenshots

The application includes comprehensive screenshots showing all features:

- **Certificate Creation**: Form interface for creating new certificates
- **Certificate Verification**: Blockchain verification with auto-expanding data display
- **Certificate List**: Management interface with search and filtering
- **CSV Editor**: Excel-like editing capabilities
- **Statistics Dashboard**: System usage and blockchain status
- **Login Interface**: Secure authentication system
- **Blockchain Integration**: Real-time blockchain data display

*View all screenshots in the `Screenshots/` directory*

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

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   - Edit `backend/.env` with your blockchain credentials
   - Edit `frontend/.env` with your API configuration
   - See `backend/ENV_VARIABLES.md` and `frontend/ENV_VARIABLES.md` for details

4. **Start the system**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
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

### Login

- Login is validated against the backend `users.csv` (semicolon `;` separator)
- Usernames are case-sensitive
- Session is stored in `sessionStorage` and ends when the browser closes

### Main Features

1. **Create Certificate**: Generate and register new certificates
2. **Verify Certificate**: Check certificate authenticity on blockchain
3. **Certificate List**: View and manage all certificates
4. **CSV Editor**: Advanced Excel-like editing capabilities
5. **Statistics**: System usage and blockchain status
6. **Auto-expanding Display**: Certificate data shows without scrollbars
7. **Professional UI**: Modern dark theme with responsive design
8. **Real-time Validation**: Instant serial number validation
9. **Bulk Import**: Validate and write certificates from CSV

## 🔢 Serial Number System

### Format: YYNNNNN
The system uses a smart serial number format:
- **YY**: Last two digits of the year (e.g., 25 for 2025)
- **NNNNN**: Progressive number within the year (00001-99999)

### Examples
- **2500001**: First certificate of 2025
- **2500002**: Second certificate of 2025
- **2600001**: First certificate of 2026

### Smart Generation Logic
1. **Year-based filtering**: Only considers certificates from the current year
2. **Progressive numbering**: Automatically finds the next available number
3. **Gap detection**: Handles missing numbers in the sequence
4. **Year reset**: Starts from 00001 each new year

## 🔐 Data Encoding System

### Multi-Layer Encoding Architecture
The system implements a sophisticated multi-layer encoding system for secure data storage and transmission:

#### 1. **Serial Number Encoding (YYNNNNN)**
- **Format**: 7-digit alphanumeric identifier
- **Structure**: `YY` (year) + `NNNNN` (progressive number)
- **Validation**: Regex pattern `/^\d{7}$/` ensures format compliance
- **Year Handling**: Automatically converts between 2-digit and 4-digit years
- **Progressive Logic**: Smart gap detection and sequential numbering

#### 2. **CSV Data Encoding**
- **Character Encoding**: UTF-8 (configurable via `CSV_ENCODING` env var)
- **Delimiter**: Semicolon (`;`) by default (configurable via `CSV_DELIMITER`)
- **Field Structure**: 14 standardized fields with consistent formatting
- **Backup System**: Automatic timestamped backups before each write operation

#### 3. **Blockchain Data Encoding**
- **JSON Structure**: Hierarchical data organization with nested objects
- **UTF-8 Conversion**: Data converted to UTF-8 bytes using `ethers.toUtf8Bytes()`
- **Hexadecimal Encoding**: UTF-8 data encoded as hexadecimal for blockchain storage
- **Gas Optimization**: Intelligent gas estimation with configurable multipliers

#### 4. **Certificate Data Structure**
```json
{
  "type": "GOLD_CERTIFICATE",
  "version": "1.0",
  "serial": "certificate_serial",
  "created_on": "MM/DD/YYYY",
  "timestamp": "ISO_8601_format",
  "company": {
    "name": "string",
    "tax_code": "string",
    "social_capital": "string",
    "authorization": "string"
  },
  "product": {
    "metal": "string",
    "fineness": "string",
    "weight": "string",
    "production_date": "YYYY-MM-DD",
    "bar_type": "investment | custom",
    "customization": {
      "icon_code": "string",
      "date": "YYYY-MM-DD",
      "text": "string"
    },
    "location": {
      "city": "string",
      "country": "string"
    }
  },
  "disclaimer": "string"
}
```

## 📦 CSV Database Schema

The system uses a semicolon-separated (`;`) CSV as the primary datastore. Columns are written in the exact order below. Unless specified, values are UTF-8 strings.

1. `serial` (string, 7 chars) – Certificate serial number (YYNNNNN)
2. `company` (string) – Company name
3. `production_date` (YYYY-MM-DD) – Production date
4. `city` (string) – City
5. `country` (string) – Country
6. `weight` (number as string) – Weight in grams
7. `metal` (string) – Metal code (e.g., Au, Ag, Pt)
8. `fineness` (string) – Fineness (e.g., 999.9‰)
9. `tax_code` (string) – Company tax code
10. `social_capital` (string) – Social capital
11. `authorization` (string) – Authorization code
12. `bar_type` (string) – `investment` or `custom`
13. `custom_icon_code` (string) – Present if `bar_type=custom`, else empty
14. `custom_date` (YYYY-MM-DD) – Present if `bar_type=custom`, else empty
15. `custom_text` (string) – Present if `bar_type=custom`, else empty
16. `blockchain_hash` (string) – Transaction hash
17. `blockchain_link` (URL string) – Explorer link
18. `user` (string) – User ID who created the certificate
19. `write_date` (ISO 8601) – Backend write timestamp

Notes:
- On updates and deletes, a backup of the CSV is created automatically in `backend/backups/`.
- Customization fields are mandatory when `bar_type=custom`; otherwise they are stored as empty strings.

## 📥 Bulk Import (CSV)

Author: Giuseppe Bosi

The system supports bulk validation and writing of certificates from a CSV file. The CSV must be UTF-8 and semicolon `;` separated with headers:

- Required: `serial, company, production_date, city, country, weight, metal, fineness, tax_code, social_capital, authorization, user, bar_type`
- When `bar_type=custom`: `custom_icon_code, custom_date (YYYY-MM-DD), custom_text`
- Output (set by backend after write): `blockchain_hash, blockchain_link, write_date`

Flow:
1. Validate CSV via API to detect per-row issues before writing
2. If there are 0 invalid rows, trigger the bulk write

Backend APIs:
- POST `{API_PREFIX}/bulk/validate` (multipart/form-data, field `file`)
  - Response: `{ success, summary: { totalRows, validRows, invalidRows }, errors: [ { row, serial, errors[] } ] }`
- POST `{API_PREFIX}/bulk/write` (application/json)
  - Body: `{ certificates: Array<Certificate> }`
  - Response: `{ success, summary: { requested, written, failed }, results: [ { index, serial, success, blockchainHash?, errors? } ] }`

Frontend:
- Navigate to `#/bulk` to upload and validate a CSV, then execute the write for valid rows.

Validation rules:
- Serial: 7 numeric digits, unique within CSV and not existing in DB
- Required fields must be non-empty
- `bar_type`: `investment` or `custom`
- If `custom`: `custom_icon_code` (<=20), `custom_date` (past or current), `custom_text` (<=120)

Notes:
- On bulk write, each successful row is written to blockchain first; then all successful rows are appended to CSV in a single IO with automatic backup.
- Errors are reported per row; successful rows are not blocked by failures in other rows.

#### 5. **Encoding Validation & Security**
- **Format Validation**: Multi-level validation for serial numbers and data integrity
- **Uniqueness Checks**: Prevents duplicate serial numbers across the system
- **Error Handling**: Comprehensive error management with detailed logging
- **Data Integrity**: Backup and recovery mechanisms ensure data consistency

#### 6. **Configuration Parameters**
- `MAX_PROGRESSIVE`: Maximum progressive number per year (default: 99999)
- `CSV_ENCODING`: Character encoding for CSV files (default: utf8)
- `CSV_DELIMITER`: Field separator for CSV files (default: ;)
- `GAS_LIMIT_MULTIPLIER`: Gas estimation multiplier (default: 1.2)
- `MAX_GAS_PRICE`: Maximum gas price limit (default: 50000000000)

### Encoding Flow
1. **Input Validation**: Serial format and data structure validation
2. **CSV Encoding**: UTF-8 encoding with configurable delimiter
3. **Blockchain Preparation**: JSON structure creation and validation
4. **Hexadecimal Conversion**: UTF-8 to hex conversion for blockchain storage
5. **Transaction Encoding**: Gas estimation and transaction preparation
6. **Verification**: Multi-layer verification of encoded data integrity

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
  "company": { "name": "...", "tax_code": "...", "social_capital": "...", "authorization": "..." },
  "product": {
    "metal": "...",
    "fineness": "...",
    "weight": "...",
    "production_date": "YYYY-MM-DD",
    "bar_type": "investment | custom",
    "customization": {
      "icon_code": "...",
      "date": "YYYY-MM-DD",
      "text": "..."
    },
    "location": { "city": "...", "country": "..." }
  },
  "disclaimer": "..."
}
```

## 📁 Project Structure

```
## 🚀 Deploy to Render (Backend)

### Prerequisites
- Render account (free tier available)
- GitHub repository connected to Render

### Configuration
- `render.yaml` is provided and configures a Node.js web service with `backend/` as root directory.
- Render provides persistent filesystem storage (CSV files persist between deployments).
- Set sensitive environment variables manually in Render dashboard: `API_TOKEN` and `PRIVATE_KEY`.

### Steps (Web Dashboard)
1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select branch `Render`

2. **Configure Service**
   - Name: `ige-backend` (or your preferred name)
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free

3. **Set Environment Variables**
   - In Render dashboard → Environment tab
   - Add these variables manually:
     - `API_TOKEN`: your secure API token
     - `PRIVATE_KEY`: your blockchain private key (0x...)
   - Other variables are pre-configured in `render.yaml`

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

### Verify
- Once deployed, open the service URL and test `/api/health`
- Check logs in Render dashboard if needed

### Storage Notes
- Render provides persistent filesystem storage
- CSV files in `./data/` and backups in `./backups/` persist between deployments
- No additional storage configuration needed

## 📝 Changelog

### 2025-10-08
- Frontend: Made `production_date` editable; removed 7-day recency check.
- Frontend: `custom_date` is now optional when `bar_type=custom`.
- Backend: Relaxed date validations; `custom_date` can be any valid date (past/present/future) and is optional for `custom` bars.
- Bulk: Updated validation to align with optional `custom_date` and relaxed constraints.
- Docs: Updated README to reflect flexible dates and new validation rules.
