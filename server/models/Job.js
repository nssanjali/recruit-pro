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
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(job);
        return { ...job, _id: result.insertedId };
    },

    async findByIdAndUpdate(id, updateData) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        const result = await getCollection().findOneAndUpdate(
            { _id },
            { $set: { ...updateData, updatedAt: new Date() } },
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
