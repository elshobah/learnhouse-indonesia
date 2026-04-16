# Payment Indonesia Components

Complete checkout UI for manual transfer/QRIS payment system tanpa payment gateway.

## Files

### 1. `PaymentIndonesiaCheckout.tsx`
Modal checkout utama dengan flow:
- Student pilih payment method (Transfer/QRIS)
- Backend generate kode unik 3 digit
- Display final amount = harga + kode
- Tampilkan detail rekening bank / QRIS image
- Auto-polling status pembayaran setiap 10 detik

**Fitur:**
- ✅ Copy-to-clipboard untuk nominal
- ✅ Auto-polling (max 30 checks = 5 menit)
- ✅ Display instruksi pembayaran dari config
- ✅ Real-time status dengan countdown

### 2. `PaymentIndonesiaButton.tsx`
Wrapper button yang auto-hide jika payment tidak dikonfigurasi.

**Props:**
```tsx
courseId: string          // Course ID/UUID
courseName: string        // Display name
coursePrice: number       // Price in IDR
onSuccess?: () => void    // Callback saat verified
className?: string        // Tailwind classes
```

### 3. `PaymentIndonesiaDemo.tsx`
Demo halaman untuk testing flow (opsional).

### 4. `INTEGRATION_GUIDE.md`
Dokumentasi lengkap dengan:
- Code examples
- API endpoints
- Database schema
- Flow diagrams
- Testing checklist

## Quick Start

### 1. Import
```tsx
import PaymentIndonesiaButton from '@components/Payment/PaymentIndonesiaButton';
```

### 2. Use in Course Page
```tsx
<PaymentIndonesiaButton
  courseId="course_123"
  courseName="My Course"
  coursePrice={100000}
  onSuccess={() => router.refresh()}
/>
```

### 3. Admin Setup
1. Go to Dashboard → Payments → Manual Payment tab
2. Fill in bank account OR QRIS image URL
3. Click Save

## Payment Flow

```
Student                         Backend                   Admin
  │
  ├─ Open checkout ─────────>
  │
  ├─ Select payment method ──>
  │
  │                        Generate kode unik
  │                        Simpan transaction (PENDING)
  │  <────── final_amount ──────
  │
  ├─ Transfer Rp[amount+code]
  │
  ├─ Click "Check Status" ──>
  │
  │                        Start polling (setiap 10s)
  │                                         │
  │                                         ├─> Admin verifies
  │                                         │   transaction
  │                                         │
  │                                         ├─> Update status
  │                                         │   to VERIFIED
  │                                         │
  │                                         ├─ Auto-create
  │                                         │  enrollment
  │  <─── Status: VERIFIED ──←
  │
  ├─ Success! Get course access
```

## Checklist Sebelum Production

- [ ] Migration `z5a6b7c8d9e0_add_payment_indonesia` sudah applied
- [ ] Admin sudah configure bank account atau QRIS
- [ ] Test flow dari student perspective
- [ ] Test payment verification dari admin dashboard
- [ ] Verify enrollment otomatis dibuat setelah verification
- [ ] Test 24-hour expiration handling
- [ ] Background task untuk auto-expire (jika diperlukan)

## Integrasi ke Course Page

Lihat INTEGRATION_GUIDE.md untuk contoh kode di CourseActionsMobile.tsx

## Testing

### Manual Test:
1. Akses halaman course (atau `/dev/payment-indonesia-demo` jika enabled)
2. Click Payment Indonesia button
3. Selesaikan checkout flow
4. Check admin dashboard untuk transaction
5. Verify dari admin
6. Confirm student dapat akses

### Automated (Future):
```bash
# Run test suite (belum ada, perlu dibuat)
npm test -- components/Payment
```

## Known Issues & Limitations

1. **Enrollment requirement:** Enrollment hanya dibuat setelah admin verify
2. **No auto-verification:** Perlu admin manual verify setiap transaksi
3. **24h expiration:** Transaction auto-expire jika tidak di-verify dalam 24 jam
4. **No webhooks:** Tidak ada real-time notification dari bank

## Roadmap

- [ ] Background task untuk auto-expire
- [ ] Student upload proof image saat checkout
- [ ] Email notification saat verified
- [ ] Payment history page
- [ ] Refund management
- [ ] Bank webhook receiver (advanced)
- [ ] API validation dengan bank

## Support

Untuk questions atau issues:
- Check INTEGRATION_GUIDE.md untuk detailed docs
- Run demo page untuk test flow
- Check admin dashboard → Payments untuk status
