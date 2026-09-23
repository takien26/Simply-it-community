import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { detectSlaBreachRisks, processSlaEscalation } from '@/lib/sla-escalation';

// GET /api/tickets/sla-escalation — Quét và trả về danh sách ticket có nguy cơ vỡ SLA
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const risks = await detectSlaBreachRisks();
    return NextResponse.json({
      success: true,
      count: risks.length,
      tickets: risks,
      data: risks,
    });
  } catch (error: any) {
    console.error('Error in GET /api/tickets/sla-escalation:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tickets/sla-escalation — Kích hoạt tự động điều phối & cảnh báo khẩn cấp
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processSlaEscalation(user.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/tickets/sla-escalation:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
