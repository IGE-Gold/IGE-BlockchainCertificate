# Frontend Environment Variables

This document describes all environment variables required for the frontend configuration.

## Required Variables

### API Configuration
- `REACT_APP_API_URL` - Backend API base URL (default: http://localhost:3001/api)
- `REACT_APP_API_TOKEN` - Authentication token for API requests (default: empty)

### Application Configuration
- `REACT_APP_APP_NAME` - Application display name
- `REACT_APP_VERSION` - Application version number
- `REACT_APP_DEBUG` - Debug mode flag (true/false)

### Authentication
Login is now handled by backend via CSV users list. The following variables are deprecated and no longer used:
- `REACT_APP_LOGIN_USERNAME`
- `REACT_APP_LOGIN_PASSWORD`

## Example Configuration

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_API_TOKEN=your_secure_token_here

# Application Configuration
REACT_APP_APP_NAME=IGE Gold Certificate System
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

## Setup Instructions

1. Copy `env.example` to `.env`
2. Fill in all required variables with your actual values
3. Never commit the `.env` file to version control
4. Ensure the API_URL matches your backend server

## Important Notes

- All React environment variables must be prefixed with `REACT_APP_`
- Changes to `.env` require restarting the development server
- The API_URL should point to your running backend server
- Use strong credentials for login authentication
- The API_TOKEN should match the backend's API_TOKEN value

## Development vs Production

- In development: Use `http://localhost:3001/api` for API_URL
- In production: Use your actual domain for API_URL (e.g., `https://yourdomain.com/api`)
- Debug mode should be disabled in production
- Ensure CORS is properly configured on the backend for your frontend domain
