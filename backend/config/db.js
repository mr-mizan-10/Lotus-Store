const mongoose = require('mongoose');
const logger = require('../logger');

async function startInMemoryMongo() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    logger.info('Started in-memory MongoDB for testing');

    return {
      uri,
      stop: () => mongod.stop()
    };
  } catch (err) {
    logger.error('Failed to start in-memory MongoDB', {
      error: err.message
    });
    throw err;
  }
}

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    let inMemory;

    // Only allow in-memory MongoDB during testing
    if (!uri && process.env.NODE_ENV === 'test') {
      inMemory = await startInMemoryMongo();
      uri = inMemory.uri;
    }

    // Never silently fall back to an in-memory database
    if (!uri) {
      logger.error('MONGO_URI is not configured');
      process.exit(1);
    }

    await mongoose.connect(uri);

    // Mask password in URI for safe logging
    const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    logger.info(`MongoDB connected successfully to ${maskedUri}`);

    return inMemory;
  } catch (err) {
    logger.error('MongoDB connection error', {
      error: err.message
    });

    process.exit(1);
  }
};

module.exports = connectDB;