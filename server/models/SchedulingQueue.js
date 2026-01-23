import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('scheduling_queue');

export const SchedulingQueue = {
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
        const item = {
            ...data,
            status: data.status || 'checking_recruiter',
            step: data.step || 1,
            proposedSlots: data.proposedSlots || [],
            timestamp: data.timestamp || new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(item);
        return { ...item, _id: result.insertedId };
    },

    async deleteMany(query = {}) {
        return await getCollection().deleteMany(query);
    },

    async insertMany(docs) {
        const docsWithTimestamps = docs.map(doc => ({
            ...doc,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const result = await getCollection().insertMany(docsWithTimestamps);
        return docsWithTimestamps.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] }));
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
    }
};

export default SchedulingQueue;
