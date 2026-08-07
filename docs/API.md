# Revelia API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.revelia.app/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Error message here"
}
```

## Endpoints

### Health Check

#### GET /api/health

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "Revelia API running"
}
```

---

## Authentication Endpoints

### POST /api/auth/signup
### POST /api/auth/login
### POST /api/auth/refresh
### POST /api/auth/logout

(To be documented)

---

## User Endpoints

### GET /api/user/profile
### PUT /api/user/profile
### POST /api/user/birth-data

(To be documented)

---

## Reading Endpoints

### POST /api/readings/face
### POST /api/readings/palm
### GET /api/readings
### GET /api/readings/:id

(To be documented)

---

*This document will be updated as endpoints are implemented.*
