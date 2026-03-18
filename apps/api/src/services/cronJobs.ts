import cron from 'node-cron'
import { prisma } from '../utils/prisma'
import { createNotification } from './notificationService'
import { NotificationType, RfqStatus } from '@prisma/client'

export function startCronJobs() {
  // ── Every hour: close expired RFQs ──────────────────────────────
  cron.schedule('0 * * * *', async () => {
    const expired = await prisma.rfq.findMany({
      where: { status: RfqStatus.OPEN, submissionDeadline: { lt: new Date() } },
    })
    for (const rfq of expired) {
      await prisma.rfq.update({ where: { id: rfq.id }, data: { status: RfqStatus.CLOSED, closedAt: new Date() } })

      // Check minimum quotations
      const quotationCount = await prisma.quotation.count({ where: { rfqId: rfq.id } })
      const buyers = await prisma.user.findMany({ where: { entityId: rfq.entityId, role: 'BUYER' } })
      for (const buyer of buyers) {
        await createNotification({
          userId: buyer.id,
          type: quotationCount < rfq.minimumQuotations ? NotificationType.ESCALATION : NotificationType.EVALUATION_PENDING,
          title: quotationCount < rfq.minimumQuotations ? `RFQ Closed — Below Minimum Quotations` : `RFQ Ready for Evaluation`,
          body: quotationCount < rfq.minimumQuotations
            ? `RFQ "${rfq.title}" received only ${quotationCount} quotation(s). Minimum required: ${rfq.minimumQuotations}. Consider re-publishing.`
            : `RFQ "${rfq.title}" closed with ${quotationCount} quotation(s). Please proceed with evaluation.`,
          metadata: { rfqId: rfq.id, quotationCount },
        })
      }

      console.log(`⏰ RFQ ${rfq.referenceNo} closed automatically`)
    }
  })

  // ── Daily at 8am: 24-hour deadline reminders ─────────────────────
  cron.schedule('0 8 * * *', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(tomorrow)
    dayAfter.setHours(dayAfter.getHours() + 24)

    const closingSoon = await prisma.rfq.findMany({
      where: { status: RfqStatus.OPEN, submissionDeadline: { gte: tomorrow, lt: dayAfter } },
      include: { suppliers: { include: { supplier: true } } },
    })

    for (const rfq of closingSoon) {
      const invited = rfq.suppliers.filter((s) => s.status === 'INVITED')
      for (const inv of invited) {
        await createNotification({
          userId: inv.supplier.userId,
          type: NotificationType.RFQ_DEADLINE_REMINDER,
          title: '⏰ RFQ Deadline in 24 Hours',
          body: `The submission deadline for "${rfq.title}" (${rfq.referenceNo}) is tomorrow. Submit your quotation now.`,
          metadata: { rfqId: rfq.id },
        })
      }
    }
  })

  // ── Daily at 9am: document expiry alerts ─────────────────────────
  cron.schedule('0 9 * * *', async () => {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)

    const expiringDocs = await prisma.supplierDocument.findMany({
      where: { expiryDate: { gte: new Date(), lte: in30Days } },
      include: { supplier: true },
    })

    for (const doc of expiringDocs) {
      await createNotification({
        userId: doc.supplier.userId,
        type: NotificationType.DOCUMENT_EXPIRY,
        title: 'Document Expiring Soon',
        body: `Your ${doc.type.replace(/_/g, ' ')} expires on ${doc.expiryDate!.toLocaleDateString()}. Please renew and upload the updated document.`,
        metadata: { documentId: doc.id, expiryDate: doc.expiryDate },
      })
    }
  })

  console.log('⏱️  Cron jobs started')
}
