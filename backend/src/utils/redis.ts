import { createClient } from 'redis';
import { logger } from './logger';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => logger.error('Redis error:', err));
client.on('connect', () => logger.info('Redis connected'));

export async function connectRedis(): Promise<void> {
  await client.connect();
}

// ─── Generic helpers ───────────────────────────────────────

export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await client.set(key, value, { EX: ttlSeconds });
}

export async function redisGet(key: string): Promise<string | null> {
  return client.get(key);
}

export async function redisDel(key: string): Promise<void> {
  await client.del(key);
}

// ─── WebAuthn challenge store (TTL: 5 min) ────────────────

const CHALLENGE_TTL = 300; // 5 minutes

export async function storeChallenge(userId: string, challenge: string): Promise<void> {
  await redisSet(`webauthn:challenge:${userId}`, challenge, CHALLENGE_TTL);
}

export async function getChallenge(userId: string): Promise<string | null> {
  return redisGet(`webauthn:challenge:${userId}`);
}

export async function deleteChallenge(userId: string): Promise<void> {
  await redisDel(`webauthn:challenge:${userId}`);
}

// ─── PIN lockout store ────────────────────────────────────

export async function storePinLockout(userId: string, lockDurationSeconds: number): Promise<void> {
  await redisSet(`pin:lockout:${userId}`, '1', lockDurationSeconds);
}

export async function isPinLocked(userId: string): Promise<boolean> {
  const val = await redisGet(`pin:lockout:${userId}`);
  return val !== null;
}

export default client;
