import { Request, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  setPin,
  loginWithPin,
  generateBiometricRegistrationOptions,
  verifyBiometricRegistration,
  generateBiometricAuthOptions,
  verifyBiometricAuth,
  refreshAccessToken,
  logout,
} from '../services/authService';
import {
  registerSchema,
  setPinSchema,
  verifyPinSchema,
  refreshTokenSchema,
} from '../utils/validators';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

// Helper: send validation errors
function badRequest(res: Response, errors: z.ZodIssue[]) {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors:  errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
  });
}

// ─── POST /auth/register ──────────────────────────────────
export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const user = await registerUser(parsed.data);
    res.status(201).json({ success: true, message: 'Registration successful. Please set your PIN.', data: user });
  } catch (err: any) {
    res.status(409).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/pin/set ───────────────────────────────────
export async function setPinHandler(req: Request, res: Response) {
  const parsed = setPinSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const deviceInfo = req.headers['user-agent'];
    const result = await setPin(parsed.data.userId, parsed.data.pin, deviceInfo);
    res.json({ success: true, message: 'PIN set successfully', ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/pin/login ─────────────────────────────────
export async function pinLogin(req: Request, res: Response) {
  const parsed = verifyPinSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const deviceInfo = req.headers['user-agent'];
    const result = await loginWithPin(parsed.data.phone, parsed.data.pin, deviceInfo);
    res.json({ success: true, message: 'Login successful', data: result });
  } catch (err: any) {
    const status = err.message.includes('locked') ? 423 : 401;
    res.status(status).json({ success: false, message: err.message });
  }
}

// ─── GET /auth/biometric/register-options ─────────────────
export async function biometricRegisterOptions(req: AuthRequest, res: Response) {
  try {
    const options = await generateBiometricRegistrationOptions(req.user!.userId);
    res.json({ success: true, data: options });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/biometric/register ───────────────────────
export async function biometricRegister(req: AuthRequest, res: Response) {
  try {
    const deviceName = req.body.deviceName as string | undefined;
    const result = await verifyBiometricRegistration(req.user!.userId, req.body.response, deviceName);
    res.json({ success: true, message: 'Fingerprint registered successfully', data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/biometric/auth-options ────────────────────
export async function biometricAuthOptions(req: Request, res: Response) {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ success: false, message: 'Phone number required' });
    return;
  }

  try {
    const { options, userId } = await generateBiometricAuthOptions(phone);
    res.json({ success: true, data: { options, userId } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/biometric/verify ─────────────────────────
export async function biometricVerify(req: Request, res: Response) {
  const { userId, response } = req.body;
  if (!userId || !response) {
    res.status(400).json({ success: false, message: 'userId and response are required' });
    return;
  }

  try {
    const deviceInfo = req.headers['user-agent'];
    const result = await verifyBiometricAuth(userId, response, deviceInfo);
    res.json({ success: true, message: 'Biometric login successful', data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/refresh ───────────────────────────────────
export async function refreshToken(req: Request, res: Response) {
  const parsed = refreshTokenSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const result = await refreshAccessToken(parsed.data.refreshToken);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
}

// ─── POST /auth/logout ────────────────────────────────────
export async function logoutHandler(req: Request, res: Response) {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token required' });
    return;
  }

  try {
    await logout(token);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    logger.error('Logout error:', err);
    res.json({ success: true, message: 'Logged out' }); // Always return success
  }
}
