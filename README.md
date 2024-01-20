# Cara Menjalankan Web Service:

1. Masuk terminal lalu run

```
git clone https://git.stis.ac.id/fosil-spd-pkl/63/web-service-webmon.git
```

2. selanjutnya run

```
npm install
```

3. jalankan command berikut jika ingin pakai nodemon

```
npm install -g nodemon
```


4. Buat file connection.js, copy paste isi file connection.js.example ke connection.js

5. Edit file connection.js dengan mengisikan password postgres kalian dan juga nama database. (import databasenya terlebih dahulu di DBvearer atau PGadmin )

6. copy .env.example ubah jadi .env saja

7. run

```sh
node generate.js
```

untuk mengambil accesTokenSecret dan RefreshTokenSecret untuk dicopykan ke .env

8. run

```
node api.js
```

atau

```
nodemon api.js
```

# Dokumentasi API

- ## [Dokumentasi](https://documenter.getpostman.com/view/27677435/2s9YsQ6p72)
