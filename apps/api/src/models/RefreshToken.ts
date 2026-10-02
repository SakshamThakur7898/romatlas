import { Schema, model } from 'mongoose';

// One document per issued refresh token. `family` groups a login session's rotation chain
// so that reuse of an already-rotated token can revoke the whole chain.
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jti: { type: String, required: true, unique: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
