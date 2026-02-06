import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

class Application {
    static async create(applicationData) {
        const db = getDb();
        const application = {
            ...applicationData,
            status: 'pending', // pending, reviewing, shortlisted, rejected, accepted
            appliedAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('applications').insertOne(application);
        return { _id: result.insertedId, ...application };
    }

    static async find(query = {}) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.candidateId && typeof query.candidateId === 'string') {
            query.candidateId = new ObjectId(query.candidateId);
        }
        if (query.jobId && typeof query.jobId === 'string') {
            query.jobId = new ObjectId(query.jobId);
        }

        return await db.collection('applications').find(query).toArray();
    }

    static async findById(id) {
        const db = getDb();
        return await db.collection('applications').findOne({ _id: new ObjectId(id) });
    }

    static async findOne(query) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.candidateId && typeof query.candidateId === 'string') {
            query.candidateId = new ObjectId(query.candidateId);
        }
        if (query.jobId && typeof query.jobId === 'string') {
            query.jobId = new ObjectId(query.jobId);
        }

        return await db.collection('applications').findOne(query);
    }

    static async findByIdAndUpdate(id, updateData) {
        const db = getDb();
        updateData.updatedAt = new Date();

        await db.collection('applications').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return await this.findById(id);
    }

    static async findByIdAndDelete(id) {
        const db = getDb();
        return await db.collection('applications').deleteOne({ _id: new ObjectId(id) });
    }

    // Get applications with job details populated
    static async findWithJobDetails(query = {}) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.candidateId && typeof query.candidateId === 'string') {
            query.candidateId = new ObjectId(query.candidateId);
        }

        return await db.collection('applications').aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'jobId',
                    foreignField: '_id',
                    as: 'job'
                }
            },
            { $unwind: '$job' },
            { $sort: { appliedAt: -1 } }
        ]).toArray();
    }
}

export default Application;

