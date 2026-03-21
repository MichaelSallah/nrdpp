const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const users = await p.user.findMany({
    select: { email: true, role: true, firstName: true, lastName: true, isActive: true, entity: { select: { name: true, sector: true } } },
    orderBy: { role: 'asc' },
  });
  console.log('=== ALL USERS ===');
  for (const u of users) {
    console.log(`${u.role} | ${u.email} | ${u.firstName} ${u.lastName} | Active: ${u.isActive} | Entity: ${u.entity ? u.entity.name + ' (' + u.entity.sector + ')' : 'N/A'}`);
  }
  await p.$disconnect();
})();
