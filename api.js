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
// Total sampel, listing, eligible
app.get('/api/dashboard/total-listing', (req, res) => {
  client.query(
    `
        SELECT
            COUNT(*) AS total_listing,
            (SELECT MAX(no_urut_ruta_egb) FROM rumahtangga) AS total_eligible,
            (SELECT COUNT(*) FROM datast) AS total_sampel
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

// Progress
app.get('/api/dashboard/progress', (req, res) => {
  client.query(
    `
      SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) AS tercacah
      FROM
          datast
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

// Progress per wilayah
app.get('/api/dashboard/progress-kab', (req, res) => {
  client.query(
    `
        SELECT
          k.nama_kab,
          COALESCE(COUNT(d.id_bs), 0) AS total,
          COALESCE(SUM(CASE WHEN d.status = '1' THEN 1 ELSE 0 END), 0) AS tercacah
      FROM
          kabupaten k
      LEFT JOIN
          datast d ON SUBSTRING(d.id_bs FROM 3 FOR 2) = k.id_kab
      GROUP BY
          k.nama_kab
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

// ENDPOINT FOR RISET
// Daftar Listing
// - bloksensus
app.get('/api/riset/daftar/listing/bs', (req, res) => {
  client.query(
    `
    SELECT
      rumahtangga.id_bs AS id_bs,
      bloksensus.id_tim,
      timpencacah.nama_tim,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
    LEFT JOIN timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    GROUP BY
      rumahtangga.id_bs,
      bloksensus.id_tim,
      timpencacah.nama_tim
    ORDER BY
      rumahtangga.id_bs ASC
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
      MIN(rumahtangga.id_bs) AS id_bs,
      kelurahan.nama_kel,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
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
      MIN(rumahtangga.id_bs) AS id_bs,
      kecamatan.nama_kec,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
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
      MIN(rumahtangga.id_bs) AS id_bs,
      MIN(kabupaten.nama_kab) AS nama_kabupaten,
      COUNT(*) AS jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
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
app.get('/api/riset/daftar/listing/all', (req, res) => {
  client.query(
    `
    SELECT
      rumahtangga.kode_ruta AS kode_ruta,
      rumahtangga.id_bs AS id_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg
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

// Daftar Sampel
// - bloksensus
app.get('/api/riset/daftar/sampel/bs', (req, res) => {
  client.query(
    `
    SELECT
      datast.id_bs AS id_bs,
      MIN(datast.kode_ruta) AS kode_ruta,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    GROUP BY
      datast.id_bs
    ORDER BY
      datast.id_bs ASC
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
      MIN(datast.id_bs) AS id_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
    bloksensus.id_kec,
      MIN(kecamatan.nama_kec) AS nama_kec,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.id_bs = datast.id_bs
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
      MIN(datast.id_bs) AS id_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      MIN(kabupaten.nama_kab) AS nama_kab,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.id_bs = datast.id_bs
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
      MIN(datast.id_bs) AS id_bs,
      bloksensus.id_prov,
      bloksensus.id_kab,
      bloksensus.id_kec,
      bloksensus.id_kel,
      MIN(kelurahan.nama_kel) AS nama_kel,
      COUNT(*) AS jumlah_sampel
    FROM
      datast
    LEFT JOIN
      bloksensus ON bloksensus.id_bs = datast.id_bs
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

// keseluruhan
app.get('/api/riset/daftar/sampel/all', (req, res) => {
  client.query(
    `
    SELECT
      datast.kode_ruta AS kode_ruta,
      datast.id_bs AS id_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
    LEFT JOIN
      keluarga_ruta ON rumahtangga.kode_ruta = keluarga_ruta.kode_ruta
    LEFT JOIN
      keluarga ON keluarga_ruta.kode_klg = keluarga.kode_klg 
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
      rumahtangga.id_bs AS id_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      rumahtangga.id_bs AS id_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      rumahtangga.id_bs AS id_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      rumahtangga.id_bs AS id_bs,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      rumahtangga
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      datast.id_bs AS id_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      datast.id_bs AS id_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      datast.id_bs AS id_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      datast.id_bs AS id_bs,
      datast.status AS status_cacah,
      rumahtangga.no_urut_ruta AS no_urut_ruta,
      rumahtangga.no_segmen,
      rumahtangga.nama_krt,
      rumahtangga.no_urut_ruta_egb,
      rumahtangga.lat AS lat,
      rumahtangga.long AS long,
      rumahtangga.nim_pencacah AS nim_pencacah,
      rumahtangga.jml_genz_anak AS jml_genz_anak,
      rumahtangga.jml_genz_dewasa AS jml_genz_dewasa,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim,
      mahasiswa.nama AS nama,
      keluarga.no_bg_fisik AS no_bf,
      keluarga.no_bg_sensus AS no_bs,
      keluarga.alamat AS alamat
    FROM
      datast
    LEFT JOIN
      rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    LEFT JOIN
      bloksensus ON rumahtangga.id_bs = bloksensus.id_bs
    LEFT JOIN
      timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN
      mahasiswa ON rumahtangga.nim_pencacah = mahasiswa.nim
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
      rumahtangga.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      COUNT(*) as jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
    GROUP BY
      rumahtangga.id_bs,
      bloksensus.id_tim
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

// Listing with specific tim
app.get('/api/riset/daftar/tim/listing/:id_tim', (req, res) => {
  const id_tim = req.params.id_tim;
  client.query(
    `
    SELECT
      rumahtangga.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      COUNT(*) as jumlah_listing
    FROM
      rumahtangga
    LEFT JOIN bloksensus ON bloksensus.id_bs = rumahtangga.id_bs
    WHERE bloksensus.id_tim = $1
    GROUP BY
      rumahtangga.id_bs,
      bloksensus.id_tim
    ORDER BY
      jumlah_listing ASC
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

// Sampel
app.get('/api/riset/daftar/tim/sampel', (req, res) => {
  client.query(
    `
    SELECT
      datast.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim AS nama_tim,
      COUNT(*) as jumlah_sampel
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    LEFT JOIN timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    GROUP BY
      datast.id_bs,
      bloksensus.id_tim,
      timpencacah.nama_tim
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

// Sampel with specific tim
app.get('/api/riset/daftar/tim/sampel/:id_tim', (req, res) => {
  const id_tim = req.params.id_tim;
  client.query(
    `
    SELECT
      datast.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      COUNT(*) as jumlah_sampel
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    WHERE bloksensus.id_tim = $1
    GROUP BY
      datast.id_bs,
      bloksensus.id_tim
    ORDER BY
      jumlah_sampel ASC
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

// - list tim
app.get('/api/riset/daftar/tim/list-tim', (req, res) => {
  client.query(
    `
        SELECT
            timpencacah.id_tim,
            timpencacah.nama_tim
        FROM
            timpencacah
        GROUP BY
            timpencacah.id_tim,
            timpencacah.nama_tim
        ORDER BY
            timpencacah.id_tim ASC
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
            mahasiswa.nama AS nama,
            mahasiswa.foto
        FROM
            timpencacah
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
            mahasiswa.nim,
            mahasiswa.nama AS nama,
            mahasiswa.foto
        FROM
            mahasiswa
        LEFT JOIN
            timpencacah ON timpencacah.nim_pml = mahasiswa.nim
        WHERE
            mahasiswa.id_tim = $1 AND timpencacah.nim_pml IS NULL
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

// Progres
// TIM
app.get('/api/riset/progres/tim', (req, res) => {
  client.query(
    `
    SELECT
      datast.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim AS nama_tim,
      COUNT(*) as jumlah_sampel_selesai
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    LEFT JOIN timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    WHERE datast.status = '2'
    GROUP BY
      datast.id_bs,
      bloksensus.id_tim,
      timpencacah.nama_tim
    ORDER BY
      jumlah_sampel_selesai ASC
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

// Detail Progres Tim
app.get('/api/riset/progres/tim/detail/:id_tim', (req, res) => {
  const id_tim = req.params.id_tim;
  client.query(
    `
    SELECT
      datast.*,
      bloksensus.id_tim AS id_tim,
      timpencacah.nama_tim AS nama_tim,
      rumahtangga.nama_krt AS nama_krt
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    LEFT JOIN timpencacah ON bloksensus.id_tim = timpencacah.id_tim
    LEFT JOIN rumahtangga ON datast.kode_ruta = rumahtangga.kode_ruta
    WHERE bloksensus.id_tim = $1
    GROUP BY
      bloksensus.id_tim,
      timpencacah.nama_tim,
      datast.kode_ruta,
      rumahtangga.nama_krt
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

// Progres Wilayah
app.get('/api/riset/progres/wilayah', (req, res) => {
  client.query(
    `
    SELECT
      datast.id_bs AS id_bs,
      bloksensus.id_tim AS id_tim,
      COUNT(*) as jumlah_sampel_selesai
    FROM
      datast
    LEFT JOIN bloksensus ON bloksensus.id_bs = datast.id_bs
    WHERE datast.status = '2'
    GROUP BY
      datast.id_bs,
      bloksensus.id_tim
    ORDER BY
      jumlah_sampel_selesai ASC
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
app.get('/api/monitoring-ppl', (req, res) => {
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

// Get All Kabupaten
app.get('/api/kabupaten', (req, res) => {
  client.query(
    `
    SELECT * FROM Kabupaten
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

// Kecamatan by kabupaten
app.get('/api/kecamatan/:id_kab', (req, res) => {
  const id_kab = req.params.id_kab;
  client.query(
    `
    SELECT * FROM Kecamatan
    WHERE id_kab = $1 
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

// Desa by kecamatan and kelurahan
app.get('/api/desa/:id_kab/:id_kec', (req, res) => {
  const id_kab = req.params.id_kab;
  const id_kec = req.params.id_kec;
  client.query(
    `
    SELECT * FROM Kelurahan
    WHERE id_kab = $1 AND id_kec = $2
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
