import { z } from 'zod';

// ─── Registration ─────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email:    z.string().email('Invalid email address'),
  phone:    z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)')
    .optional(),
});

// ─── PIN ──────────────────────────────────────────────────

export const setPinSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
  confirmPin: z.string(),
}).refine((data) => data.pin === data.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
});

export const verifyPinSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  pin:   z.string().min(4, 'Enter PIN or temporary password').max(30, 'Credential too long').regex(/^\S+$/, 'Credential cannot contain spaces'),
});

// ─── Refresh Token ────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput   = z.infer<typeof registerSchema>;
export type SetPinInput     = z.infer<typeof setPinSchema>;
export type VerifyPinInput  = z.infer<typeof verifyPinSchema>;
