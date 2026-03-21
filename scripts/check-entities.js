const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const entities = await p.entity.findMany();
  console.log('Existing entities:');
  for (const e of entities) {
    console.log(e.id, e.name, '|', e.type, '|', e.sector);
  }
  await p.$disconnect();
})();
