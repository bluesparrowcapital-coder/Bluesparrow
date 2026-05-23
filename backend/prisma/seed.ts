import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Test user — pin: 1234
  const pinHash = await bcrypt.hash('1234', 10)
  const user = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: {
      phone:    '9999999999',
      email:    'test@bluesparrow.in',
      fullName: 'Test User',
      role:     'INVESTOR',
      pinHash,
      pinSetAt: new Date(),
      onboardingStep: 'REGISTERED',
    },
  })

  console.log(`✅ Test user created: phone=9999999999, PIN=1234, id=${user.id}`)
  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
