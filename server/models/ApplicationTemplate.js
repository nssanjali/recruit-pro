import { getDb } from '../config/db.js';
import { ObjectId } from 'mongodb';

class ApplicationTemplate {
    static async create(templateData) {
        const db = getDb();
        const template = {
            ...templateData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('applicationTemplates').insertOne(template);
        return { _id: result.insertedId, ...template };
    }

    static async find(query = {}) {
        const db = getDb();
        return await db.collection('applicationTemplates').find(query).toArray();
    }

    static async findById(id) {
        const db = getDb();
        return await db.collection('applicationTemplates').findOne({ _id: new ObjectId(id) });
    }

    static async findOne(query) {
        const db = getDb();
        return await db.collection('applicationTemplates').findOne(query);
    }

    static async findByIdAndUpdate(id, updateData) {
        const db = getDb();
        updateData.updatedAt = new Date();

        await db.collection('applicationTemplates').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return await this.findById(id);
    }

    static async findByIdAndDelete(id) {
        const db = getDb();
        return await db.collection('applicationTemplates').deleteOne({ _id: new ObjectId(id) });
    }

    // Get default template
    static async getDefault() {
        const db = getDb();
        return await db.collection('applicationTemplates').findOne({ isDefault: true });
    }
}

export default ApplicationTemplate;
