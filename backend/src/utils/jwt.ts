import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

export interface JwtPayload {
  userId: string;
  role: string;
  phone: string;
}

// Access token — short lived (15 min)
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

// Refresh token — long lived (30 days)
export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

// Hash refresh token before storing in DB (security)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Refresh token expiry date
export function refreshTokenExpiry(): Date {
  const days = parseInt(REFRESH_EXPIRES.replace('d', ''), 10) || 30;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
