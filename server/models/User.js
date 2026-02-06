import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

const getCollection = () => getDb().collection('users');

export const User = {
    async findOne(query) {
        return await getCollection().findOne(query);
    },

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

    async create(userData) {
        const data = {
            ...userData,
            isActive: userData.isActive ?? true,
            role: userData.role || 'candidate',
            avatar: userData.avatar || 'https://via.placeholder.com/150',
            authProvider: userData.authProvider || 'local',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Hash password if present
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        const result = await getCollection().insertOne(data);
        return { ...data, _id: result.insertedId };
    },

    async findByIdAndUpdate(id, updateData, options = {}) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        const result = await getCollection().findOneAndUpdate(
            { _id },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after', ...options }
        );
        return result;
    },

    async find(query = {}) {
        return await getCollection().find(query).toArray();
    },

    async countDocuments(query = {}) {
        return await getCollection().countDocuments(query);
    },

    async findByIdAndDelete(id) {
        const _id = typeof id === 'string' ? new ObjectId(id) : id;
        return await getCollection().deleteOne({ _id });
    },

    // Instance-like methods (require user object)
    async comparePassword(user, enteredPassword) {
        if (!user.password) return false;
        return await bcrypt.compare(enteredPassword, user.password);
    },

    getSignedJwtToken(user) {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
    },

    async save(user) {
        // If password was recently updated (string instead of hash)
        if (user.password && !user.password.startsWith('$2a$')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }

        user.updatedAt = new Date();
        const { _id, ...updateData } = user;
        await getCollection().updateOne(
            { _id: typeof _id === 'string' ? new ObjectId(_id) : _id },
            { $set: updateData }
        );
        return user;
    }
};

export default User;
