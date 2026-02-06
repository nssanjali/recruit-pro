import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('calendarAvailability');

export const CalendarAvailability = {
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

    async findByUserId(userId) {
        const _userId = typeof userId === 'string' ? new ObjectId(userId) : userId;
        return await getCollection().findOne({ userId: _userId });
    },

    async create(data) {
        const availability = {
            ...data,
            workingHours: data.workingHours || {
                monday: { start: '09:00', end: '17:00', enabled: true },
                tuesday: { start: '09:00', end: '17:00', enabled: true },
                wednesday: { start: '09:00', end: '17:00', enabled: true },
                thursday: { start: '09:00', end: '17:00', enabled: true },
                friday: { start: '09:00', end: '17:00', enabled: true },
                saturday: { start: '09:00', end: '17:00', enabled: false },
                sunday: { start: '09:00', end: '17:00', enabled: false }
            },
            bufferTime: data.bufferTime || 15, // 15 minutes buffer
            timezone: data.timezone || 'Asia/Kolkata',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(availability);
        return { ...availability, _id: result.insertedId };
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

    async findByUserIdAndUpdate(userId, updateData) {
        const _userId = typeof userId === 'string' ? new ObjectId(userId) : userId;
        const result = await getCollection().findOneAndUpdate(
            { userId: _userId },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after', upsert: true }
        );
        return result;
    },

    async findByIdAndDelete(id) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        return await getCollection().findOneAndDelete({ _id });
    }
};

export default CalendarAvailability;
