const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Password123!', 12)
  const result = await prisma.user.updateMany({ data: { passwordHash: hash } })
  console.log(`Reset passwords for ${result.count} users`)

  const users = await prisma.user.findMany({ select: { email: true, role: true, firstName: true, lastName: true } })
  users.forEach(u => console.log(`  ${u.role.padEnd(10)} ${u.email}  (${u.firstName} ${u.lastName})`))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
