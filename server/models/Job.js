import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('jobs');

export const Job = {
    async find(query = {}) {
        return await getCollection().find(query).toArray();
    },

    async findById(id) {
        if (!id) return null;
        try {
            const _id = typeof id === 'string' ? new ObjectId(id) : id;
            return await getCollection().findOne({ _id });
        } catch (error) {
            return null;
        }
    },

    async create(data) {
        const job = {
            ...data,
            status: data.status || 'open', // open, closed, filled
            postedBy: typeof data.postedBy === 'string' ? new ObjectId(data.postedBy) : data.postedBy,
            candidates: data.candidates || [], // list of candidate ObjectIds
            applicationFormConfig: data.applicationFormConfig || null, // Custom form configuration
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(job);
        return { ...job, _id: result.insertedId };
    },

    async findByIdAndUpdate(id, updateData) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;

        // Check if updateData contains atomic operators (keys starting with $)
        const hasAtomicOperators = Object.keys(updateData).some(key => key.startsWith('$'));

        let update;
        if (hasAtomicOperators) {
            // If atomic operators are present, merge updatedAt into $set if it exists, or create it
            update = { ...updateData };
            if (!update.$set) {
                update.$set = {};
            }
            update.$set.updatedAt = new Date();
        } else {
            // Standard update: wrap in $set
            update = {
                $set: { ...updateData, updatedAt: new Date() }
            };
        }

        const result = await getCollection().findOneAndUpdate(
            { _id },
            update,
            { returnDocument: 'after' }
        );
        return result;
    },

    async findByIdAndDelete(id) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        return await getCollection().findOneAndDelete({ _id });
    },

    async deleteMany(query = {}) {
        return await getCollection().deleteMany(query);
    }
};

export default Job;
