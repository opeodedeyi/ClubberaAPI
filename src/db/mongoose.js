// Import the Mongoose library
const mongoose = require('mongoose');
// Load environment variables from the .env file
require('dotenv').config();

// Get the MongoDB connection URI from the environment variables
const URI = process.env.MONGODB_ATLAS_URI;

// Set strictQuery to false for the Mongoose connection
mongoose.set('strictQuery', false);

// Connect to MongoDB using the URI and specified options
mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Log a message when Mongoose successfully connects to the database
mongoose.connection.on('connected', () => {
  console.log('Mongoose successfully connected to the database.');
});

// Log an error message if there's a connection error
mongoose.connection.on('error', (err) => {
  console.error(`Mongoose connection error: ${err}`);
});

// Log a message when Mongoose disconnects from the database
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from the database.');
});
