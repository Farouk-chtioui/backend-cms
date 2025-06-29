// test-mongodb-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;
console.log('Attempting to connect to MongoDB with URI:', mongoUri.replace(/:[^:]*@/, ':***@'));

mongoose.connect(mongoUri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    console.log('Connection state:', mongoose.connection.readyState);
    return mongoose.connection.db.admin().listDatabases();
  })
  .then((dbs) => {
    console.log('Available databases:');
    dbs.databases.forEach(db => console.log(`- ${db.name}`));
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
