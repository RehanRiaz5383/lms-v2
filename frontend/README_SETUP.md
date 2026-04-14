# Frontend Setup Guide

## Installation

1. Install dependencies:
```bash
npm install
```

## Environment Configuration

Create a `.env` file in the `frontend` directory with the following:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Update `VITE_API_BASE_URL` to match your Laravel backend URL.

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port Vite assigns).

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   └── layout/       # Layout components
│   ├── config/           # Configuration files
│   │   └── api.js        # API configuration
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── store/            # Redux store
│   │   └── slices/       # Redux slices
│   └── utils/            # Utility functions
├── .env                  # Environment variables (create this)
└── package.json
```

## Features

- ✅ Professional login page
- ✅ Responsive dashboard layout
- ✅ Light/Dark mode with localStorage persistence
- ✅ Redux state management
- ✅ Protected routes
- ✅ API integration with Laravel backend
- ✅ Tailwind CSS styling
- ✅ shadcn/ui components

## API Configuration

- **Path templates** (`API_ENDPOINTS`): edit `src/config/apiEndpoints.js` (safe to commit with the rest of the repo).
- **Environment** (`APP_MODE`, base URL, timeouts): edit `src/config/api.js` (you can gitignore this file locally if each machine needs different values; keep `apiEndpoints.js` in git).

To add a new API route:

1. Add the path to `API_ENDPOINTS` in `src/config/apiEndpoints.js`
2. Use `apiService` from `src/services/api.js` to make requests

Example:
```javascript
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../config/api';

// GET request
const response = await apiService.get(API_ENDPOINTS.users.list);

// POST request
const response = await apiService.post(API_ENDPOINTS.users.create, userData);
```

## Theme Management

The theme is managed through Redux and persisted in localStorage. Users can toggle between light and dark modes, and their preference is saved automatically.

## Authentication

- Login credentials are stored in Redux and localStorage
- Token is automatically added to API requests via axios interceptors
- Protected routes redirect to login if not authenticated
- Session is restored on app load

