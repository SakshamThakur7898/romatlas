import { Schema, model } from 'mongoose';
import { ROLES, TARGET_TYPE } from './enums';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      match: /^[a-z0-9_]{3,30}$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: 'USER' },
    verified: { type: Boolean, default: false },
    followedDevices: [{ type: Schema.Types.ObjectId, ref: 'Device' }],
    followedRoms: [{ type: Schema.Types.ObjectId, ref: 'Rom' }],
    bookmarks: [
      {
        targetType: { type: String, enum: TARGET_TYPE, required: true },
        targetId: { type: Schema.Types.ObjectId, required: true },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export const UserModel = model('User', userSchema);
