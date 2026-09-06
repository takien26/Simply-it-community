import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface VendorContact {
  id?: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  notes?: string;
}

function parseVendorContacts(vendor: any) {
  let contacts: VendorContact[] = [];
  let generalNotes = vendor.notes || '';

  if (vendor.notes && typeof vendor.notes === 'string') {
    const trimmed = vendor.notes.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed.contacts)) {
          contacts = parsed.contacts;
        }
        if (parsed.generalNotes !== undefined) {
          generalNotes = parsed.generalNotes;
        }
      } catch {}
    }
  }

  // Fallback if no contacts array stored in notes
  if (contacts.length === 0 && (vendor.contactPerson || vendor.phone || vendor.email)) {
    contacts = [
      {
        name: vendor.contactPerson || 'Đầu mối liên hệ',
        role: 'Đầu mối chính',
        phone: vendor.phone || '',
        email: vendor.email || '',
        isPrimary: true,
      },
    ];
  }

  return {
    ...vendor,
    contacts,
    generalNotes,
  };
}

export async function GET() {
  try {
    const rawVendors = await prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const data = rawVendors.map(parseVendorContacts);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, contactPerson, phone, email, contacts, generalNotes, address, website } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Tên nhà cung cấp là bắt buộc' }, { status: 400 });
    }

    // Process contacts list
    const contactsList: VendorContact[] = Array.isArray(contacts) && contacts.length > 0
      ? contacts
      : [
          {
            name: contactPerson?.trim() || 'Đầu mối liên hệ',
            role: 'Đầu mối chính',
            phone: phone?.trim() || '',
            email: email?.trim() || '',
            isPrimary: true,
          },
        ];

    const primaryContact = contactsList.find((c) => c.isPrimary) || contactsList[0];

    const notesPayload = JSON.stringify({
      contacts: contactsList,
      generalNotes: generalNotes || '',
    });

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        contactPerson: primaryContact?.name || null,
        phone: primaryContact?.phone || null,
        email: primaryContact?.email || null,
        address: address || null,
        website: website || null,
        notes: notesPayload,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: parseVendorContacts(vendor) }, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
