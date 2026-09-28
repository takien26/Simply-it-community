import { prisma } from './db';

/**
 * Safely generates the next unique ticket number for the specified or current year (TK-YYYY-XXXX).
 * Prevents sequence collisions and string-sorting overflow (>9999 tickets) by checking
 * recent tickets by creation time and taking the true maximum numeric sequence.
 */
export async function generateNextTicketNumber(year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `TK-${currentYear}-`;

  // Fetch the most recently created tickets for the current year to find the true highest numeric sequence
  const recentTickets = await prisma.ticket.findMany({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
    select: { ticketNumber: true },
  });

  let nextSeq = 1;
  for (const t of recentTickets) {
    if (t.ticketNumber) {
      const match = t.ticketNumber.match(/^TK-\d{4}-(\d+)/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    }
  }

  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  let exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  let loopCount = 0;
  while (exists && loopCount < 100) {
    loopCount++;
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  }

  // Safe fallback under extreme concurrent burst: append micro-suffix
  if (exists) {
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
  }

  return candidate;
}
