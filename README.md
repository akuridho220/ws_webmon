Cara Jalanin Web Service:

1. Masuk terminal lalu run 'git clone https://git.stis.ac.id/fosil-spd-pkl/63/web-service-webmon.git' (tanpa tanda petik).
2. run

```sh
npm install
```

3. Buat file connection.js, copy paste isi file connection.js.example ke connection.js
4. Edit file connection.js dengan mengisikan password postgres kalian dan juga nama database. (import databasenya terlebih dahulu di DBvearer atau PGadmin )
5. copy .env.example ubah jadi .env saja
6. run

```sh
node generate.js
```

    untuk mengambil accesTokenSecret dan RefreshTokenSecret untuk dicopykan ke .env

7. run

```
node api.js'
```

    atau

```
'nodemon api.js
```

8. buka terminal lain run

```
'node authServer.js'
```

    atau

```
'nodemon authServer.js'
```
