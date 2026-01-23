import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('recruiter_assignments');

export const RecruiterAssignment = {
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
        const assignment = {
            ...data,
            candidatesFound: data.candidatesFound || 0,
            status: data.status || 'analyzing',
            timestamp: data.timestamp || new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(assignment);
        return { ...assignment, _id: result.insertedId };
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
    },

    async insertMany(docs) {
        const docsWithTimestamps = docs.map(doc => ({
            ...doc,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        const result = await getCollection().insertMany(docsWithTimestamps);
        return docsWithTimestamps.map((doc, i) => ({ ...doc, _id: result.insertedIds[i] }));
    }
};

export default RecruiterAssignment;
