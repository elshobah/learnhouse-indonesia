# Fix Summary: Cloudflare R2 Upload Configuration

## Masalah yang Dilaporkan

1. **Error saat tambah course baru**: `botocore.exceptions.NoCredentialsError: Unable to locate credentials`
2. **Status fitur upload media/gambar ke R2**: Belum berfungsi
3. **Custom domain URL untuk R2**: Belum dikonfigurasi (https://lmsmedia.elshobah.com)

## Root Cause

1. **Kredensial AWS tidak dikonfigurasi**: Boto3 S3 client dibuat tanpa AWS credentials
2. **Nama environment variable salah**: `.env` file menggunakan nama yang berbeda dari yang diharapkan kode
3. **Custom public URL domain tidak supported**: Config system tidak memiliki field untuk custom domain

## Perubahan yang Dilakukan

### 1. **config/config.py** - Update S3ApiConfig Model

Tambahkan field untuk mendukung credentials dan custom domain:
```python
class S3ApiConfig(BaseModel):
    bucket_name: str | None
    endpoint_url: str | None
    access_key_id: str | None          # NEW
    secret_access_key: str | None      # NEW
    public_url_domain: str | None      # NEW - custom domain URL
```

Tambahkan logic untuk membaca dari environment variables:
- `LEARNHOUSE_S3_API_ACCESS_KEY_ID`
- `LEARNHOUSE_S3_API_SECRET_ACCESS_KEY`
- `LEARNHOUSE_S3_API_PUBLIC_URL_DOMAIN`

### 2. **config/config.yaml** - Add S3 Configuration Template

```yaml
content_delivery:
  type: "s3api"
  s3api:
    bucket_name: ""
    endpoint_url: ""
    access_key_id: ""                    # NEW
    secret_access_key: ""                # NEW
    public_url_domain: ""                # NEW
```

### 3. **src/services/utils/upload_content.py** - Fix Boto3 Client Initialization

Sebelum:
```python
s3 = boto3.client("s3", endpoint_url=endpoint_url)
```

Sesudah:
```python
s3 = boto3.client(
    "s3",
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key_id,              # ADDED
    aws_secret_access_key=secret_access_key,      # ADDED
    region_name="auto",                           # ADDED for Cloudflare R2
)
```

Tambahkan validation untuk memastikan credentials tersedia:
```python
if not s3_config.access_key_id or not s3_config.secret_access_key:
    raise HTTPException(status_code=500, detail="S3 credentials are not configured")
```

Tambahkan helper function `get_file_url()` untuk konstruksi URL yang benar:
- Jika filesystem: return relative path `/files/...`
- Jika S3 dengan custom domain: return `https://lmsmedia.elshobah.com/...`
- Jika S3 tanpa custom domain: return `endpoint_url/bucket/...`

### 4. **.env File** - Fix Environment Variables

Sebelum (SALAH):
```bash
LEARNHOUSE_S3_API_ACCESS_KEY=...
LEARNHOUSE_S3_API_SECRET_KEY=...
```

Sesudah (BENAR):
```bash
LEARNHOUSE_S3_API_ACCESS_KEY_ID=158cc3b9865ceee6faf4b9557570b6cd
LEARNHOUSE_S3_API_SECRET_ACCESS_KEY=e129d2f3611e5f0de8709346dc76be8900045e973efb6d2fb375cdc8f92080c8
LEARNHOUSE_S3_API_PUBLIC_URL_DOMAIN=https://lmsmedia.elshobah.com
LEARNHOUSE_S3_API_ENDPOINT_URL=https://0d25c6d2228f7637de45df120c4203cc.r2.cloudflarestorage.com
```

### 5. **docs/CLOUDFLARE_R2_SETUP.md** - New Documentation

Dokumentasi lengkap tentang:
- Cara membuat R2 bucket dan API credentials
- Setup custom domain di Cloudflare
- Konfigurasi environment variables
- Testing dan troubleshooting
- Security best practices

## Testing Checklist

✅ **Environment Variables**
- [ ] Pastikan `.env` file memiliki semua variabel yang benar
- [ ] Restart aplikasi setelah perubahan

✅ **File Upload Test**
```bash
# Test upload course dengan thumbnail
curl -X POST "http://localhost:1338/api/v1/courses/" \
  -F "name=Test Course" \
  -F "description=Test description" \
  -F "about=About course" \
  -F "public=false" \
  -F "thumbnail=@/path/to/test-image.jpg" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

✅ **Verify File di R2**
1. Login ke Cloudflare Dashboard
2. R2 → Your Bucket (elslms)
3. Cek file tersimpan di: `content/orgs/{org_uuid}/courses/{course_id}/thumbnails/`

✅ **Verify Custom Domain**
1. Akses file melalui custom domain: `https://lmsmedia.elshobah.com/content/orgs/...`
2. File harus accessible dan tidak 404

## Known Issues & Notes

1. **Current State**: Kredensial sudah dikonfigurasi di `.env`, tapi pastikan aplikasi di-restart
2. **File URLs**: Saat ini filename saja yang disimpan di database. Frontend perlu:
   - Menggunakan `NEXT_PUBLIC_LEARNHOUSE_MEDIA_URL` untuk konstruksi URL
   - Atau API perlu di-update untuk return full URLs
3. **Migration Needed**: Jika ada file lama yang disimpan dengan filesystem method, perlu dimigrasi

## What's Working Now

✅ Boto3 S3 client akan mengirim credentials saat upload  
✅ Error handling untuk missing credentials/configuration  
✅ Support untuk custom public URL domain  
✅ Configuration dari environment variables atau yaml  

## Next Steps (Optional)

1. **Endpoint untuk serve files**: Setup endpoint `/api/v1/files/*` jika belum ada
2. **API Response Enhancement**: Modify response models untuk include full file URLs
3. **File Migration**: Migrate existing files dari filesystem ke R2 (jika ada)
4. **Cleanup**: Setup S3 bucket lifecycle rules untuk cleanup old files

## References

- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Boto3 S3 Documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/client/s3.html
- Setup Guide: `docs/CLOUDFLARE_R2_SETUP.md`

---

**Dibuat**: 2026-04-15  
**Affected Files**: 4 files modified, 1 documentation file added
