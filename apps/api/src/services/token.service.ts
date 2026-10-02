import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { RefreshTokenModel, UserModel } from '../models';
import { AppError } from '../utils/errors';
import { signAccess, signRefresh, verifyRefresh, type RefreshPayload } from '../utils/jwt';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export async function issueTokens(
  user: { id: string; role: string },
  family: string = randomUUID(),
): Promise<IssuedTokens> {
  const jti = randomUUID();
  const refreshToken = signRefresh({ userId: user.id, role: user.role, jti, family });
  const decoded = jwt.decode(refreshToken) as { exp: number };
  await RefreshTokenModel.create({
    userId: user.id,
    jti,
    family,
    expiresAt: new Date(decoded.exp * 1000),
  });
  return { accessToken: signAccess({ userId: user.id, role: user.role }), refreshToken };
}

const invalid = () => new AppError(401, 'TOKEN_INVALID', 'Refresh token is invalid or expired');

/** Exchanges a refresh token for a new pair. Each refresh token works exactly once. */
export async function rotateRefreshToken(token: string): Promise<IssuedTokens> {
  let payload: RefreshPayload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw invalid();
  }

  // Atomic claim: only one concurrent request can consume a given token.
  const claimed = await RefreshTokenModel.findOneAndUpdate(
    { jti: payload.jti, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );
  if (!claimed) {
    // Token is unknown, or was already used: treat a replay as theft and kill the session.
    const known = await RefreshTokenModel.findOne({ jti: payload.jti });
    if (known) {
      await RefreshTokenModel.updateMany(
        { family: known.family, revokedAt: { $exists: false } },
        { revokedAt: new Date() },
      );
      throw new AppError(401, 'TOKEN_REUSED', 'Session expired, please sign in again');
    }
    throw invalid();
  }

  // Re-read the user so role changes and deletions take effect on refresh.
  const user = await UserModel.findById(claimed.userId);
  if (!user) throw invalid();
  return issueTokens({ id: user.id, role: user.role as string }, claimed.family);
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const { family } = verifyRefresh(token);
    await RefreshTokenModel.updateMany(
      { family, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
  } catch {
    /* expired or malformed: nothing to revoke */
  }
}
