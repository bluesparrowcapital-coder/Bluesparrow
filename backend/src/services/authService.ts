import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from '../utils/jwt';
import {
  storeChallenge,
  getChallenge,
  deleteChallenge,
  isPinLocked,
  storePinLockout,
} from '../utils/redis';
import { logger } from '../utils/logger';
import type { RegisterInput } from '../utils/validators';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_SECONDS = 30 * 60; // 30 minutes

// ─── WebAuthn config ───────────────────────────────────────
const RP_NAME = 'Blue Sparrow MF';
const RP_ID   = process.env.WEBAUTHN_RP_ID   || 'localhost';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  || 'http://localhost:5173';

// ─── REGISTRATION ─────────────────────────────────────────

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: data.phone }, { email: data.email }] },
  });

  if (existing) {
    if (existing.phone === data.phone) throw new Error('Phone number already registered');
    throw new Error('Email already registered');
  }

  const user = await prisma.user.create({
    data: {
      fullName:  data.fullName,
      email:     data.email,
      phone:     data.phone,
      panNumber: data.panNumber,
    },
    select: { id: true, fullName: true, email: true, phone: true, role: true, kycStatus: true },
  });

  logger.info(`User registered: ${user.phone}`);
  return user;
}

// ─── PIN SETUP ────────────────────────────────────────────

export async function setPin(userId: string, pin: string, deviceInfo?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, phone: true, role: true, kycStatus: true, pinHash: true, isActive: true },
  });

  if (!user || !user.isActive) throw new Error('User not found');
  if (user.pinHash) throw new Error('PIN already set. Use PIN login instead');

  const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { pinHash, pinSetAt: new Date(), pinAttempts: 0, pinLockedUntil: null },
  });

  logger.info(`PIN set for user: ${userId}`);
  return generateTokens(user, deviceInfo);
}

// ─── PIN LOGIN ────────────────────────────────────────────

export async function loginWithPin(phone: string, pin: string, deviceInfo?: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true, fullName: true, email: true, phone: true, role: true,
      kycStatus: true, pinHash: true, pinAttempts: true, isActive: true,
    },
  });

  if (!user || !user.isActive) throw new Error('Account not found');
  if (!user.pinHash) throw new Error('PIN not set. Please set your PIN first');

  // Check Redis lockout first (faster)
  if (await isPinLocked(user.id)) {
    throw new Error('Account locked due to too many wrong PINs. Try again in 30 minutes');
  }

  // Check DB lockout
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { pinLockedUntil: true } });
  if (dbUser?.pinLockedUntil && dbUser.pinLockedUntil > new Date()) {
    const remaining = Math.ceil((dbUser.pinLockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${remaining} minutes`);
  }

  const isValid = await bcrypt.compare(pin, user.pinHash);

  if (!isValid) {
    const newAttempts = user.pinAttempts + 1;

    if (newAttempts >= MAX_PIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + PIN_LOCKOUT_SECONDS * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: newAttempts, pinLockedUntil: lockedUntil },
      });
      await storePinLockout(user.id, PIN_LOCKOUT_SECONDS);
      throw new Error('Too many wrong PINs. Account locked for 30 minutes');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: newAttempts },
    });
    throw new Error(`Wrong PIN. ${MAX_PIN_ATTEMPTS - newAttempts} attempts remaining`);
  }

  // Reset attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: { pinAttempts: 0, pinLockedUntil: null },
  });

  return generateTokens(user, deviceInfo);
}

// ─── WEBAUTHN: Generate Registration Options ──────────────

export async function generateBiometricRegistrationOptions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { biometricCredentials: { where: { isActive: true }, select: { credentialId: true } } },
  });
  if (!user) throw new Error('User not found');

  const options = await generateRegistrationOptions({
    rpName:                  RP_NAME,
    rpID:                    RP_ID,
    userID:                  new TextEncoder().encode(user.id),
    userName:                user.phone,
    userDisplayName:         user.fullName,
    timeout:                 60000,
    attestationType:         'none',
    authenticatorSelection:  {
      authenticatorAttachment: 'platform',     // only built-in (fingerprint/face)
      requireResidentKey:      false,
      userVerification:        'required',     // forces biometric check
    },
    excludeCredentials: user.biometricCredentials.map((c) => ({
      id:         c.credentialId,
      transports: ['internal'] as AuthenticatorTransport[],
    })),
  });

  await storeChallenge(userId, options.challenge);
  return options;
}

// ─── WEBAUTHN: Verify Registration ────────────────────────

export async function verifyBiometricRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName?: string
) {
  const expectedChallenge = await getChallenge(userId);
  if (!expectedChallenge) throw new Error('Challenge expired. Please try again');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID:   RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Biometric registration failed');
  }

  await deleteChallenge(userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regInfo: any = verification.registrationInfo;
  const credId: string       = regInfo.credential?.id      ?? regInfo.credentialID;
  const credKey: Uint8Array  = regInfo.credential?.publicKey ?? regInfo.credentialPublicKey;
  const credCtr: number      = regInfo.credential?.counter  ?? regInfo.counter;

  await prisma.biometricCredential.create({
    data: {
      userId,
      credentialId: credId,
      publicKey:    Buffer.from(credKey),
      counter:      credCtr,
      deviceName:   deviceName || 'Unknown Device',
      transports:   (response.response.transports as string[]) ?? [],
    },
  });

  logger.info(`Biometric credential registered for user: ${userId}`);
  return { success: true };
}

// ─── WEBAUTHN: Generate Authentication Options ────────────

export async function generateBiometricAuthOptions(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      biometricCredentials: {
        where: { isActive: true },
        select: { credentialId: true, transports: true },
      },
    },
  });

  if (!user) throw new Error('Account not found');
  if (user.biometricCredentials.length === 0) {
    throw new Error('No biometric credentials registered. Please set up fingerprint first');
  }

  const options = await generateAuthenticationOptions({
    rpID:             RP_ID,
    timeout:          60000,
    userVerification: 'required',
    allowCredentials: user.biometricCredentials.map((c) => ({
      id:         c.credentialId,
      transports: c.transports as AuthenticatorTransport[],
    })),
  });

  await storeChallenge(user.id, options.challenge);
  return { options, userId: user.id };
}

// ─── WEBAUTHN: Verify Authentication ─────────────────────

export async function verifyBiometricAuth(
  userId: string,
  response: AuthenticationResponseJSON,
  deviceInfo?: string
) {
  const expectedChallenge = await getChallenge(userId);
  if (!expectedChallenge) throw new Error('Challenge expired. Please try again');

  const credential = await prisma.biometricCredential.findUnique({
    where: { credentialId: response.id, isActive: true },
  });
  if (!credential) throw new Error('Biometric credential not recognized');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifyOpts: any = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID:   RP_ID,
    requireUserVerification: true,
    credential: {
      id:         credential.credentialId,
      publicKey:  new Uint8Array(credential.publicKey),
      counter:    Number(credential.counter),
      transports: credential.transports as AuthenticatorTransport[],
    },
  };
  const verification = await verifyAuthenticationResponse(verifyOpts);

  if (!verification.verified) throw new Error('Biometric verification failed');

  await deleteChallenge(userId);

  // Update counter (replay-attack protection)
  await prisma.biometricCredential.update({
    where: { id: credential.id },
    data: {
      counter:    verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, phone: true, role: true, kycStatus: true, isActive: true },
  });
  if (!user || !user.isActive) throw new Error('Account not found');

  return generateTokens(user, deviceInfo);
}

// ─── REFRESH TOKEN ────────────────────────────────────────

export async function refreshAccessToken(rawRefreshToken: string) {
  const { verifyRefreshToken } = await import('../utils/jwt');
  const payload = verifyRefreshToken(rawRefreshToken);

  const hashed = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { token: hashed },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true, role: true, kycStatus: true, isActive: true } } },
  });

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }
  if (!stored.user.isActive) throw new Error('Account deactivated');

  // Token rotation — revoke old, issue new
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

  return generateTokens(stored.user);
}

// ─── LOGOUT ───────────────────────────────────────────────

export async function logout(rawRefreshToken: string) {
  const hashed = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: hashed },
    data: { isRevoked: true },
  });
}

// ─── Internal helper ──────────────────────────────────────

async function generateTokens(
  user: { id: string; fullName: string; email: string; phone: string; role: string; kycStatus: string },
  deviceInfo?: string
) {
  const payload = { userId: user.id, role: user.role, phone: user.phone };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId:     user.id,
      token:      hashToken(refreshToken),
      deviceInfo: deviceInfo || null,
      expiresAt:  refreshTokenExpiry(),
    },
  });

  return {
    user: {
      id:        user.id,
      fullName:  user.fullName,
      email:     user.email,
      phone:     user.phone,
      role:      user.role,
      kycStatus: user.kycStatus,
    },
    accessToken,
    refreshToken,
  };
}
