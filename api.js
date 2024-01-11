require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { client } = require('./connection');
const app = express();
const port = process.env.PORT;
const jwt = require('jsonwebtoken');

app.use(bodyParser.json());

app.use(cors());

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

client.connect((err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Connected');
  }
});

function validateToken(req, res, next) {
  //get token from request header
  const authHeader = req.headers['authorization'];
  const token = authHeader.split(' ')[1];
  //the request header contains the token "Bearer <token>", split the string and use the second value in the split array.
  if (token == null) res.sendStatus(400).send('Token not present');
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      res.status(403).send('Token invalid');
    } else {
      req.user = user;
      next(); //proceed to the next action in the calling function
    }
  }); //end of jwt.verify()
}

// Endpoint here
// ENDPOINT FOR DASHBOARD
app.get('/api/dashboard/total-listing', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            COUNT(*) AS total_listing
        FROM
            rumahtangga
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows[0]);
      } else {
        console.log(err.message);
      }
    }
  );
});

// ENDPOINT FOR RISET
// Daftar Listing
// - bloksensus
app.get('/api/riset/daftar/listing/bs', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            rumahtangga.no_bs AS kode_bs,
            MIN(posisi_pcl.nim) AS nim,
            MIN(mahasiswa.nama) AS nama_pcl,
            COUNT(*) AS jumlah_listing
        FROM
            rumahtangga
        LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN posisi_pcl ON posisi_pcl.nim = bloksensus.nim_pencacah
        LEFT JOIN mahasiswa ON mahasiswa.nim = bloksensus.nim_pencacah
        GROUP BY
            rumahtangga.no_bs
        ORDER BY
            rumahtangga.no_bs DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - desa/kelurahan
app.get('/api/riset/daftar/listing/desa', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(rumahtangga.no_bs) AS kode_bs,
            bloksensus.id_kelurahan AS kode_kelurahan,
            MIN(kelurahan.nama_kelurahan) AS nama_desa,
            COUNT(*) AS jumlah_listing
        FROM
            rumahtangga
        LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN kelurahan ON kelurahan.id_kelurahan = bloksensus.id_kelurahan
        GROUP BY
            bloksensus.id_kelurahan
        ORDER BY
            bloksensus.id_kelurahan DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});
// - kacamatan
app.get('/api/riset/daftar/listing/kec', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(rumahtangga.no_bs) AS kode_bs,
            bloksensus.id_kec AS kode_kecamatan,
            MIN(kecamatan.nama_kec) AS nama_kecamatan,
            COUNT(*) AS jumlah_listing
        FROM
            rumahtangga
        LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN kecamatan ON kecamatan.id_kec = bloksensus.id_kec
        GROUP BY
            bloksensus.id_kec
        ORDER BY
            bloksensus.id_kec DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - kabupaten kota
app.get('/api/riset/daftar/listing/kab', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(rumahtangga.no_bs) AS kode_bs,
            bloksensus.id_kab AS kode_kabupaten,
            MIN(kabupaten.nama_kab) AS nama_kabupaten,
            COUNT(*) AS jumlah_listing
        FROM
            rumahtangga
        LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN kabupaten ON kabupaten.id_kab = bloksensus.id_kab
        GROUP BY
            bloksensus.id_kab
        ORDER BY
            bloksensus.id_kab DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - keseluruhan
//Detail Listing
// - bloksensus
// - desa
// - kecamatan
// - kabupaten

// Daftar Sampel
// - bloksensus
app.get('/api/riset/daftar/sampel/bs', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            datast.no_bs AS kode_bs,
            MIN(datast.kode_ruta) AS kode_ruta,
            MIN(posisi_pcl.nim) AS nim,
            MIN(mahasiswa.nama) AS nama_pcl,
            COUNT(*) AS jumlah_sampel
        FROM
            datast
        LEFT JOIN rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
        LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN posisi_pcl ON posisi_pcl.nim = bloksensus.nim_pencacah
        LEFT JOIN mahasiswa ON posisi_pcl.nim = mahasiswa.nim
        GROUP BY
            kode_bs
        ORDER BY
            kode_bs DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - kecamatan
app.get('/api/riset/daftar/sampel/kec', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(datast.no_bs) AS kode_bs,
            kecamatan.id_kec AS kode_kecamatan,
            MIN(kecamatan.nama_kec) AS nama_kecamatan,
            COUNT(*) AS jumlah_sampel
        FROM
            datast
        LEFT JOIN
            rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
        LEFT JOIN
            bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN
            kecamatan ON kecamatan.id_kec = bloksensus.id_kec
        GROUP BY
            kecamatan.id_kec
        ORDER BY
            kecamatan.id_kec DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - kabupaten
app.get('/api/riset/daftar/sampel/kab', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(datast.no_bs) AS kode_bs,
            kabupaten.id_kab AS kode_kabupaten,
            MIN(kabupaten.nama_kab) AS nama_kabupaten,
            COUNT(*) AS jumlah_sampel
        FROM
            datast
        LEFT JOIN
            rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
        LEFT JOIN
            bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN
            kabupaten ON kabupaten.id_kab = bloksensus.id_kab
        GROUP BY
            kabupaten.id_kab
        ORDER BY
            kabupaten.id_kab DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - desa / kelurahan
app.get('/api/riset/daftar/sampel/desa', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            MIN(datast.no_bs) AS kode_bs,
            kelurahan.id_kelurahan AS kode_kelurahan,
            MIN(kelurahan.nama_kelurahan) AS nama_kelurahan,
            COUNT(*) AS jumlah_sampel
        FROM
            datast
        LEFT JOIN
            rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
        LEFT JOIN
            bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN
            kelurahan ON kelurahan.id_kelurahan = bloksensus.id_kelurahan
        GROUP BY
            kelurahan.id_kelurahan
        ORDER BY
            kelurahan.id_kelurahan DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// Daftar Pertim
// Listing
app.get('/api/riset/daftar/tim/listing', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            rumahtangga.no_bs AS kode_bs,
            posisi_pcl.nim AS nim,
            mahasiswa.nama AS nama,
			mahasiswa.id_tim AS id_tim,
            COUNT(*) as jumlah_listing
        FROM
            rumahtangga
        LEFT JOIN
            bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN
            posisi_pcl ON posisi_pcl.nim = bloksensus.nim_pencacah
        LEFT JOIN
            mahasiswa ON posisi_pcl.nim = mahasiswa.nim
        GROUP BY
            rumahtangga.no_bs,
            posisi_pcl.nim,
            mahasiswa.nama,
			mahasiswa.id_tim
        ORDER BY
            jumlah_listing DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// Sampel
app.get('/api/riset/daftar/tim/sampel', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            rumahtangga.no_bs AS kode_bs,
            posisi_pcl.nim AS nim,
            mahasiswa.nama AS nama,
            mahasiswa.id_tim AS id_tim,
            COUNT(*) as jumlah_sampel
        FROM
            datast
        LEFT JOIN
            rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
        LEFT JOIN
            bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
        LEFT JOIN
            posisi_pcl ON posisi_pcl.nim = bloksensus.nim_pencacah
        LEFT JOIN
            mahasiswa ON posisi_pcl.nim = mahasiswa.nim
        GROUP BY
            rumahtangga.no_bs,
            posisi_pcl.nim,
            mahasiswa.nama,
            mahasiswa.id_tim
        ORDER BY
            jumlah_sampel DESC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - list tim
app.get('/api/riset/daftar/tim/list-tim', validateToken, (req, res) => {
  client.query(
    `
        SELECT
            mahasiswa.id_tim AS id_tim,
            lokus
        FROM
            posisi_pcl
        LEFT JOIN
            mahasiswa ON posisi_pcl.nim = mahasiswa.nim
        GROUP BY
            mahasiswa.id_tim,
            lokus
        ORDER BY
            id_tim ASC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// Endpoint for Monitoring PCL
app.get('/api/monitoring-pcl', validateToken, (req, res) => {
  client.query(
    `
        SELECT 
            posisi_pcl.nim AS nim,
            posisi_pcl.lokus AS lokus,
            posisi_pcl.latitude AS lat,
            posisi_pcl.longitude AS long,
            posisi_pcl.akurasi AS akurasi,
            posisi_pcl.time_created AS time_created,
            mahasiswa.nama AS nama,
            mahasiswa.id_tim as id_tim,
            mahasiswa.no_hp as no_hp
        FROM 
            posisi_pcl
        LEFT JOIN mahasiswa ON posisi_pcl.nim = mahasiswa.nim
        WHERE latitude IS NOT NULL
        ORDER BY nama ASC
        `,
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// Endpoint for Profile
