import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

class Recruiter {
    static async create(recruiterData) {
        const db = getDb();
        const recruiter = {
            ...recruiterData,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Workload tracking
            activeJobs: recruiterData.activeJobs || [],
            pendingInterviews: recruiterData.pendingInterviews || 0,
            completedInterviews: recruiterData.completedInterviews || 0,
            // Profile for AI matching
            skills: recruiterData.skills || [],
            expertise: recruiterData.expertise || [],
            experience: recruiterData.experience || '',
            availability: recruiterData.availability || 'available', // available, busy, unavailable
            // Company association
            companyId: recruiterData.companyId,
            companyAdminId: recruiterData.companyAdminId,
            // Status
            status: recruiterData.status || 'active' // active, inactive
        };

        const result = await db.collection('recruiters').insertOne(recruiter);
        return { _id: result.insertedId, ...recruiter };
    }

    static async find(query = {}) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.companyId && typeof query.companyId === 'string') {
            query.companyId = new ObjectId(query.companyId);
        }
        if (query.companyAdminId && typeof query.companyAdminId === 'string') {
            query.companyAdminId = new ObjectId(query.companyAdminId);
        }
        if (query.userId && typeof query.userId === 'string') {
            query.userId = new ObjectId(query.userId);
        }

        return await db.collection('recruiters').find(query).toArray();
    }

    static async findById(id) {
        const db = getDb();
        return await db.collection('recruiters').findOne({ _id: new ObjectId(id) });
    }

    static async findOne(query) {
        const db = getDb();

        // Convert string IDs to ObjectId if needed
        if (query.userId && typeof query.userId === 'string') {
            query.userId = new ObjectId(query.userId);
        }
        if (query.companyId && typeof query.companyId === 'string') {
            query.companyId = new ObjectId(query.companyId);
        }

        return await db.collection('recruiters').findOne(query);
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

        const result = await db.collection('recruiters').findOneAndUpdate(
            { _id },
            update,
            { returnDocument: 'after' }
        );
        return result;
    }

    static async findByIdAndDelete(id) {
        const db = getDb();
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        const result = await db.collection('recruiters').findOneAndDelete({ _id });
        return result;
    }

    // Get recruiter with user details
    static async findWithUserDetails(query = {}) {
        const db = getDb();

        if (query.companyId && typeof query.companyId === 'string') {
            query.companyId = new ObjectId(query.companyId);
        }

        const recruiters = await db.collection('recruiters').find(query).toArray();

        // Populate user details
        const recruitersWithUsers = await Promise.all(recruiters.map(async (recruiter) => {
            const user = await db.collection('users').findOne({ _id: recruiter.userId });
            return {
                ...recruiter,
                user: user ? {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar
                } : null
            };
        }));

        return recruitersWithUsers;
    }

    // Calculate workload score for AI mapping
    static calculateWorkloadScore(recruiter) {
        const activeJobsWeight = 0.4;
        const pendingInterviewsWeight = 0.6;

        // Lower score = less workload = better candidate for assignment
        const activeJobsScore = (recruiter.activeJobs?.length || 0) * activeJobsWeight;
        const pendingInterviewsScore = (recruiter.pendingInterviews || 0) * pendingInterviewsWeight;

        return activeJobsScore + pendingInterviewsScore;
    }
}

export default Recruiter;
