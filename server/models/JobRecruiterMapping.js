import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

class JobRecruiterMapping {
    static async create(mappingData) {
        const db = getDb();
        const mapping = {
            ...mappingData,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: mappingData.status || 'active', // active, completed, cancelled
            matchScore: mappingData.matchScore || 0 // AI-calculated match score
        };

        const result = await db.collection('job_recruiter_mappings').insertOne(mapping);
        return { _id: result.insertedId, ...mapping };
    }

    static async find(query = {}) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.jobId && typeof query.jobId === 'string') {
            query.jobId = new ObjectId(query.jobId);
        }
        if (query.recruiterId && typeof query.recruiterId === 'string') {
            query.recruiterId = new ObjectId(query.recruiterId);
        }
        if (query.companyAdminId && typeof query.companyAdminId === 'string') {
            query.companyAdminId = new ObjectId(query.companyAdminId);
        }

        return await db.collection('job_recruiter_mappings').find(query).toArray();
    }

    static async findById(id) {
        const db = getDb();
        return await db.collection('job_recruiter_mappings').findOne({ _id: new ObjectId(id) });
    }

    static async findOne(query) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.jobId && typeof query.jobId === 'string') {
            query.jobId = new ObjectId(query.jobId);
        }
        if (query.recruiterId && typeof query.recruiterId === 'string') {
            query.recruiterId = new ObjectId(query.recruiterId);
        }

        return await db.collection('job_recruiter_mappings').findOne(query);
    }

    static async findByIdAndUpdate(id, updateData) {
        const db = getDb();
        const _id = typeof id === 'string' ? new ObjectId(id) : id;

        let update;
        if (Object.keys(updateData).some(key => key.startsWith('$'))) {
            update = { ...updateData };
            if (!update.$set) { update.$set = {}; }
            update.$set.updatedAt = new Date();
        } else {
            update = { $set: { ...updateData, updatedAt: new Date() } };
        }

        const result = await db.collection('job_recruiter_mappings').findOneAndUpdate(
            { _id },
            update,
            { returnDocument: 'after' }
        );
        return result;
    }

    static async findByIdAndDelete(id) {
        const db = getDb();
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        const result = await db.collection('job_recruiter_mappings').findOneAndDelete({ _id });
        return result;
    }

    // Get mappings with job and recruiter details
    static async findWithDetails(query = {}) {
        const db = getDb();

        if (query.recruiterId && typeof query.recruiterId === 'string') {
            query.recruiterId = new ObjectId(query.recruiterId);
        }
        if (query.companyAdminId && typeof query.companyAdminId === 'string') {
            query.companyAdminId = new ObjectId(query.companyAdminId);
        }

        const mappings = await db.collection('job_recruiter_mappings').find(query).toArray();

        // Populate job and recruiter details
        const mappingsWithDetails = await Promise.all(mappings.map(async (mapping) => {
            const job = await db.collection('jobs').findOne({ _id: mapping.jobId });
            const recruiter = await db.collection('recruiters').findOne({ _id: mapping.recruiterId });
            const recruiterUser = recruiter ? await db.collection('users').findOne({ _id: recruiter.userId }) : null;

            return {
                ...mapping,
                job: job ? {
                    _id: job._id,
                    title: job.title,
                    department: job.department,
                    location: job.location,
                    status: job.status
                } : null,
                recruiter: recruiter && recruiterUser ? {
                    _id: recruiter._id,
                    name: recruiterUser.name,
                    email: recruiterUser.email,
                    skills: recruiter.skills,
                    expertise: recruiter.expertise
                } : null
            };
        }));

        return mappingsWithDetails;
    }
}

export default JobRecruiterMapping;
