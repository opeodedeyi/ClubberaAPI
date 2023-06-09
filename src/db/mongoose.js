const mongoose = require('mongoose');
require('dotenv').config();

const URI = process.env.MONGODB_ATLAS_URI;
mongoose.set('strictQuery', false);

mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose successfully connected to the database.');
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from the database.');
});
