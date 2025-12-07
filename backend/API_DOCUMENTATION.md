# API Documentation

## Base URL
```
http://localhost:8000/api
```

All endpoints require authentication via Bearer token (except login).

## Authentication Endpoints

### Login
- **POST** `/api/login`
- **Public**: Yes
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
- **Response**:
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "user_type": 1,
      "user_type_title": "Admin"
    },
    "token": "1|xxxxxxxxxxxxxxxx"
  },
  "error": null
}
```

### Logout
- **POST** `/api/logout`
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
```json
{
  "message": "Logout successful",
  "data": null,
  "error": null
}
```

### Get Current User
- **GET** `/api/me`
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "user_type": 1,
    "user_type_title": "Admin"
  },
  "error": null
}
```

## Profile Management Endpoints (All Authenticated Users)

### Get Profile
- **GET** `/api/profile`
- **Headers**: `Authorization: Bearer {token}`

### Update Profile
- **PUT** `/api/profile`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "contact_no": "1234567890",
  "emergency_contact_no": "0987654321",
  "address": "123 Main St",
  "country": "USA",
  "city": "New York"
}
```

### Change Password
- **POST** `/api/profile/change-password`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword",
  "new_password_confirmation": "newpassword"
}
```

## User Management Endpoints (Admin Only)

### List Users
- **GET** `/api/users`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `search` - Search by name or email
  - `user_type` - Filter by user type ID
  - `block` - Filter by block status (0 or 1)
  - `per_page` - Items per page (default: 15)
  - `page` - Page number
- **Example**: `/api/users?search=john&user_type=2&block=0&per_page=20&page=1`

### Get User
- **GET** `/api/users/{id}`
- **Headers**: `Authorization: Bearer {token}`

### Create User
- **POST** `/api/users`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "user_type": 2,
  "contact_no": "1234567890",
  "address": "456 Oak Ave"
}
```

### Update User
- **PUT** `/api/users/{id}`
- **Headers**: `Authorization: Bearer {token}`
- **Body**: Same as create (all fields optional)

### Delete User (Soft Delete)
- **DELETE** `/api/users/{id}`
- **Headers**: `Authorization: Bearer {token}`

### Block User
- **POST** `/api/users/{id}/block`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "block_reason": "Violation of terms"
}
```

### Unblock User
- **POST** `/api/users/{id}/unblock`
- **Headers**: `Authorization: Bearer {token}`

### Get User Types
- **GET** `/api/users/types`
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
```json
{
  "message": "User types retrieved successfully",
  "data": [
    {
      "id": 1,
      "title": "Admin"
    },
    {
      "id": 2,
      "title": "Student"
    },
    {
      "id": 3,
      "title": "Teacher"
    },
    {
      "id": 4,
      "title": "CHECKER"
    }
  ],
  "error": null
}
```

## Error Responses

All errors follow this format:
```json
{
  "message": "Error message",
  "data": null,
  "error": {
    "field": ["Error message for field"]
  }
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (Admin access required)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Notes

1. **Admin Access**: User management endpoints require admin privileges (user_type = 1)
2. **Authentication**: All protected endpoints require `Authorization: Bearer {token}` header
3. **Pagination**: List endpoints return paginated results
4. **Soft Deletes**: User deletion is soft (uses `deleted_at` column)

