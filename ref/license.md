# Referensi Lisensi GNU AGPL v3

## Tentang AGPL v3

LearnHouse Indonesia menggunakan **GNU Affero General Public License v3 (AGPL v3)**. Ini adalah lisensi copyleft yang sangat kuat dan memiliki implikasi penting untuk pengembangan.

---

## Aturan Pengembangan yang Harus Dipatuhi

### 1. **Open Source Wajib**
- Semua modifikasi dan turunan dari kode sumber LearnHouse HARUS dibagikan secara open source
- Tidak boleh membuat fork tertutup (private) yang menggunakan kode ini dalam produksi

### 2. **Network Service Clause (Yang Paling Penting)**
- Jika LearnHouse dijalankan sebagai **network service** atau SaaS, maka source code HARUS tetap dibagikan kepada pengguna
- Tidak boleh menyembunyikan modifikasi dari pengguna yang menggunakan layanan online
- User yang mengakses aplikasi melalui network berhak mendapatkan source code

### 3. **Tidak Boleh Menambah Restriksi**
- Lisensi asli dan semua perjanjian copyleft harus tetap utuh
- Tidak boleh menambahkan klausul yang membatasi kebebasan pengguna lebih dari yang ada di AGPL v3

### 4. **Attribution Harus Dipertahankan**
- Hak cipta asli dan penulis original harus dicantumkan
- Perubahan yang dibuat harus terdokumentasi

---

## Implikasi Praktis

| Boleh ✓ | Tidak Boleh ✗ |
|---------|--------------|
| Fork dan modifikasi untuk penggunaan internal | Menjual versi tertutup tanpa membagikan source |
| Menjalankan instance sendiri | Menyembunyikan modifikasi dari user yang pakai SaaS |
| Membagikan modifikasi dengan lisensi AGPL v3 | Menghapus lisensi atau merubah terms |
| Menambahkan fitur baru dan rilis sebagai AGPL v3 | Menggunakan AGPL v3 code tanpa memberikan source |

---

## Referensi Lengkap

- **File LICENSE**: Lihat `/LICENSE` di root project untuk teks lisensi lengkap
- **Official AGPL v3**: https://www.gnu.org/licenses/agpl-3.0.html
- **FAQ**: https://www.gnu.org/licenses/gpl-faq.html

---

## Catatan untuk Tim Pengembang

Setiap developer yang bekerja pada LearnHouse Indonesia harus:
1. Memahami klausul network service (sangat penting untuk SaaS)
2. Mendokumentasikan perubahan yang dibuat
3. Tidak menggunakan kode proprietary/lisensi inkompatibel tanpa persetujuan
4. Memastikan dependency juga compatible dengan AGPL v3

**Yang paling penting**: Jangan pernah mencoba "hide" modifikasi dari users, terutama dalam konteks SaaS/network service.
