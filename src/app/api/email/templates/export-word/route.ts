import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  ShadingType,
} from 'docx';

const TEMPLATE_VARIABLES_GUIDE: Record<
  string,
  { name: string; description: string; variables: { tag: string; label: string; example: string }[] }
> = {
  'ticket.created': {
    name: 'Ticket Mới Được Tạo',
    description: 'Email tự động gửi cho người tạo hoặc người nhận khi một ticket mới được ghi nhận vào hệ thống.',
    variables: [
      { tag: '{{ticketNumber}}', label: 'Mã số ticket', example: 'TK-2026-0012' },
      { tag: '{{title}}', label: 'Tiêu đề sự cố / yêu cầu', example: 'Màn hình Dell bị chớp nháy liên tục' },
      { tag: '{{description}}', label: 'Chi tiết mô tả sự cố', example: 'Máy tính phòng Kế toán bật không lên hình...' },
      { tag: '{{priority}}', label: 'Mức độ ưu tiên', example: 'HIGH (Cao)' },
      { tag: '{{creatorName}}', label: 'Họ tên người tạo yêu cầu', example: 'Nguyễn Văn An' },
      { tag: '{{recipientName}}', label: 'Họ tên người nhận thông báo', example: 'Trần Thị Bích' },
      { tag: '{{slaDeadline}}', label: 'Thời hạn cam kết xử lý SLA', example: '17:00 30/08/2026' },
      { tag: '{{link}}', label: 'Đường dẫn liên kết mở ticket', example: 'http://localhost:3000/tickets' },
    ],
  },
  'ticket.assigned': {
    name: 'Ticket Được Phân Công Kỹ Thuật Viên',
    description: 'Email tự động thông báo cho kỹ thuật viên IT khi có ticket được giao phụ trách.',
    variables: [
      { tag: '{{ticketNumber}}', label: 'Mã số ticket', example: 'TK-2026-0012' },
      { tag: '{{title}}', label: 'Tiêu đề sự cố', example: 'Cài đặt phần mềm kế toán MISA' },
      { tag: '{{priority}}', label: 'Mức độ ưu tiên', example: 'MEDIUM' },
      { tag: '{{creatorName}}', label: 'Người yêu cầu', example: 'Phạm Minh Đức' },
      { tag: '{{assigneeName}}', label: 'Kỹ thuật viên phụ trách', example: 'Lê Hoàng IT' },
      { tag: '{{slaDeadline}}', label: 'Hạn chót giải quyết SLA', example: '12:00 29/08/2026' },
      { tag: '{{link}}', label: 'Đường dẫn xử lý ticket', example: 'http://localhost:3000/tickets' },
    ],
  },
  'ticket.resolved': {
    name: 'Ticket Đã Được Giải Quyết',
    description: 'Email tự động thông báo cho người dùng khi sự cố đã được xử lý xong kèm giải pháp.',
    variables: [
      { tag: '{{ticketNumber}}', label: 'Mã số ticket', example: 'TK-2026-0012' },
      { tag: '{{title}}', label: 'Tiêu đề ticket', example: 'Không truy cập được mạng nội bộ' },
      { tag: '{{resolutionNote}}', label: 'Phương án & Ghi chú xử lý của KTV', example: 'Đã cấu hình lại Gateway và cấp phát IP tĩnh mới.' },
      { tag: '{{resolvedBy}}', label: 'Kỹ thuật viên đã xử lý', example: 'Lê Hoàng IT' },
      { tag: '{{resolvedAt}}', label: 'Thời gian hoàn thành', example: '14:30 29/08/2026' },
      { tag: '{{link}}', label: 'Đường dẫn xem lại ticket', example: 'http://localhost:3000/tickets' },
    ],
  },
  'license.expiring': {
    name: 'Cảnh Báo License Sắp Hết Hạn',
    description: 'Email tự động cảnh báo bản quyền phần mềm hoặc thuê bao IT sắp hết hạn trước 30/15/7 ngày.',
    variables: [
      { tag: '{{licenseName}}', label: 'Tên phần mềm / License', example: 'Microsoft 365 Business Standard' },
      { tag: '{{vendorName}}', label: 'Nhà cung cấp / Đối tác', example: 'FPT Smart Cloud' },
      { tag: '{{daysRemaining}}', label: 'Số ngày còn lại', example: '15' },
      { tag: '{{expiryDate}}', label: 'Ngày hết hạn chính thức', example: '15/09/2026' },
      { tag: '{{totalSeats}}', label: 'Số lượng Seats / Bản quyền', example: '50' },
      { tag: '{{link}}', label: 'Đường dẫn xem chi tiết', example: 'http://localhost:3000/licenses' },
    ],
  },
  'approval.pending': {
    name: 'Yêu Cầu Phê Duyệt Mới',
    description: 'Email thông báo cho Quản lý hoặc IT Admin khi có đề xuất xin cấp thiết bị / phần mềm mới.',
    variables: [
      { tag: '{{requestCode}}', label: 'Mã phiếu yêu cầu', example: 'AR-2026-0008' },
      { tag: '{{requestType}}', label: 'Loại yêu cầu phê duyệt', example: 'Cấp mới thiết bị' },
      { tag: '{{requesterName}}', label: 'Nhân viên đề xuất', example: 'Nguyễn Thị Hoa' },
      { tag: '{{department}}', label: 'Phòng ban đề xuất', example: 'Phòng Thiết kế & Marketing' },
      { tag: '{{costEstimate}}', label: 'Dự toán kinh phí', example: '28.500.000 đ' },
      { tag: '{{justification}}', label: 'Lý do / Mục đích sử dụng', example: 'Phục vụ dựng video 4K cho chiến dịch mới...' },
      { tag: '{{approvalLink}}', label: 'Đường dẫn phê duyệt nhanh', example: 'http://localhost:3000/approvals' },
    ],
  },
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || 'ticket.created';

    // Fetch existing template in DB
    const template = await prisma.emailTemplate.findUnique({
      where: { code },
    });

    const guide = TEMPLATE_VARIABLES_GUIDE[code] || {
      name: template?.name || 'Mẫu Email Hệ Thống',
      description: 'Tùy chỉnh mẫu email thông báo',
      variables: [
        { tag: '{{recipientName}}', label: 'Người nhận', example: 'Nguyễn Văn A' },
        { tag: '{{title}}', label: 'Tiêu đề', example: 'Thông báo từ hệ thống' },
      ],
    };

    const subject = template?.subject || `[Thông báo] ${guide.name}`;
    const bodyHtml = template?.bodyHtml || `<p>Xin chào <strong>{{recipientName}}</strong>,</p><p>Đây là thông báo từ hệ thống SIMPLY IT.</p>`;

    // Build Word Document
    const tableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Tên Biến (Mustache Tag)', bold: true, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB', type: ShadingType.CLEAR },
            width: { size: 35, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Ý Nghĩa / Mô Tả', bold: true, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB', type: ShadingType.CLEAR },
            width: { size: 35, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Ví Dụ Thực Tế', bold: true, color: 'FFFFFF' })] })],
            shading: { fill: '2563EB', type: ShadingType.CLEAR },
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ];

    guide.variables.forEach((v, index) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: v.tag, bold: true, color: '1D4ED8' })] })],
              shading: index % 2 === 0 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: v.label })] })],
              shading: index % 2 === 0 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: v.example, italics: true, color: '64748B' })] })],
              shading: index % 2 === 0 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Header Title
            new Paragraph({
              text: 'SIMPLY IT MANAGEMENT PLATFORM',
              heading: HeadingLevel.HEADING_3,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `TÀI LIỆU HƯỚNG DẪN & MẪU EMAIL: ${guide.name.toUpperCase()}`,
                  bold: true,
                  size: 28,
                  color: '1E3A8A',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Mã sự kiện hệ thống: ', bold: true }),
                new TextRun({ text: code, color: '4B5563' }),
                new TextRun({ text: '  |  Mô tả: ', bold: true }),
                new TextRun({ text: guide.description, italics: true }),
              ],
              spacing: { after: 300 },
            }),

            // Section 1: Hướng Dẫn & Bảng Biến
            new Paragraph({
              text: '1. DANH SÁCH CÁC THẺ BIẾN HỢP LỆ (VARIABLES)',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 120 },
            }),
            new Paragraph({
              text: 'Khi soạn thảo email trong file Word này, bạn có thể tự do chỉnh sửa câu chữ, màu sắc, bảng biểu. Hãy giữ nguyên các cặp dấu ngoặc kép như {{ticketNumber}} để hệ thống tự động thay thế bằng dữ liệu thực tế khi gửi thư:',
              spacing: { after: 150 },
            }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),

            // Section 2: Tiêu đề Email
            new Paragraph({
              text: '2. TIÊU ĐỀ EMAIL (SUBJECT)',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Tiêu đề: ', bold: true, color: '1E3A8A' }),
                new TextRun({ text: subject, bold: true }),
              ],
              spacing: { after: 300 },
            }),

            // Section 3: Nội dung chi tiết
            new Paragraph({
              text: '3. NỘI DUNG EMAIL (BODY - CHỈNH SỬA TỰ DO BÊN DƯỚI)',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: '--- BẮT ĐẦU NỘI DUNG MẪU ---', bold: true, color: '9CA3AF' }),
              ],
              spacing: { after: 150 },
            }),

            // Body Paragraphs from current HTML (converted to clear text paragraphs)
            new Paragraph({
              children: [
                new TextRun({ text: 'Xin chào ', size: 24 }),
                new TextRun({ text: '{{recipientName}}', bold: true, color: '1D4ED8', size: 24 }),
                new TextRun({ text: ',', size: 24 }),
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Hệ thống SIMPLY IT xin thông báo về sự kiện: ', size: 24 }),
                new TextRun({ text: guide.name, bold: true, size: 24 }),
              ],
              spacing: { after: 200 },
            }),

            // Sample Box in Word
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'THÔNG TIN CHI TIẾT', bold: true, color: '1E3A8A' }),
                          ],
                          spacing: { after: 100 },
                        }),
                        ...guide.variables.slice(0, 5).map(
                          (v) =>
                            new Paragraph({
                              children: [
                                new TextRun({ text: `• ${v.label}: `, bold: true }),
                                new TextRun({ text: v.tag, color: '2563EB', bold: true }),
                              ],
                              spacing: { after: 60 },
                            })
                        ),
                      ],
                      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                    }),
                  ],
                }),
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: 'Bạn có thể truy cập hệ thống để kiểm tra và theo dõi tiến độ tại: {{link}}',
                  size: 22,
                  italics: true,
                }),
              ],
              spacing: { before: 200, after: 300 },
            }),

            new Paragraph({
              children: [
                new TextRun({ text: '--- KẾT THÚC NỘI DUNG MẪU ---', bold: true, color: '9CA3AF' }),
              ],
              spacing: { after: 300 },
            }),

            // Section 4: Hướng dẫn tải lên
            new Paragraph({
              text: '4. HƯỚNG DẪN TẢI FILE LÊN HỆ THỐNG',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 120 },
            }),
            new Paragraph({
              text: '1. Sau khi chỉnh sửa nội dung trong file Word này, hãy nhấn Lưu (Ctrl + S).\n2. Mở trình duyệt web > Truy cập Cài đặt hệ thống > Mẫu Email Thông Báo Tự Động.\n3. Chọn đúng mẫu cần cập nhật và nhấn nút "📤 Tải Lên Từ File Word".\n4. Chọn file Word này, hệ thống sẽ tự động bóc tách tiêu đề, bảng biểu và nội dung sang HTML chuẩn đẹp!',
              spacing: { after: 200 },
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const filename = `Mau_Email_${code.replace('.', '_')}.docx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
