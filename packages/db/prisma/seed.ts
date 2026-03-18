import { PrismaClient, Role, SupplierStatus, RfqCategory, RfqStatus, DocumentType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding NRDPP database...')

  // ── Categories ────────────────────────────────────────────────
  const catICT = await prisma.category.upsert({
    where: { code: 'ICT' },
    update: {},
    create: { name: 'ICT & Technology', code: 'ICT', description: 'Information and Communication Technology' },
  })
  const catConstruction = await prisma.category.upsert({
    where: { code: 'CONST' },
    update: {},
    create: { name: 'Construction & Works', code: 'CONST', description: 'Civil and structural construction works' },
  })
  const catOffice = await prisma.category.upsert({
    where: { code: 'OFFICE' },
    update: {},
    create: { name: 'Office Supplies & Stationery', code: 'OFFICE', description: 'Office supplies, furniture and stationery' },
  })
  const catLogistics = await prisma.category.upsert({
    where: { code: 'LOG' },
    update: {},
    create: { name: 'Logistics & Transportation', code: 'LOG', description: 'Freight, haulage and logistics services' },
  })
  const catMedical = await prisma.category.upsert({
    where: { code: 'MED' },
    update: {},
    create: { name: 'Medical & Pharmaceutical', code: 'MED', description: 'Medical supplies, drugs and equipment' },
  })

  // ── Subcategories ─────────────────────────────────────────────
  await prisma.category.upsert({
    where: { code: 'ICT-HW' },
    update: {},
    create: { name: 'Hardware & Equipment', code: 'ICT-HW', parentId: catICT.id },
  })
  await prisma.category.upsert({
    where: { code: 'ICT-SW' },
    update: {},
    create: { name: 'Software & Licenses', code: 'ICT-SW', parentId: catICT.id },
  })

  // ── Buying Entity ─────────────────────────────────────────────
  const entity = await prisma.entity.upsert({
    where: { code: 'MOFEP' },
    update: {},
    create: {
      name: 'Ministry of Finance and Economic Planning',
      code: 'MOFEP',
      region: 'Greater Accra',
      type: 'Ministry',
      address: 'P.O. Box M40, Accra',
      phone: '+233302665132',
      email: 'info@mofep.gov.gh',
    },
  })

  const entity2 = await prisma.entity.upsert({
    where: { code: 'GHASC' },
    update: {},
    create: {
      name: 'Ghana Health Service',
      code: 'GHASC',
      region: 'Greater Accra',
      type: 'Agency',
      address: 'P.O. Box MB 190, Accra',
      phone: '+233302684067',
      email: 'info@ghsgh.org',
    },
  })

  // ── Admin User ────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@1234!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nrdpp.gov.gh' },
    update: {},
    create: {
      email: 'admin@nrdpp.gov.gh',
      passwordHash: adminHash,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+233200000000',
      role: Role.ADMIN,
    },
  })

  // ── Buyer Users ───────────────────────────────────────────────
  const buyerHash = await bcrypt.hash('Buyer@1234!', 12)
  const buyer1 = await prisma.user.upsert({
    where: { email: 'procurement@mofep.gov.gh' },
    update: {},
    create: {
      email: 'procurement@mofep.gov.gh',
      passwordHash: buyerHash,
      firstName: 'Kwame',
      lastName: 'Asante',
      phone: '+233244111222',
      role: Role.BUYER,
      entityId: entity.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'procurement@ghs.gov.gh' },
    update: {},
    create: {
      email: 'procurement@ghs.gov.gh',
      passwordHash: buyerHash,
      firstName: 'Abena',
      lastName: 'Mensah',
      phone: '+233244333444',
      role: Role.BUYER,
      entityId: entity2.id,
    },
  })

  // ── Supplier Users & Profiles ─────────────────────────────────
  const supplierHash = await bcrypt.hash('Supplier@1234!', 12)

  const sup1User = await prisma.user.upsert({
    where: { email: 'info@techghana.com' },
    update: {},
    create: {
      email: 'info@techghana.com',
      passwordHash: supplierHash,
      firstName: 'Kofi',
      lastName: 'Boateng',
      phone: '+233244555666',
      role: Role.SUPPLIER,
    },
  })
  const supplier1 = await prisma.supplier.upsert({
    where: { userId: sup1User.id },
    update: {},
    create: {
      userId: sup1User.id,
      companyName: 'TechGhana Solutions Ltd',
      registrationNo: 'CS000123456',
      taxId: 'C0012345678',
      ssnitNo: 'B1234567890',
      businessType: 'Limited Company',
      address: '15 Independence Ave',
      city: 'Accra',
      region: 'Greater Accra',
      status: SupplierStatus.ACTIVE,
      riskScore: 85,
    },
  })
  await prisma.supplierCategory.upsert({
    where: { supplierId_categoryId: { supplierId: supplier1.id, categoryId: catICT.id } },
    update: {},
    create: { supplierId: supplier1.id, categoryId: catICT.id },
  })

  const sup2User = await prisma.user.upsert({
    where: { email: 'contact@buildrite.com.gh' },
    update: {},
    create: {
      email: 'contact@buildrite.com.gh',
      passwordHash: supplierHash,
      firstName: 'Ama',
      lastName: 'Owusu',
      phone: '+233244777888',
      role: Role.SUPPLIER,
    },
  })
  const supplier2 = await prisma.supplier.upsert({
    where: { userId: sup2User.id },
    update: {},
    create: {
      userId: sup2User.id,
      companyName: 'BuildRite Construction Ltd',
      registrationNo: 'CS000234567',
      taxId: 'C0023456789',
      ssnitNo: 'B2345678901',
      businessType: 'Limited Company',
      address: '8 Ring Road Central',
      city: 'Accra',
      region: 'Greater Accra',
      status: SupplierStatus.ACTIVE,
      riskScore: 78,
    },
  })
  await prisma.supplierCategory.upsert({
    where: { supplierId_categoryId: { supplierId: supplier2.id, categoryId: catConstruction.id } },
    update: {},
    create: { supplierId: supplier2.id, categoryId: catConstruction.id },
  })

  const sup3User = await prisma.user.upsert({
    where: { email: 'sales@officepro.com.gh' },
    update: {},
    create: {
      email: 'sales@officepro.com.gh',
      passwordHash: supplierHash,
      firstName: 'Yaw',
      lastName: 'Darko',
      phone: '+233244999000',
      role: Role.SUPPLIER,
    },
  })
  const supplier3 = await prisma.supplier.upsert({
    where: { userId: sup3User.id },
    update: {},
    create: {
      userId: sup3User.id,
      companyName: 'OfficePro Supplies Ltd',
      registrationNo: 'CS000345678',
      taxId: 'C0034567890',
      ssnitNo: 'B3456789012',
      businessType: 'Limited Company',
      address: '22 Liberation Road',
      city: 'Accra',
      region: 'Greater Accra',
      status: SupplierStatus.ACTIVE,
      riskScore: 91,
    },
  })
  await prisma.supplierCategory.upsert({
    where: { supplierId_categoryId: { supplierId: supplier3.id, categoryId: catOffice.id } },
    update: {},
    create: { supplierId: supplier3.id, categoryId: catOffice.id },
  })

  // ── Sample RFQ ─────────────────────────────────────────────────
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 7)

  const rfq = await prisma.rfq.upsert({
    where: { referenceNo: 'MOFEP/RFQ/2025/001' },
    update: {},
    create: {
      referenceNo: 'MOFEP/RFQ/2025/001',
      title: 'Supply of Laptop Computers and Accessories',
      description: 'The Ministry of Finance invites quotations for the supply of laptop computers and accessories for use at the head office.',
      type: RfqCategory.GOODS,
      categoryId: catICT.id,
      entityId: entity.id,
      createdById: buyer1.id,
      status: RfqStatus.OPEN,
      budgetEstimate: 150000,
      currency: 'GHS',
      submissionDeadline: deadline,
      deliveryTimeline: '14 days after Purchase Order',
      evaluationCriteria: 'Price (40%), Technical Compliance (40%), Delivery Timeline (20%)',
      publishedAt: new Date(),
      minimumQuotations: 3,
    },
  })

  // RFQ Items
  await prisma.rfqItem.createMany({
    skipDuplicates: true,
    data: [
      { rfqId: rfq.id, itemNo: 1, description: 'Laptop Computer (Intel Core i7, 16GB RAM, 512GB SSD)', unit: 'Unit', quantity: 20, specifications: 'Windows 11 Pro, 15.6" FHD Display, Backlit Keyboard' },
      { rfqId: rfq.id, itemNo: 2, description: 'Laptop Bag', unit: 'Unit', quantity: 20, specifications: '15.6" compatible, water-resistant' },
      { rfqId: rfq.id, itemNo: 3, description: 'Wireless Mouse', unit: 'Unit', quantity: 20, specifications: 'USB receiver, ergonomic design' },
    ],
  })

  // Invite suppliers
  await prisma.rfqSupplier.upsert({
    where: { rfqId_supplierId: { rfqId: rfq.id, supplierId: supplier1.id } },
    update: {},
    create: { rfqId: rfq.id, supplierId: supplier1.id, optedIn: true },
  })

  console.log('✅ Seed complete!')
  console.log('\n📋 Login credentials:')
  console.log('  Admin:    admin@nrdpp.gov.gh       / Admin@1234!')
  console.log('  Buyer:    procurement@mofep.gov.gh / Buyer@1234!')
  console.log('  Supplier: info@techghana.com       / Supplier@1234!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
