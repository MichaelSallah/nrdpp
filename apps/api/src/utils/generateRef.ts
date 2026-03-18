import { prisma } from './prisma'

export async function generateRfqRef(entityCode: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.rfq.count({
    where: { entity: { code: entityCode } },
  })
  const seq = String(count + 1).padStart(3, '0')
  return `${entityCode}/RFQ/${year}/${seq}`
}
