import { NotificationType } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { createNotification } from './notificationService'

/**
 * Match suppliers to an RFQ based on category subscription,
 * invite them, and send notifications.
 */
export async function matchAndInviteSuppliers(rfqId: string, categoryId: string) {
  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: { category: true, entity: true },
  })
  if (!rfq) return

  // Find all ACTIVE suppliers subscribed to this category (or parent category)
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  const categoryIds = [categoryId, ...(category?.parentId ? [category.parentId] : [])]

  const matchedSuppliers = await prisma.supplier.findMany({
    where: {
      status: 'ACTIVE',
      categories: { some: { categoryId: { in: categoryIds } } },
      rfqInvitations: { none: { rfqId } }, // not already invited
    },
    include: { user: true },
  })

  if (matchedSuppliers.length === 0) return

  // Create invitations
  await prisma.rfqSupplier.createMany({
    data: matchedSuppliers.map((s) => ({ rfqId, supplierId: s.id })),
    skipDuplicates: true,
  })

  // Send notifications to each matched supplier
  for (const supplier of matchedSuppliers) {
    await createNotification({
      userId: supplier.userId,
      type: NotificationType.RFQ_INVITATION,
      title: 'New RFQ Invitation',
      body: `You have been invited to submit a quotation for "${rfq.title}" (${rfq.referenceNo}) by ${rfq.entity.name}. Deadline: ${rfq.submissionDeadline.toLocaleDateString()}.`,
      metadata: { rfqId: rfq.id, deadline: rfq.submissionDeadline },
    })
  }

  console.log(`✅ Matched and invited ${matchedSuppliers.length} suppliers to RFQ ${rfq.referenceNo}`)
}
