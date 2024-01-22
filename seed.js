// other imports...
const fastcsv = require('fast-csv');
const { authClient } = require('./connection');
const fs = require('fs');
const contains = require('validator/lib/contains');
const bcrypt = require('bcrypt');

// other functions...

async function insertFromCsv(csvData) {
  // The insert statement
  const query = 'INSERT INTO users (name, password, email, jenis, jabatan) VALUES ($1, $2, $3, $4, $5)';
  // Connect to the db instance
  await authClient.connect(async (err, client) => {
    if (err) throw err;
    try {
      // loop over the lines stored in the csv data
      for (const row of csvData) {
        // For each line we run the insert query with the row providing the column values
        const hashedPassword = await bcrypt.hash(row[1], 10); // assuming the password is in the second column (index 1)

        // Replace the plain text password with the hashed one
        row[1] = hashedPassword;
        try {
          await client.query(query, row);
          console.log('inserted row:', row);
        } catch (error) {
          // We can just console.log any errors
          console.log(error.stack);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      console.log('Finished inserting rows');
      await client.end();
    }
  });
}

// all the other code from main.js

async function seed() {
  // Parse CSV data
  let csvData = [];
  await fastcsv
    .parseFile('./users.csv') // assuming 'users.csv' is the correct file path
    .validate((data) => !contains(data[0], ','))
    .on('data', (data) => {
      csvData.push(data);
    })
    .on('data-invalid', (row, rowNumber) => console.log(`Invalid [rowNumber=${rowNumber}] [row=${JSON.stringify(row)}]`))
    .on('end', async () => {
      // Insert CSV data into the users table
      await insertFromCsv(csvData);
    });
}

seed();
