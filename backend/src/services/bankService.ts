import { PrismaClient } from '@prisma/client';
import type { BankAccountInput } from '../utils/bankValidators';

const prisma = new PrismaClient();

// ─── Add Bank Account ─────────────────────────────────────

export async function addBankAccount(userId: string, data: BankAccountInput) {
  const existingCount = await prisma.bankAccount.count({ where: { userId } });
  if (existingCount >= 5) throw new Error('Maximum 5 bank accounts allowed');

  // If isDefault requested, unset others first
  if (data.isDefault) {
    await prisma.bankAccount.updateMany({
      where: { userId },
      data:  { isDefault: false },
    });
  }

  // If first account, make it default automatically
  const makeDefault = data.isDefault || existingCount === 0;

  return prisma.bankAccount.create({
    data: {
      userId,
      accountNumber: data.accountNumber,
      ifscCode:      data.ifscCode.toUpperCase(),
      bankName:      data.bankName,
      accountHolder: data.accountHolder,
      isDefault:     makeDefault,
      isVerified:    false,   // Phase 2: penny drop / NACH verification
    },
  });
}

// ─── Get All Bank Accounts ────────────────────────────────

export async function getBankAccounts(userId: string) {
  return prisma.bankAccount.findMany({
    where:   { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: {
      id:            true,
      accountNumber: true,
      ifscCode:      true,
      bankName:      true,
      accountHolder: true,
      isDefault:     true,
      isVerified:    true,
      createdAt:     true,
    },
  });
}

// ─── Set Default Bank Account ─────────────────────────────

export async function setDefaultBankAccount(userId: string, accountId: string) {
  // Verify ownership
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error('Bank account not found');

  await prisma.bankAccount.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.bankAccount.update({
    where: { id: accountId },
    data:  { isDefault: true },
  });
}

// ─── Delete Bank Account ──────────────────────────────────

export async function deleteBankAccount(userId: string, accountId: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new Error('Bank account not found');

  await prisma.bankAccount.delete({ where: { id: accountId } });

  // If deleted account was default, make the oldest one default
  if (account.isDefault) {
    const next = await prisma.bankAccount.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (next) await prisma.bankAccount.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}
