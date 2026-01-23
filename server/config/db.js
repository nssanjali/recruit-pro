import { MongoClient } from 'mongodb';

let db = null;
let client = null;

const connectDB = async () => {
    try {
        // Only attempt connection if MongoDB URI is provided
        if (!process.env.MONGODB_URI) {
            console.log('⚠️  MONGODB_URI is not defined in .env');
            console.log('📝 Server will run without database connection');
            console.log('💡 To enable database: Update MONGODB_URI in .env with your MongoDB Atlas connection string');
            console.log('📚 See QUICK_START.md for setup instructions\n');
            return;
        }

        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();

        db = client.db();
        console.log(`✅ MongoDB Connected: ${client.options.srvHost || 'localhost'}`);

        return db;
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('❌ MONGODB CONNECTION ERROR:', error.message);
        console.log('📝 Server will continue without database connection');
        console.log('💡 Update MONGODB_URI in .env with your MongoDB Atlas connection string\n');
    }
};

export const isConnected = () => db !== null;

export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
};

export const getClient = () => client;

export default connectDB;
