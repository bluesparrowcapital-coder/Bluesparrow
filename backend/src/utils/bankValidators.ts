import { z } from 'zod';

export const bankAccountSchema = z.object({
  accountNumber: z
    .string()
    .regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code (e.g. SBIN0001234)'),
  bankName: z.string().min(2, 'Bank name required').max(100),
  accountHolder: z.string().min(2, 'Account holder name required').max(100),
  accountType: z.enum(['SB', 'CA', 'NRE', 'NRO']).default('SB'), // NSE NMF II account type
  isDefault: z.boolean().optional().default(false),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
