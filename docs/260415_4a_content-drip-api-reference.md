# Content Drip API - Quick Reference

**API Base**: `https://api.learnhouse.id/api/v1`

---

## Admin Endpoints

### 1. Get Course Drip Configuration

```http
GET /courses/{course_uuid}/drip
```

**Headers**:
- `Authorization: Bearer {admin_token}`

**Parameters**:
- `course_uuid` (path) - Course UUID

**Response** (200 OK):
```json
{
  "drip_mode": "DAYS_AFTER_ENROLLMENT",
  "activities": {
    "activity-uuid-1": {
      "available_from": null,
      "days_after_enrollment": 7,
      "prerequisite_activity_id": null
    },
    "activity-uuid-2": {
      "available_from": null,
      "days_after_enrollment": 14,
      "prerequisite_activity_id": null
    }
  }
}
```

**Errors**:
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Not authorized to manage this course
- `404 Not Found` - Course not found

---

### 2. Set Course Drip Mode

```http
PUT /courses/{course_uuid}/drip/mode
```

**Headers**:
- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**Body**:
```json
{
  "drip_mode": "DAYS_AFTER_ENROLLMENT"
}
```

**Valid drip_mode values**:
| Value | Description |
|-------|-------------|
| `null` | Disable drip (all content available) |
| `"BY_DATE"` | Content unlocks on specific dates |
| `"DAYS_AFTER_ENROLLMENT"` | Content unlocks X days after enrollment |
| `"SEQUENTIAL"` | Content unlocks sequentially by order |
| `"PREREQUISITE"` | Content requires prerequisite completion |

**Response** (200 OK):
```json
{
  "id": 1,
  "uuid": "course-uuid-xxx",
  "name": "Python Basics",
  "drip_mode": "DAYS_AFTER_ENROLLMENT",
  ...
}
```

**Errors**:
- `400 Bad Request` - Invalid drip_mode
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - No permission

---

### 3. Configure Activity Drip

```http
PUT /courses/{course_uuid}/drip/activity/{activity_uuid}
```

**Headers**:
- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**Body** (all fields optional):
```json
{
  "available_from": "2026-05-01T10:00:00Z",
  "days_after_enrollment": 7,
  "prerequisite_activity_id": 123
}
```

**Body Explanation**:

| Field | Used For | Format | Example |
|-------|----------|--------|---------|
| `available_from` | BY_DATE mode | ISO 8601 datetime | `"2026-05-01T10:00:00Z"` |
| `days_after_enrollment` | DAYS_AFTER_ENROLLMENT mode | Integer (days) | `7` or `14` |
| `prerequisite_activity_id` | PREREQUISITE mode | Integer activity ID | `123` |

**Examples by Mode**:

**BY_DATE**:
```json
{
  "available_from": "2026-05-15T14:30:00Z"
}
```

**DAYS_AFTER_ENROLLMENT**:
```json
{
  "days_after_enrollment": 7
}
```

**PREREQUISITE**:
```json
{
  "prerequisite_activity_id": 42
}
```

**SEQUENTIAL**:
```json
{}
```
(No additional config needed)

**Response** (200 OK):
```json
{
  "id": 5,
  "chapter_activity_id": 10,
  "course_id": 1,
  "org_id": 2,
  "available_from": "2026-05-01T10:00:00Z",
  "days_after_enrollment": null,
  "prerequisite_activity_id": null,
  "creation_date": "2026-04-15T10:30:00Z",
  "update_date": "2026-04-15T10:30:00Z"
}
```

**Errors**:
- `400 Bad Request` - Invalid activity or parameters
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - No permission
- `404 Not Found` - Activity not found

---

### 4. Remove Activity Drip

```http
DELETE /courses/{course_uuid}/drip/activity/{activity_uuid}
```

**Headers**:
- `Authorization: Bearer {admin_token}`

**Response** (204 No Content):
- Empty body

**Errors**:
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - No permission
- `404 Not Found` - Activity drip not found

---

## Student Endpoints

### Get Drip Status (All Activities)

```http
GET /courses/{course_uuid}/drip/status
```

**Headers**:
- `Authorization: Bearer {student_token}`

**Parameters**:
- `course_uuid` (path) - Course UUID

**Response** (200 OK):
```json
{
  "activities": {
    "activity-uuid-1": {
      "is_locked": false,
      "available_at": null,
      "reason": null
    },
    "activity-uuid-2": {
      "is_locked": true,
      "available_at": "2026-05-01T10:00:00Z",
      "reason": "Available on May 1, 2026"
    },
    "activity-uuid-3": {
      "is_locked": true,
      "available_at": "2026-04-22T00:00:00Z",
      "reason": "Available 7 days after enrollment"
    },
    "activity-uuid-4": {
      "is_locked": true,
      "available_at": null,
      "reason": "Complete the previous activity first"
    }
  ]
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `is_locked` | boolean | Whether activity is locked for this student |
| `available_at` | string \| null | ISO 8601 datetime when content becomes available (null if no date) |
| `reason` | string \| null | Human-readable reason why locked |

**Possible Reasons**:
- `null` - Content available
- `"Available on {date}"` - BY_DATE mode
- `"Available {days} after enrollment"` - DAYS_AFTER_ENROLLMENT mode
- `"Complete the previous activity first"` - SEQUENTIAL mode
- `"Complete '{activity_name}' to unlock"` - PREREQUISITE mode

**Errors**:
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Not enrolled in course
- `404 Not Found` - Course not found

---

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `204` | Success (no content) |
| `400` | Bad request (invalid parameters) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (no permission) |
| `404` | Not found (resource doesn't exist) |
| `409` | Conflict (e.g., activity already has drip config) |
| `500` | Server error |

---

## Request Examples

### cURL

**Get drip config**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.learnhouse.id/api/v1/courses/course-uuid-123/drip
```

**Set drip mode**:
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"drip_mode": "DAYS_AFTER_ENROLLMENT"}' \
  https://api.learnhouse.id/api/v1/courses/course-uuid-123/drip/mode
```

**Configure activity**:
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_after_enrollment": 7}' \
  https://api.learnhouse.id/api/v1/courses/course-uuid-123/drip/activity/activity-uuid-456
```

**Get student drip status**:
```bash
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  https://api.learnhouse.id/api/v1/courses/course-uuid-123/drip/status
```

### JavaScript (fetch)

```javascript
// Get drip configuration
const config = await fetch(
  '/api/v1/courses/{courseUuid}/drip',
  {
    headers: { Authorization: `Bearer ${token}` }
  }
).then(r => r.json());

// Set drip mode
await fetch(
  '/api/v1/courses/{courseUuid}/drip/mode',
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ drip_mode: 'DAYS_AFTER_ENROLLMENT' })
  }
);

// Get student drip status
const status = await fetch(
  '/api/v1/courses/{courseUuid}/drip/status',
  {
    headers: { Authorization: `Bearer ${token}` }
  }
).then(r => r.json());
```

### Python (requests)

```python
import requests

headers = {'Authorization': f'Bearer {token}'}

# Get drip config
response = requests.get(
  f'/api/v1/courses/{course_uuid}/drip',
  headers=headers
)
config = response.json()

# Set drip mode
requests.put(
  f'/api/v1/courses/{course_uuid}/drip/mode',
  headers=headers,
  json={'drip_mode': 'DAYS_AFTER_ENROLLMENT'}
)

# Configure activity
requests.put(
  f'/api/v1/courses/{course_uuid}/drip/activity/{activity_uuid}',
  headers=headers,
  json={'days_after_enrollment': 7}
)
```

---

## Rate Limiting

- **Admin endpoints**: 100 requests/minute per user
- **Student endpoints**: 1000 requests/minute per user

---

## Pagination

Student drip status endpoint supports pagination (future version):
- Currently returns all activities
- Will support `?limit=50&offset=0` in v2

---

## Versioning

Current API version: **v1**  
Base path: `/api/v1/courses/`

Breaking changes will increment version (e.g., `/api/v2/courses/`)

---

**Last Updated**: April 15, 2026
