# Cloudflare R2 Setup Guide

**Date**: April 15, 2026  
**Status**: ✅ Configuration Guide

Panduan lengkap untuk mengkonfigurasi Cloudflare R2 sebagai storage backend untuk media course.

## Prerequisites

1. Akun Cloudflare dengan akses ke R2
2. Bucket R2 yang sudah dibuat
3. R2 API Token dengan permission read dan write

## Langkah 1: Buat R2 API Token

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Buka **R2** → **Settings**
3. Scroll ke **API Tokens**
4. Click **Create API Token**
5. Pilih **Object Read & Write**
6. Copy dan simpan credentials:
   - **Access Key ID** (AWS_ACCESS_KEY_ID)
   - **Secret Access Key** (AWS_SECRET_ACCESS_KEY)

## Langkah 2: Setup Custom Domain (Opsional tapi Recommended)

1. Di R2 bucket, buka tab **Settings**
2. Scroll ke **Custom Domain**
3. Click **Connect Domain**
4. Masukkan domain Anda (e.g., `lmsmedia.elshobah.com`)
5. Ikuti instruksi CNAME setup

**Contoh CNAME Record:**
```
CNAME lmsmedia.elshobah.com → <bucket-name>.r2.cloudflarecustomdomains.com
```

## Langkah 3: Konfigurasi LearnHouse

### Via Environment Variables (Recommended untuk Production)

Tambahkan ke file `.env` atau environment setup:

```bash
# Enable S3 API storage
LEARNHOUSE_CONTENT_DELIVERY_TYPE=s3api

# R2 Bucket Configuration
LEARNHOUSE_S3_API_BUCKET_NAME=your-bucket-name
LEARNHOUSE_S3_API_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com

# R2 API Credentials (dari Langkah 1)
LEARNHOUSE_S3_API_ACCESS_KEY_ID=your-access-key-id
LEARNHOUSE_S3_API_SECRET_ACCESS_KEY=your-secret-access-key

# Custom Domain (dari Langkah 2, opsional)
LEARNHOUSE_S3_API_PUBLIC_URL_DOMAIN=https://lmsmedia.elshobah.com
```

### Via config.yaml (Development)

Edit `apps/api/config/config.yaml`:

```yaml
hosting_config:
  content_delivery:
    type: "s3api"
    s3api:
      bucket_name: "your-bucket-name"
      endpoint_url: "https://<account-id>.r2.cloudflarestorage.com"
      access_key_id: "your-access-key-id"
      secret_access_key: "your-secret-access-key"
      public_url_domain: "https://lmsmedia.elshobah.com"  # opsional
```

## Langkah 4: Verifikasi Setup

### Test Upload File

Gunakan endpoint ini untuk test upload:

```bash
curl -X POST "http://localhost:1338/api/v1/courses/" \
  -F "name=Test Course" \
  -F "description=Test" \
  -F "about=Test" \
  -F "public=false" \
  -F "thumbnail=@/path/to/image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Jika berhasil, response akan menunjukkan filename di field `thumbnail_image`.

### Check File di R2

1. Login ke Cloudflare Dashboard
2. R2 → Your Bucket
3. Verifikasi file muncul di struktur: `content/orgs/{org_uuid}/courses/{course_id}/thumbnails/`

## Environment Variables Reference

| Variable | Deskripsi | Required |
|----------|-----------|----------|
| `LEARNHOUSE_CONTENT_DELIVERY_TYPE` | Pilih `filesystem` atau `s3api` | Yes |
| `LEARNHOUSE_S3_API_BUCKET_NAME` | Nama bucket R2 Anda | Yes (if s3api) |
| `LEARNHOUSE_S3_API_ENDPOINT_URL` | R2 API endpoint | Yes (if s3api) |
| `LEARNHOUSE_S3_API_ACCESS_KEY_ID` | R2 Access Key ID | Yes (if s3api) |
| `LEARNHOUSE_S3_API_SECRET_ACCESS_KEY` | R2 Secret Access Key | Yes (if s3api) |
| `LEARNHOUSE_S3_API_PUBLIC_URL_DOMAIN` | Custom domain untuk serving files | No |

## Troubleshooting

### Error: "Unable to locate credentials"

**Penyebab**: AWS credentials tidak ditemukan atau tidak dikonfigurasi

**Solusi**:
1. Pastikan semua environment variables sudah diset dengan benar
2. Restart aplikasi setelah mengubah environment variables
3. Check logs untuk melihat konfigurasi yang ter-load

### Error: "S3 endpoint URL is not configured"

**Penyebab**: Endpoint URL R2 belum dikonfigurasi

**Solusi**:
1. Pastikan `LEARNHOUSE_S3_API_ENDPOINT_URL` sudah diset
2. Format endpoint harus: `https://<account-id>.r2.cloudflarestorage.com`
3. Jangan tambahkan trailing slash

### File Upload Berhasil tapi File URL Salah

**Penyebab**: Custom domain tidak dikonfigurasi atau salah

**Solusi**:
1. Set `LEARNHOUSE_S3_API_PUBLIC_URL_DOMAIN` ke custom domain Anda
2. Pastikan custom domain sudah ter-verify di Cloudflare
3. Jika tidak ada custom domain, gunakan R2 auto-generated URL

## Security Best Practices

1. **Jangan hardcode credentials** di config.yaml
2. **Gunakan environment variables** untuk production
3. **Rotate API tokens** secara berkala
4. **Limit API token permissions** ke read & write only
5. **Monitor R2 usage** di Cloudflare Dashboard
6. **Setup bucket lifecycle rules** untuk cleanup old files (opsional)

## Further Reading

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Custom Domain Setup](https://developers.cloudflare.com/r2/buckets/manage/#custom-domains)
