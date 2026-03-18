const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const NEW_CATS = [
  { name: 'ICT & Technology Equipment',          code: 'ICT' },
  { name: 'Office Equipment & Furniture',         code: 'OFFICE' },
  { name: 'Vehicles & Transport Equipment',       code: 'VEH' },
  { name: 'Medical & Laboratory Equipment',       code: 'MED' },
  { name: 'Industrial & Engineering Equipment',   code: 'IND' },
  { name: 'Energy & Utility Supplies',            code: 'ENERGY' },
  { name: 'Agricultural & Environmental Supplies',code: 'AGRI' },
  { name: 'Security & Safety Equipment',          code: 'SEC' },
  { name: 'Educational & Training Materials',     code: 'EDU' },
  { name: 'Consumables & General Supplies',       code: 'CONS' },
]

async function main() {
  console.log('Updating categories...')

  for (const cat of NEW_CATS) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: { name: cat.name, code: cat.code },
    })
    console.log('  ✓', cat.code, '-', cat.name)
  }

  // Remove old codes that are no longer needed
  const keepCodes = NEW_CATS.map(c => c.code)
  const deleted = await prisma.category.deleteMany({
    where: { code: { notIn: keepCodes }, parentId: null },
  })
  console.log(`  🗑 Removed ${deleted.count} old top-level categories`)

  console.log('Done!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
