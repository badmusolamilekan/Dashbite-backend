import mongoose from 'mongoose';

const setupConnectionListeners = () => {
  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting reconnect handled by driver.');
  });
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is missing from environment variables.');
    }

    const conn = await mongoose.connect(mongoUri, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    setupConnectionListeners();
    console.log(`MongoDB connected`);
    return conn;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`Failed to connect to MongoDB: ${error.message}`);
      process.exit(1);
    }

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      console.warn(`MongoDB connection failed . Falling back to an in-memory database for local development.`);
      const memoryServer = await MongoMemoryServer.create();
      const conn = await mongoose.connect(memoryServer.getUri(), {
        autoIndex: true,
      });

      setupConnectionListeners();
      console.log(`MongoDB connected `);
      return conn;
    } catch (memoryError) {
      console.error(`Failed to connect to MongoDB and failed to start in-memory MongoDB: ${memoryError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
