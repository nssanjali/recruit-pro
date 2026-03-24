/**
 * Vercel Serverless Function entry point.
 * Handles all /api/* requests by delegating to the Express app.
 * MongoDB connection is reused across warm invocations.
 */

import connectDB from '../server/config/db.js';
import app from '../server/index.js';

let isConnected = false;

export default async function handler(req, res) {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }

    return app(req, res);
}
