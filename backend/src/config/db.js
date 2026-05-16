const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco_garbage_db');
    console.log('✅ MongoDB connectée');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
