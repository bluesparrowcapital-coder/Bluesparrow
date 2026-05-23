import { z } from 'zod';

// ─── Client Profile ───────────────────────────────────────

export const clientProfileSchema = z.object({
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)'),
  fullNameAsPan: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine((d) => {
      const dob = new Date(d);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    }, 'Must be at least 18 years old'),
  gender: z.enum(['M', 'F', 'T'], { message: 'Gender must be M, F or T' }),
  fatherOrSpouseName: z.string().min(2).max(100),
  motherName: z.string().min(2).max(100).optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED']).optional(),
  occupation: z.enum([
    'BUSINESS', 'SERVICE', 'PROFESSIONAL', 'AGRICULTURIST',
    'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER',
  ]),
  taxStatus: z.enum(['INDIVIDUAL', 'NRI', 'PIO', 'HUF', 'COMPANY', 'PARTNERSHIP']).default('INDIVIDUAL'),
  annualIncome: z.enum([
    'BELOW_1L', '1L_TO_5L', '5L_TO_10L', '10L_TO_25L',
    '25L_TO_50L', '50L_TO_1CR', 'ABOVE_1CR',
    'ABOVE_25L',  // legacy value — kept for backward compatibility
  ]).optional(),
  isPep: z.boolean().default(false),
  isRelatedToPep: z.boolean().default(false),
});

// ─── Address ──────────────────────────────────────────────

export const addressSchema = z.object({
  type: z.enum(['PERMANENT', 'CORRESPONDENCE']),
  addressLine1: z.string().min(5, 'Address too short').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().default('India'),
});

// ─── Nominee ──────────────────────────────────────────────

export const nomineeSchema = z.object({
  nominees: z
    .array(
      z.object({
        fullName:     z.string().min(2).max(100),
        relationship: z.enum([
          'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER',
          'BROTHER', 'SISTER', 'GRANDFATHER', 'GRANDMOTHER',
          'GRANDSON', 'GRANDDAUGHTER', 'OTHER',
        ]),
        dob:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        percentage:   z.number().int().min(1).max(100),
        guardianName: z.string().min(2).max(100).optional(),
        guardianRel:  z.string().max(50).optional(),
      })
    )
    .min(1, 'At least one nominee required')
    .max(3, 'Maximum 3 nominees allowed')
    .refine(
      (nominees) => nominees.reduce((sum, n) => sum + n.percentage, 0) === 100,
      'Nominee percentages must sum to 100'
    ),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;
export type AddressInput        = z.infer<typeof addressSchema>;
export type NomineeInput        = z.infer<typeof nomineeSchema>;
