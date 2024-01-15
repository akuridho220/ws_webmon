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
node authServer.js
```
    
atau

```
nodemon authServer.js
```

Dokumentasi dan workspace public api (Postman)

- [Dokumentasi]()
- [Workspace](https://www.postman.com/material-operator-32822973/workspace/webmon/collection/27677435-e6ef9964-e056-4b8b-849e-de22deb645a3?action=share&creator=27677435&active-environment=27677435-399f76cd-e6c5-4489-8990-b9ca81a66831)

