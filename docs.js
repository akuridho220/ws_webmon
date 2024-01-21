require('dotenv').config();

const express = require('express');

// import swagger ui module and swagger json file

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');

const app = express();

app.use(express.json());

// add route for swagger document API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.DOCS_PORT || 3200;
app.listen(PORT, () => {
  console.log(`Documentation Server is running on port ${PORT}.`);
});
