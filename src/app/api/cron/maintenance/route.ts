import { NextRequest, NextResponse } from 'next/server';
import { runMaintenanceSchedulesCron } from '@/lib/maintenance-cron';

// GET /api/cron/maintenance
// Can be called by an external cron or internal timer
export async function GET(request: NextRequest) {
  try {
    const result = await runMaintenanceSchedulesCron();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await runMaintenanceSchedulesCron();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
