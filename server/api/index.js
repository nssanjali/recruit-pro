/**
 * Vercel Serverless Function entry point.
 *
 * Vercel routes all /api/* requests here (see vercel.json rewrites).
 * We lazy-connect to MongoDB on the first request and reuse the
 * connection across warm invocations.
 */

import connectDB from '../config/db.js';
import app from '../index.js';

let isConnected = false;

export default async function handler(req, res) {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }

    // Delegate to the Express app
    return app(req, res);
}
