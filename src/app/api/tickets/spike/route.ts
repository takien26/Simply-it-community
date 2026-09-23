import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { detectActiveTicketSpikes, createIncidentFromSpikeCluster } from '@/lib/incident-clustering';

// GET /api/tickets/spike — Phát hiện các cụm bão ticket hiện tại
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '30', 10) || 30;
    const threshold = parseInt(searchParams.get('threshold') || '3', 10) || 3;

    const spikes = await detectActiveTicketSpikes(minutes, threshold);
    return NextResponse.json({ success: true, spikes });
  } catch (error: any) {
    console.error('Error fetching ticket spikes:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tickets/spike — Tạo Sự Cố Diện Rộng (Major Incident) và gộp toàn bộ ticket trong cụm
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cluster, customTitle } = body;

    if (!cluster || !Array.isArray(cluster.ticketIds) || cluster.ticketIds.length === 0) {
      return NextResponse.json({ error: 'Dữ liệu cụm ticket không hợp lệ' }, { status: 400 });
    }

    const incident = await createIncidentFromSpikeCluster(cluster, user.userId, customTitle);
    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating incident from ticket spike:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
