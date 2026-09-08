import { NextResponse } from 'next/server';
import { ALL_COOKIE_NAMES } from '@/lib/jwt';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  for (const name of ALL_COOKIE_NAMES) {
    response.cookies.delete(name);
  }

  return response;
}
