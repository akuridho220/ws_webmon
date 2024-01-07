const express = require('express');
const bodyParser = require('body-parser');

const client = require('./connection');
const app = express();

app.use(bodyParser.json())

app.listen(3100, () => {
    console.log('Server running on port 3100');
})

client.connect(err => {
    if(err){
        console.log(err.message)
    } else {
        console.log('Connected')
    }
})


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
        `, (err, result) => {
        if(!err){
            res.send(result.rows)
        } else {
            console.log(err.message)
        }
    })
})