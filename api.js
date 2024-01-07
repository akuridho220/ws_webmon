const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const client = require('./connection');
const app = express();

app.use(bodyParser.json());

app.use(cors());

app.listen(3100, () => {
  console.log('Server running on port 3100');
});

client.connect((err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Connected');
  }
});

// Endpoint here
app.get('/tes', (req, res) => {
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


// ENDPOINT FOR DASHBOARD

// ENDPOINT FOR RISET
// Daftar Listing
// - bloksensus
app.get('/api/riset/daftar/listing/bs', (req, res) => {
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

// - kacamatan
app.get('/api/riset/daftar/listing/kec', (req, res) => {
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


// Endpoint for Monitoring PCL

// Endpoint for Profile