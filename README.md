# Cara Menjalankan Web Service:

1. Masuk terminal lalu run

```
git clone https://git.stis.ac.id/fosil-spd-pkl/63/web-service-webmon.git
```

2. selanjutnya run

```
npm install
```

3. jalankan command berikut jika ingin pakai nodemon dan db-migrate (untuk migrasi tabel database)

```
npm install -g nodemon
```

```
npm install -g db-migrate db-migrate-pg
```

4. Buat file `connection.js`, copy paste isi file `connection.js.example` ke `connection.js`

5. Edit file `connection.js` dengan mengisikan password postgres kalian dan juga nama database.

> [!NOTE]  
> untuk `client` diisikan `database CAPI` sementara untuk `authClient` diisikan `database khusus webmon`.

6. copy `.env.example` ubah jadi `.env` saja. Ubah bagian `Database` sesuai konfigurasi database kalian

7. run

```sh
node generate.js
```

untuk mengambil `accesTokenSecret` dan `RefreshTokenSecret` untuk dicopykan ke `.env`

8. Untuk migrate tabel database jalankan

```
db-migrate up
```

Lalu untuk seed database webmon khusus copy `users.example.csv` lalu ubah namanya menjadi `users.csv`. Isikan data `users.csv` berdasarkan akun yang mau dibuat

lalu jalankan command berikut

```
npm run seed
```

9. run

```
node api.js
```

atau

```
nodemon api.js
```

# Dokumentasi API

- ## [Dokumentasi](https://documenter.getpostman.com/view/27677435/2s9YsQ6p72)
