// Quick script to test MongoDB connection from the environment variable MONGODB_URI
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('No MONGODB_URI found in .env');
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(conn => {
    console.log('Connected to MongoDB host:', conn.connection.host);
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Mongo connection failed:', err.message);
    process.exit(1);
  });
