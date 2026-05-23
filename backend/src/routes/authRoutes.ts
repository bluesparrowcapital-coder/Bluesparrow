import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authMiddleware';
import {
  register,
  setPinHandler,
  pinLogin,
  biometricRegisterOptions,
  biometricRegister,
  biometricAuthOptions,
  biometricVerify,
  refreshToken,
  logoutHandler,
} from '../controllers/authController';

const router = Router();

// ─── Rate limiters ─────────────────────────────────────────

// Login: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many login attempts. Try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Register: 5 attempts per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { success: false, message: 'Too many registration attempts. Try again after an hour' },
});

// ─── Auth Routes ───────────────────────────────────────────

// Registration
router.post('/register', registerLimiter, register);

// PIN
router.post('/pin/set',   authenticate, setPinHandler);
router.post('/pin/login', loginLimiter,  pinLogin);

// Biometric / Fingerprint (WebAuthn)
router.get( '/biometric/register-options', authenticate,  biometricRegisterOptions);
router.post('/biometric/register',         authenticate,  biometricRegister);
router.post('/biometric/auth-options',     loginLimiter,  biometricAuthOptions);
router.post('/biometric/verify',           loginLimiter,  biometricVerify);

// Token management
router.post('/refresh', refreshToken);
router.post('/logout',  logoutHandler);

export default router;
