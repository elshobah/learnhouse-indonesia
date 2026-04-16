# Payment Indonesia Integration Guide

## Overview
`PaymentIndonesiaCheckout` dan `PaymentIndonesiaButton` adalah component untuk menangani pembayaran manual via transfer bank atau QRIS tanpa payment gateway.

## Components

### 1. `PaymentIndonesiaCheckout.tsx`
Modal checkout yang menampilkan:
- Pilihan payment method (Transfer/QRIS)
- Amount yang harus ditransfer (harga + kode unik)
- Detail rekening bank atau QRIS image
- Polling status pembayaran otomatis

**Props:**
```typescript
interface PaymentIndonesiaCheckoutProps {
  courseId: string;           // Course ID/UUID
  courseName: string;         // Display name
  coursePrice: number;        // Price in IDR
  isOpen: boolean;            // Modal open state
  onClose: () => void;        // Close callback
  onSuccess?: () => void;     // Success callback
}
```

### 2. `PaymentIndonesiaButton.tsx`
Button yang membuka checkout modal. Auto-hides jika payment belum dikonfigurasi.

**Props:**
```typescript
interface PaymentIndonesiaButtonProps {
  courseId: string;           // Course ID/UUID
  courseName: string;         // Display name
  coursePrice: number;        // Price in IDR
  onSuccess?: () => void;     // Success callback
  className?: string;         // Tailwind classes
}
```

## Integration Example

### In CourseActionsMobile.tsx

```tsx
// Add import
import PaymentIndonesiaButton from '@components/Payment/PaymentIndonesiaButton';

// In render, alongside the existing Stripe offer:
{linkedOffers.length > 0 ? (
  // Existing Stripe offer UI
  ...
) : (
  <div className="space-y-3">
    {/* Payment Indonesia Option */}
    {coursePrice ? (
      <PaymentIndonesiaButton
        courseId={'course_' + courseuuid}
        courseName={course.name}
        coursePrice={coursePrice}
        onSuccess={() => {
          // Refresh enrollment or redirect to course
          router.refresh();
        }}
        className="w-full py-2"
      />
    ) : null}

    {/* Existing free enroll button */}
    {!coursePrice && (
      <button onClick={handleCourseAction} disabled={isActionLoading}>
        Start Course
      </button>
    )}
  </div>
)}
```

## Payment Flow

### Student Flow:
1. Student opens course page
2. Clicks "Pay Transfer/QRIS" button
3. Selects payment method (Transfer or QRIS)
4. System generates unique 3-digit code
5. Shows: **Price + Code = Final Amount to Transfer**
   - Example: 50,000 + 123 = 50,123
6. Student transfers exact amount
7. Clicks "Check Payment Status"
8. System polls API every 10 seconds (max 30 attempts = 5 minutes)
9. When admin verifies → enrollment auto-created → student gets access

### Admin Flow:
1. Admin goes to Dashboard → Payments → Manual Payment tab
2. Sees pending transactions
3. Verifies transaction (with optional proof image)
4. System auto-creates enrollment for student

## Database Schema

Tables created by migration `z5a6b7c8d9e0_add_payment_indonesia.py`:

### `org_payment_config`
```sql
id INT PRIMARY KEY
org_id INT FK → organization.id
bank_name VARCHAR         -- e.g. "BCA"
account_number VARCHAR    -- e.g. "1234567890"
account_holder VARCHAR    -- e.g. "PT Belajar Indonesia"
qris_image_url VARCHAR    -- URL to QRIS image
instruction_text VARCHAR  -- Markdown instructions
is_active BOOLEAN
created_at DATETIME
updated_at DATETIME
```

### `manual_transaction`
```sql
id INT PRIMARY KEY
transaction_id VARCHAR UNIQUE  -- UUID
student_user_id VARCHAR
course_id VARCHAR
org_id INT FK → organization.id
amount INT                 -- Base price (IDR)
unique_code INT           -- 3-digit code (100-999)
final_amount INT          -- amount + unique_code
status VARCHAR            -- pending|verified|expired|rejected
payment_method VARCHAR    -- transfer|qris
verified_by VARCHAR       -- Admin user_id
verified_at DATETIME
proof_image_url VARCHAR
rejection_reason VARCHAR
expires_at DATETIME       -- 24h from creation
created_at DATETIME
updated_at DATETIME
```

## API Endpoints

All endpoints require org_id in URL path:

### Student Endpoints:
```
POST   /api/v1/orgs/{org_id}/payment-id/create
       ?student_user_id=123&course_id=456&course_price=100000&payment_method=transfer
       → Returns: ManualTransaction

GET    /api/v1/orgs/{org_id}/payment-id/{transaction_id}
       → Returns: ManualTransaction status
```

### Admin Endpoints:
```
GET    /api/v1/orgs/{org_id}/payment-id/pending?limit=50&offset=0
       → Returns: {transactions: [...], total: N}

GET    /api/v1/orgs/{org_id}/payment-id/config
       → Returns: OrgPaymentConfig | null

PUT    /api/v1/orgs/{org_id}/payment-id/config
       → Body: {bank_name?, account_number?, account_holder?, qris_image_url?, instruction_text?, is_active?}
       → Returns: OrgPaymentConfig

POST   /api/v1/orgs/{org_id}/payment-id/{transaction_id}/verify
       ?admin_user_id=789&proof_image_url=...
       → Returns: ManualTransaction (auto-creates enrollment)

POST   /api/v1/orgs/{org_id}/payment-id/{transaction_id}/reject
       ?admin_user_id=789&reason=Amount%20does%20not%20match
       → Returns: ManualTransaction
```

## Environment Setup

### Required:
- Migration applied: `z5a6b7c8d9e0_add_payment_indonesia.py`
- Backend router registered: ✅ Already in `src/router.py`
- Frontend services available: ✅ Already in `services/payment_indonesia.ts`

### Configuration:
Admin must configure at least one payment method:
1. Go to Dashboard → Payments tab
2. Click "Manual Payment" tab
3. Fill in bank details OR QRIS image URL
4. Click Save

## Known Limitations

1. **No automatic payment verification** - Admin must manually verify each transaction
2. **24-hour expiration** - Transactions older than 24h auto-expire (background task needed)
3. **No webhook integration** - No real-time bank notifications
4. **Manual enrollment** - Enrollment only created after admin verification

## TODO / Future Enhancements

1. [ ] Background task to auto-expire old transactions (APScheduler/Celery)
2. [ ] Admin-facing webhook receiver for bank notifications
3. [ ] Student can upload proof image when initiating payment
4. [ ] Email notifications when payment verified
5. [ ] Support for multiple bank accounts per organization
6. [ ] Payment history page for students
7. [ ] Refund management for admins
8. [ ] Integration with payment gateway validation APIs

## Testing Checklist

- [ ] Admin configures bank account at least
- [ ] Student clicks Payment Indonesia button
- [ ] Checkout modal opens and shows correct amount
- [ ] Copy button works
- [ ] Status check button works (shows loader)
- [ ] Admin dashboard shows pending transaction
- [ ] Admin can verify/reject transaction
- [ ] After verify, student gets enrollment
- [ ] Enrollment check shows student now owns course
