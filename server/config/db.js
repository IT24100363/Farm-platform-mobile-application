import mongoose from 'mongoose';
import dns from 'dns';

const connectDB = async () => {
  try {
    if (process.env.MONGO_DNS_SERVERS) {
      const servers = process.env.MONGO_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean);
      if (servers.length) dns.setServers(servers);
    }

    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const conn = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB || 'farmer_customer_platform'
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Mongo connection error', error.message);
    process.exit(1);
  }
};

export default connectDB;
