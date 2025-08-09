# API Specification

## Overview

RESTful API for the notification system with comprehensive endpoints for managing notifications, user preferences, templates, and delivery tracking.

## Base URL
```
https://api.example.com/v1/notifications
```

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "uuid"
  }
}
```

## Endpoints

### 1. Notifications Management

#### GET /notifications
Get user's notifications with filtering and pagination.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `category` (string) - Filter by category
- `status` (string) - Filter by status (read, unread, all)
- `priority` (integer) - Minimum priority level
- `from_date` (ISO date) - Start date filter
- `to_date` (ISO date) - End date filter

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Welcome to our platform",
      "message": "Thank you for joining us!",
      "type": "success",
      "priority": 2,
      "category": {
        "id": "uuid",
        "name": "account",
        "icon": "user",
        "color": "#3742FA"
      },
      "status": "delivered",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "readAt": null,
      "expiresAt": null,
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "total": 150,
    "unread": 25,
    "categories": {
      "system": 10,
      "account": 15,
      "marketing": 0
    }
  }
}
```

#### POST /notifications
Create a new notification (admin/system use).

**Request Body:**
```json
{
  "userId": "uuid",
  "categoryId": "uuid",
  "title": "Important Update",
  "message": "Your account has been verified",
  "type": "success",
  "priority": 3,
  "channels": {
    "email": true,
    "inApp": true,
    "push": false
  },
  "scheduledAt": "2024-01-15T15:00:00Z",
  "expiresAt": "2024-01-22T15:00:00Z",
  "templateData": {
    "userName": "John Doe",
    "actionUrl": "https://app.example.com/verify"
  },
  "metadata": {
    "source": "user_verification"
  }
}
```

#### GET /notifications/{id}
Get a specific notification by ID.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Welcome to our platform",
    "message": "Thank you for joining us!",
    "type": "success",
    "priority": 2,
    "category": {
      "id": "uuid",
      "name": "account",
      "icon": "user",
      "color": "#3742FA"
    },
    "status": "delivered",
    "isRead": false,
    "deliveryChannels": {
      "email": {
        "enabled": true,
        "status": "delivered",
        "deliveredAt": "2024-01-15T10:31:00Z"
      },
      "inApp": {
        "enabled": true,
        "status": "delivered",
        "deliveredAt": "2024-01-15T10:30:30Z"
      }
    },
    "events": [
      {
        "type": "created",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "type": "sent",
        "timestamp": "2024-01-15T10:30:15Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "metadata": {}
  }
}
```

#### PATCH /notifications/{id}/read
Mark notification as read.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "isRead": true,
    "readAt": "2024-01-15T11:00:00Z"
  }
}
```

#### POST /notifications/bulk-read
Mark multiple notifications as read.

**Request Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### DELETE /notifications/{id}
Delete a notification (soft delete).

### 2. User Preferences Management

#### GET /preferences
Get user's notification preferences.

**Response:**
```json
{
  "data": {
    "categories": [
      {
        "categoryId": "uuid",
        "categoryName": "system",
        "email": {
          "enabled": true,
          "frequency": "immediate"
        },
        "inApp": {
          "enabled": true
        },
        "push": {
          "enabled": false
        },
        "minPriority": 2
      }
    ],
    "globalSettings": {
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "07:00",
        "timezone": "America/New_York"
      },
      "digest": {
        "enabled": true,
        "time": "09:00",
        "frequency": "daily"
      }
    }
  }
}
```

#### PUT /preferences
Update user's notification preferences.

**Request Body:**
```json
{
  "categories": [
    {
      "categoryId": "uuid",
      "email": {
        "enabled": true,
        "frequency": "daily"
      },
      "inApp": {
        "enabled": true
      },
      "push": {
        "enabled": false
      },
      "minPriority": 2
    }
  ],
  "globalSettings": {
    "quietHours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00",
      "timezone": "America/New_York"
    }
  }
}
```

#### GET /preferences/categories
Get available notification categories.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "system",
      "description": "System notifications",
      "icon": "system",
      "color": "#FF6B6B",
      "isSystem": true,
      "defaultChannels": {
        "email": true,
        "inApp": true,
        "push": false
      }
    }
  ]
}
```

### 3. Real-time Statistics

#### GET /stats/summary
Get notification statistics summary.

**Response:**
```json
{
  "data": {
    "unreadCount": 25,
    "todayCount": 8,
    "weeklyCount": 45,
    "deliveryRate": {
      "email": 0.95,
      "inApp": 0.99,
      "push": 0.87
    },
    "categoryBreakdown": [
      {
        "category": "system",
        "count": 12,
        "unread": 3
      }
    ],
    "recentActivity": {
      "lastNotification": "2024-01-15T10:30:00Z",
      "lastRead": "2024-01-15T09:45:00Z"
    }
  }
}
```

### 4. Template Management (Admin)

#### GET /admin/templates
Get email templates (admin only).

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "welcome_email",
      "category": "account",
      "subjectTemplate": "Welcome to {{platformName}}, {{userName}}!",
      "variables": ["userName", "platformName", "verificationUrl"],
      "description": "Welcome email for new users",
      "version": 2,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /admin/templates
Create a new email template.

**Request Body:**
```json
{
  "name": "password_reset",
  "categoryId": "uuid",
  "subjectTemplate": "Password Reset Request - {{platformName}}",
  "htmlTemplate": "<html>...</html>",
  "textTemplate": "Text version...",
  "variables": ["userName", "resetUrl", "expirationTime"],
  "description": "Password reset email template"
}
```

### 5. Delivery Management

#### GET /delivery/{notificationId}
Get delivery status for a notification.

**Response:**
```json
{
  "data": {
    "notificationId": "uuid",
    "channels": [
      {
        "channel": "email",
        "status": "delivered",
        "recipient": "user@example.com",
        "provider": "sendgrid",
        "providerMessageId": "msg_123",
        "sentAt": "2024-01-15T10:30:15Z",
        "deliveredAt": "2024-01-15T10:30:45Z",
        "processingTimeMs": 1500
      }
    ],
    "events": [
      {
        "type": "sent",
        "channel": "email",
        "timestamp": "2024-01-15T10:30:15Z"
      }
    ]
  }
}
```

#### POST /delivery/retry/{notificationId}
Retry failed notification delivery.

### 6. Webhook Management

#### POST /webhooks/delivery
Webhook endpoint for delivery status updates from external providers.

**Request Body:**
```json
{
  "messageId": "msg_123",
  "event": "delivered",
  "timestamp": "2024-01-15T10:30:45Z",
  "recipient": "user@example.com",
  "metadata": {}
}
```

## WebSocket Events

### Connection
```javascript
// Connect to WebSocket
const socket = io('/notifications', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Events

#### Client → Server

**Join User Room**
```javascript
socket.emit('join', { userId: 'uuid' });
```

**Mark as Read**
```javascript
socket.emit('markRead', { notificationId: 'uuid' });
```

#### Server → Client

**New Notification**
```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // data contains full notification object
});
```

**Notification Updated**
```javascript
socket.on('notificationUpdated', (data) => {
  console.log('Notification updated:', data);
  // data contains updated notification fields
});
```

**Bulk Updates**
```javascript
socket.on('bulkUpdate', (data) => {
  console.log('Multiple notifications updated:', data);
  // data contains array of notification updates
});
```

## Rate Limiting

- **General API**: 1000 requests per hour per user
- **Notification Creation**: 100 requests per hour per user
- **WebSocket connections**: 5 concurrent connections per user
- **Bulk operations**: 50 requests per hour per user

## Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (for delete operations)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Versioning

API uses URL versioning (`/v1/`, `/v2/`, etc.). Current version is `v1`.

## Deprecation Policy

- 6 months notice for breaking changes
- 3 months notice for feature deprecation
- Backward compatibility maintained for 1 major version