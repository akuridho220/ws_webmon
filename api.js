require('dotenv').config();
const { activeAccessTokens } = require('./authServer');
const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');

const { client, authClient } = require('./connection');
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
  if (!activeAccessTokens.includes(token)) {
    return res.status(403).send('Token not active');
  }

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
app.get('/api/dashboard/total-listing', (req, res) => {
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
app.get('/api/riset/daftar/listing/bs', (req, res) => {
  client.query(
    `
    SELECT
      rumahtangga.no_bs AS kode_bs,
      MIN(mahasiswa.nim) AS nim,
      MIN(mahasiswa.nama) AS nama_pcl,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
	  LEFT JOIN bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    GROUP BY
      rumahtangga.no_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel
    ORDER BY
      rumahtangga.no_bs ASC
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
app.get('/api/riset/daftar/listing/desa', (req, res) => {
  client.query(
    `
    SELECT
      MIN(rumahtangga.no_bs) AS kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel,
      kelurahan.nama_kel,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
    LEFT JOIN kelurahan ON bloksensus.id_kel = kelurahan.id_kel AND bloksensus.id_kec = kelurahan.id_kec AND bloksensus.id_kab = kelurahan.id_kab
    GROUP BY
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel,
      kelurahan.nama_kel
    ORDER BY
      kelurahan.nama_kel ASC
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
app.get('/api/riset/daftar/listing/kec', (req, res) => {
  client.query(
    `
    SELECT
      MIN(rumahtangga.no_bs) AS kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      kecamatan.nama_kec,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
    LEFT JOIN kecamatan ON bloksensus.id_kec = kecamatan.id_kec AND bloksensus.id_kab = kecamatan.id_kab
    GROUP BY
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      kecamatan.nama_kec
    ORDER BY
      kecamatan.nama_kec ASC
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
app.get('/api/riset/daftar/listing/kab', (req, res) => {
  client.query(
    `
    SELECT
      MIN(rumahtangga.no_bs) AS kode_bs,
      bloksensus.id_prov,
	  kabupaten.id_kab,
        MIN(kabupaten.nama_kab) AS nama_kabupaten,
        COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
    LEFT JOIN kabupaten ON kabupaten.id_kab = bloksensus.id_kab
    GROUP BY
      bloksensus.id_prov,
      kabupaten.id_kab
	  ORDER BY 
		  kabupaten.nama_kab ASC
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

// Daftar Sampel
// - bloksensus
app.get('/api/riset/daftar/sampel/bs', (req, res) => {
  client.query(
    `
    SELECT
      datast.no_bs AS kode_bs,
      MIN(datast.kode_ruta) AS kode_ruta,
      MIN(mahasiswa.nim) AS nim,
      MIN(mahasiswa.nama) AS nama_pcl,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.no_bs = datast.no_bs
	  LEFT JOIN bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN mahasiswa ON bloksensus_mahasiswa.nim = mahasiswa.nim
    GROUP BY
      kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel
    ORDER BY
      kode_bs ASC
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
app.get('/api/riset/daftar/sampel/kec', (req, res) => {
  client.query(
    `
    SELECT
      MIN(datast.no_bs) AS kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
    bloksensus.id_kec,
      MIN(kecamatan.nama_kec) AS nama_kec,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.no_bs = datast.no_bs
    LEFT JOIN
      kecamatan ON kecamatan.id_kec = bloksensus.id_kec AND kecamatan.id_kab = bloksensus.id_kab
    GROUP BY
      bloksensus.id_prov,
      bloksensus.id_kab,
    bloksensus.id_kec,
      kecamatan.nama_kec
    ORDER BY
      kecamatan.nama_kec ASC
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
app.get('/api/riset/daftar/sampel/kab', (req, res) => {
  client.query(
    `
    SELECT
      MIN(datast.no_bs) AS kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      MIN(kabupaten.nama_kab) AS nama_kab,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.no_bs = datast.no_bs
    LEFT JOIN
      kabupaten ON kabupaten.id_kab = bloksensus.id_kab
    GROUP BY
      bloksensus.id_prov,
      bloksensus.id_kab,
      kabupaten.nama_kab
    ORDER BY
      kabupaten.nama_kab ASC
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
app.get('/api/riset/daftar/sampel/desa', (req, res) => {
  client.query(
    `
    SELECT
      MIN(datast.no_bs) AS kode_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
    bloksensus.id_kec,
    bloksensus.id_kel,
      MIN(kelurahan.nama_kel) AS nama_kel,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.no_bs = datast.no_bs
    LEFT JOIN
      kelurahan ON kelurahan.id_kel = bloksensus.id_kel AND kelurahan.id_kec = bloksensus.id_kec AND kelurahan.id_kab = bloksensus.id_kab
    GROUP BY
      bloksensus.id_prov,
      bloksensus.id_kab,
    bloksensus.id_kec,
    bloksensus.id_kel,
      kelurahan.nama_kel
    ORDER BY
      kelurahan.nama_kel ASC
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

// Detail Listing
// - kabupaten
app.get('/api/riset/daftar/listing/kab/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  client.query(
    `
    SELECT
      rumahtangga.kode_ruta AS kode_ruta,
      rumahtangga.no_bs AS kode_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
	    mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1
    `,
    [id_kab],
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
app.get('/api/riset/daftar/listing/kec/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);

  client.query(
    `
    SELECT
      rumahtangga.kode_ruta AS kode_ruta,
      rumahtangga.no_bs AS kode_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
	    mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2
    `,
    [id_kab, id_kec],
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
app.get('/api/riset/daftar/listing/desa/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);
  const id_kel = id.slice(7, 10);

  client.query(
    `
    SELECT
      rumahtangga.kode_ruta AS kode_ruta,
      rumahtangga.no_bs AS kode_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
      mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN 
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2 AND bloksensus.id_kel = $3
    `,
    [id_kab, id_kec, id_kel],
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - bloksensus
app.get('/api/riset/daftar/listing/bs/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);
  const id_kel = id.slice(7, 10);
  const kode_bs = id.slice(10, 14);

  client.query(
    `
    SELECT
      rumahtangga.kode_ruta AS kode_ruta,
      rumahtangga.no_bs AS kode_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
	    mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2 AND bloksensus.id_kel = $3 AND bloksensus.no_bs = $4
    `,
    [id_kab, id_kec, id_kel, kode_bs],
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// Detail Sampel
// - kabupaten
app.get('/api/riset/daftar/sampel/kab/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  client.query(
    `
    SELECT
      datast.kode_ruta AS kode_ruta,
      datast.no_bs AS kode_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
	    mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1
    `,
    [id_kab],
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
app.get('/api/riset/daftar/sampel/kec/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);
  client.query(
    `
    SELECT
      datast.kode_ruta AS kode_ruta,
      datast.no_bs AS kode_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
      mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2
    `,
    [id_kab, id_kec],
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
app.get('/api/riset/daftar/sampel/desa/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);
  const id_kel = id.slice(7, 10);
  client.query(
    `
    SELECT
      datast.kode_ruta AS kode_ruta,
      datast.no_bs AS kode_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
      mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2 AND bloksensus.id_kel = $3
    `,
    [id_kab, id_kec, id_kel],
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - blok sensus
app.get('/api/riset/daftar/sampel/bs/detail/:id', (req, res) => {
  const id = req.params.id;
  const id_kab = id.slice(2, 4);
  const id_kec = id.slice(4, 7);
  const id_kel = id.slice(7, 10);
  const kode_bs = id.slice(10, 14);
  client.query(
    `
    SELECT
      datast.kode_ruta AS kode_ruta,
      datast.no_bs AS kode_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.nama_krt,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      bloksensus.id_prov AS id_prov,
      bloksensus.id_kab AS id_kab,
      bloksensus.id_kec AS id_kec,
      bloksensus.id_kel AS id_kel,
      mahasiswa.nama AS nama_ppl,
      mahasiswa.nim AS nim,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.no_urut_klg_egb AS kode_egb,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.no_bs = bloksensus.no_bs
    LEFT JOIN
      bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN
      mahasiswa ON mahasiswa.nim = bloksensus_mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
    WHERE
      bloksensus.id_kab = $1 AND bloksensus.id_kec = $2 AND bloksensus.id_kel = $3 AND bloksensus.no_bs = $4
    `,
    [id_kab, id_kec, id_kel, kode_bs],
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
app.get('/api/riset/daftar/tim/listing', (req, res) => {
  client.query(
    `
    SELECT
      rumahtangga.no_bs AS kode_bs,
      mahasiswa.nim AS nim,
      mahasiswa.nama AS nama,
      mahasiswa.id_tim AS id_tim,
      COUNT(*) as jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
    LEFT JOIN bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN mahasiswa ON bloksensus_mahasiswa.nim = mahasiswa.nim
    GROUP BY
      rumahtangga.no_bs,
      mahasiswa.nim,
      mahasiswa.nama,
      mahasiswa.id_tim
    ORDER BY
      jumlah_listing ASC
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
app.get('/api/riset/daftar/tim/sampel', (req, res) => {
  client.query(
    `
    SELECT
      rumahtangga.no_bs AS kode_bs,
      mahasiswa.nim AS nim,
      mahasiswa.nama AS nama,
      mahasiswa.id_tim AS id_tim,
      COUNT(*) as jumlah_sampel
    FROM
      datast
    LEFT JOIN rumahtangga ON rumahtangga.kode_ruta = datast.kode_ruta
    LEFT JOIN bloksensus ON bloksensus.no_bs = rumahtangga.no_bs
    LEFT JOIN bloksensus_mahasiswa ON bloksensus.no_bs = bloksensus_mahasiswa.no_bs
    LEFT JOIN mahasiswa ON bloksensus_mahasiswa.nim = mahasiswa.nim
    GROUP BY
      rumahtangga.no_bs,
      mahasiswa.nim,
      mahasiswa.nama,
      mahasiswa.id_tim
    ORDER BY
      jumlah_sampel ASC
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
app.get('/api/riset/daftar/tim/list-tim', (req, res) => {
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

// - pml by tim
app.get('/api/riset/daftar/tim/pmlbytim/:id_tim', (req, res) => {
  const id_tim = req.params.id_tim;
  client.query(
    `
        SELECT
            timpencacah.*,
            posisi_pcl.*,
            mahasiswa.nama AS nama,
            mahasiswa.foto
        FROM
            timpencacah
        LEFT JOIN
            posisi_pcl ON posisi_pcl.nim = timpencacah.nim_pml
        LEFT JOIN
            mahasiswa ON mahasiswa.nim = timpencacah.nim_pml
        WHERE
            timpencacah.id_tim = $1
        `,
    [id_tim],
    (err, result) => {
      if (!err) {
        res.send(result.rows);
      } else {
        console.log(err.message);
      }
    }
  );
});

// - ppl by tim
app.get('/api/riset/daftar/tim/pplbytim/:id_tim', (req, res) => {
  const id_tim = req.params.id_tim;
  client.query(
    `
        SELECT
            timpencacah.*,
            posisi_pcl.*,
            mahasiswa.nama AS nama,
            mahasiswa.foto
        FROM
            posisi_pcl
        LEFT JOIN
            timpencacah ON timpencacah.nim_pml = posisi_pcl.nim
        LEFT JOIN
            mahasiswa ON mahasiswa.nim = posisi_pcl.nim
        WHERE
            mahasiswa.id_tim = $1
            AND timpencacah.nama_tim IS NULL
        `,
    [id_tim],
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
app.get('/api/monitoring-ppl',  (req, res) => {
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
app.get('/api/profile', validateToken, (req, res) => {
  user = req.user.user;

  user = {
    name: user.name,
    email: user.email,
    jenis: user.jenis,
    jabatan: user.jabatan,
  };

  if (!user) {
    res.status(403).send('Token invalid or User not Found');
  }
  res.json(user);
});

app.put('/api/updatePassword', validateToken, async (req, res) => {
  try {
    const thisuser = req.user.user;
    const { oldPassword, newPassword } = req.body;
    const email = thisuser.email;
    // Check if the user exists
    const userQuery = `SELECT * FROM users WHERE email = $1`;
    const userResult = await authClient.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).send('User tidak terdaftar dalam database');
    }

    // Check if the old password matches
    if (await bcrypt.compare(oldPassword, user.password)) {
      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      const updateQuery = `UPDATE users SET password = $1 WHERE email = $2`;
      await authClient.query(updateQuery, [hashedNewPassword, email]);

      res.status(200).send('Password berhasil diubah');
    } else {
      res.status(401).send('Password lama tidak sesuai');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating password');
  }
});
