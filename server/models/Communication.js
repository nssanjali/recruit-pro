import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('communications');

export const Communication = {
    async find(query = {}) {
        return await getCollection().find(query).sort({ createdAt: -1 }).toArray();
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
        const communication = {
            ...data,
            status: data.status || 'pending',
            automated: data.automated ?? true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await getCollection().insertOne(communication);
        return { ...communication, _id: result.insertedId };
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

    // Find scheduled communications that need to be sent
    async findScheduledDue() {
        return await getCollection().find({
            status: 'scheduled',
            scheduledFor: { $lte: new Date() }
        }).toArray();
    },

    // Get communication stats
    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await getCollection().aggregate([
            {
                $facet: {
                    emailsSent: [
                        {
                            $match: {
                                type: 'email',
                                status: 'sent',
                                sentAt: { $gte: today }
                            }
                        },
                        { $count: 'count' }
                    ],
                    scheduledReminders: [
                        {
                            $match: {
                                type: 'reminder',
                                status: 'scheduled'
                            }
                        },
                        { $count: 'count' }
                    ],
                    calendarInvites: [
                        {
                            $match: {
                                type: 'calendar',
                                status: 'sent'
                            }
                        },
                        { $count: 'count' }
                    ],
                    storedRecords: [
                        { $count: 'count' }
                    ]
                }
            }
        ]).toArray();

        const result = stats[0];
        return {
            emailsSent: result.emailsSent[0]?.count || 0,
            scheduledReminders: result.scheduledReminders[0]?.count || 0,
            calendarInvites: result.calendarInvites[0]?.count || 0,
            storedRecords: result.storedRecords[0]?.count || 0
        };
    },

    // Get communication history grouped by candidate
    async getStoredCommunications() {
        return await getCollection().aggregate([
            {
                $match: {
                    recipientId: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'recipientId',
                    foreignField: '_id',
                    as: 'recipient'
                }
            },
            { $unwind: '$recipient' },
            {
                $group: {
                    _id: '$recipientId',
                    candidate: { $first: '$recipient.name' },
                    totalMessages: { $sum: 1 },
                    lastContact: { $max: '$sentAt' },
                    interviews: {
                        $sum: {
                            $cond: [{ $eq: ['$relatedTo.type', 'interview'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    candidate: 1,
                    totalMessages: 1,
                    lastContact: 1,
                    interviews: 1,
                    status: 'Active'
                }
            },
            { $sort: { lastContact: -1 } }
        ]).toArray();
    }
};

export default Communication;
