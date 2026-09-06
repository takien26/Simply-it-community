import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, userId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Nội dung mô tả sự cố không được để trống' }, { status: 400 });
    }

    const raw = text.toLowerCase();

    // 1. Fetch user's assigned assets if userId provided
    const targetUserId = userId || currentUser.userId;
    const userAssignments = await prisma.assetAssignment.findMany({
      where: { userId: targetUserId, returnedAt: null },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            brand: true,
            model: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const userAssets = userAssignments.map((a) => a.asset);

    // 2. Intelligent Rule-based & NLP Categorization
    let category = 'OTHER';
    let serviceName = 'Hỗ trợ chung';
    let priority = 'MEDIUM';
    let diagnosticSummary = '';
    let suggestedSteps: string[] = [];
    let matchedAssetId: string | null = null;
    let matchedAssetName: string | null = null;

    // A. Software & ERP
    if (
      raw.includes('erp') ||
      raw.includes('bravo') ||
      raw.includes('sap') ||
      raw.includes('phần mềm') ||
      raw.includes('misa') ||
      raw.includes('crm') ||
      raw.includes('sql') ||
      raw.includes('đăng nhập')
    ) {
      category = 'SOFTWARE';
      serviceName = raw.includes('bravo') ? 'ERP Bravo' : raw.includes('sap') ? 'ERP SAP' : 'Phần mềm nghiệp vụ';
      if (raw.includes('khẩn') || raw.includes('chốt sổ') || raw.includes('không xuất được hóa đơn') || raw.includes('treo hệ thống')) {
        priority = 'HIGH';
      }
      diagnosticSummary = `Người dùng gặp sự cố liên quan đến ${serviceName}. Có thể do lỗi phân quyền tài khoản, kết nối cơ sở dữ liệu SQL hoặc phiên bản ứng dụng bị khóa.`;
      suggestedSteps = [
        'Kiểm tra trạng thái máy chủ Database & Application Service',
        'Xác thực tài khoản người dùng và quyền truy cập module',
        'Hỗ trợ xóa cache hoặc cấu hình lại chuỗi kết nối (Connection String)',
      ];
    }
    // B. Network & Connectivity
    else if (
      raw.includes('wifi') ||
      raw.includes('mạng') ||
      raw.includes('internet') ||
      raw.includes('vpn') ||
      raw.includes('mất kết nối') ||
      raw.includes('chậm') ||
      raw.includes('không vào được mạng')
    ) {
      category = 'NETWORK';
      serviceName = raw.includes('vpn') ? 'Kết nối VPN' : 'Mạng WiFi & Internet';
      if (raw.includes('cả phòng') || raw.includes('mất mạng toàn bộ') || raw.includes('sập mạng')) {
        priority = 'URGENT';
      }
      diagnosticSummary = `Người dùng báo cáo mất kết nối hoặc chập chờn dịch vụ ${serviceName}. Cần kiểm tra địa chỉ IP, DNS và Access Point khu vực làm việc.`;
      suggestedSteps = [
        'Kiểm tra tín hiệu Access Point tại vị trí người dùng',
        'Xác minh người dùng đã cấp phát đúng dải IP VLAN nội bộ',
        'Kiểm tra trạng thái tài khoản VPN / xác thực chứng chỉ',
      ];
    }
    // C. Hardware & Peripherals
    else if (
      raw.includes('máy in') ||
      raw.includes('in không được') ||
      raw.includes('kẹt giấy') ||
      raw.includes('laptop') ||
      raw.includes('máy tính') ||
      raw.includes('màn hình') ||
      raw.includes('bàn phím') ||
      raw.includes('chuột') ||
      raw.includes('bật không lên') ||
      raw.includes('xanh màn hình') ||
      raw.includes('treo máy')
    ) {
      category = 'HARDWARE';
      serviceName = raw.includes('máy in') ? 'Máy in văn phòng' : 'Thiết bị máy tính / Laptop';
      if (raw.includes('sập nguồn') || raw.includes('cháy') || raw.includes('bốc khói') || raw.includes('hỏng gấp')) {
        priority = 'HIGH';
      }
      diagnosticSummary = `Sự cố phần cứng hoặc thiết bị ngoại vi (${serviceName}). Cần kiểm tra nguồn điện, kết nối cáp hoặc linh kiện hỏng hóc.`;
      suggestedSteps = [
        'Kiểm tra kết nối nguồn, sạc hoặc cáp tín hiệu',
        'Nếu máy in: Kiểm tra IP máy in, tình trạng mực và kẹt giấy trên khay',
        'Nếu máy tính treo: Thử khởi động lại hoặc kiểm tra nhiệt độ CPU/RAM',
      ];

      // Auto link to user's laptop/PC if available
      const pcAsset = userAssets.find((a) =>
        a.category?.name.toLowerCase().includes('laptop') ||
        a.category?.name.toLowerCase().includes('máy tính') ||
        a.name.toLowerCase().includes('laptop') ||
        a.name.toLowerCase().includes('pc')
      );
      if (pcAsset) {
        matchedAssetId = pcAsset.id;
        matchedAssetName = `[${pcAsset.assetTag}] ${pcAsset.name}`;
      }
    }
    // D. License & M365
    else if (
      raw.includes('license') ||
      raw.includes('bản quyền') ||
      raw.includes('office') ||
      raw.includes('m365') ||
      raw.includes('outlook') ||
      raw.includes('email') ||
      raw.includes('hết hạn') ||
      raw.includes('teams')
    ) {
      category = 'LICENSE';
      serviceName = 'Microsoft 365 & Email';
      diagnosticSummary = `Yêu cầu liên quan đến tài khoản bản quyền Microsoft 365, Email Outlook hoặc gói phần mềm bản quyền.`;
      suggestedSteps = [
        'Kiểm tra tình trạng gán license trong Admin Center',
        'Xác minh dung lượng hộp thư Outlook người dùng',
        'Hỗ trợ đăng nhập lại và kích hoạt bản quyền Office',
      ];
    }
    // E. Security & Malware
    else if (
      raw.includes('virus') ||
      raw.includes('mã độc') ||
      raw.includes('bị hack') ||
      raw.includes('lừa đảo') ||
      raw.includes('phishing') ||
      raw.includes('bị khóa file')
    ) {
      category = 'SECURITY';
      serviceName = 'An toàn & Bảo mật';
      priority = 'URGENT';
      diagnosticSummary = `🚨 CẢNH BÁO AN NINH: Nghi vấn máy trạm nhiễm mã độc hoặc tấn công lừa đảo. Cần cô lập mạng ngay lập tức!`;
      suggestedSteps = [
        'Yêu cầu người dùng ngắt kết nối mạng WiFi/LAN ngay lập tức',
        'Chạy quét toàn diện bằng phần mềm EDR/Antivirus',
        'Đổi mật khẩu tài khoản miền (AD) và kiểm tra log truy cập lạ',
      ];
    }

    // Auto-generate suggested technical title
    let suggestedTitle = text.slice(0, 70);
    if (text.length > 70) suggestedTitle += '...';
    if (!suggestedTitle.startsWith('[')) {
      suggestedTitle = `[${serviceName}] ${suggestedTitle}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        category,
        priority,
        serviceName,
        suggestedTitle,
        matchedAssetId,
        matchedAssetName,
        diagnosticSummary,
        suggestedSteps,
        userAssets: userAssets.map((a) => ({
          id: a.id,
          label: `[${a.assetTag}] ${a.name} (${a.brand || ''} ${a.model || ''})`.trim(),
        })),
        estimatedResolutionHours: priority === 'URGENT' ? 4 : priority === 'HIGH' ? 8 : 24,
      },
    });
  } catch (error) {
    console.error('AI ticket analysis error:', error);
    return NextResponse.json({ error: 'Phân tích AI thất bại' }, { status: 500 });
  }
}
