const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco_garbage_db';

  // Hide credentials when logging
  const safeUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log(`MongoDB connectee : ${safeUri}`);
  } catch (err) {
    console.error('Erreur connexion MongoDB:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB deconnectee.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnectee.');
  });
};

module.exports = connectDB;
