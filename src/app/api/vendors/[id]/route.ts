import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VendorContact } from '../route';

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

  if (contacts.length === 0 && (vendor.contactPerson || vendor.phone || vendor.email)) {
    contacts.push({
      name: vendor.contactPerson || 'Đầu mối chính',
      role: 'Đầu mối chính',
      phone: vendor.phone || '',
      email: vendor.email || '',
      isPrimary: true,
    });
  }

  return {
    ...vendor,
    contacts,
    generalNotes,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: name.trim(),
        contactPerson: primaryContact?.name || null,
        phone: primaryContact?.phone || null,
        email: primaryContact?.email || null,
        address: address !== undefined ? address : undefined,
        website: website !== undefined ? website : undefined,
        notes: notesPayload,
      },
    });

    return NextResponse.json({ success: true, data: parseVendorContacts(updated) });
  } catch (error) {
    console.error('Update vendor error:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Vendor deactivated' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
