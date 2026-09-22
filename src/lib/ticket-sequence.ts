import { prisma } from './db';

/**
 * Safely generates the next unique ticket number for the specified or current year (TK-YYYY-XXXX).
 * Prevents sequence collisions by checking the highest existing sequence and verifying uniqueness.
 */
export async function generateNextTicketNumber(year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `TK-${currentYear}-`;

  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: 'desc',
    },
    select: { ticketNumber: true },
  });

  let nextSeq = 1;
  if (latestTicket?.ticketNumber) {
    const match = latestTicket.ticketNumber.match(/^TK-\d{4}-(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  }

  return candidate;
}
