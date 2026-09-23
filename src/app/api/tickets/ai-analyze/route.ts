import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateUnifiedTextAI, getGeminiApiKey } from '@/lib/ai-config';

// Danh mục chuẩn theo Prisma TicketCategory
const VALID_CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'LICENSE', 'ACCESS_REQUEST', 'OTHER'] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

// Mức ưu tiên chuẩn theo Prisma TicketPriority
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type ValidPriority = typeof VALID_PRIORITIES[number];

interface AiAnalysisResult {
  category: ValidCategory;
  priority: ValidPriority;
  priorityLevel: 'P1' | 'P2' | 'P3' | 'P4';
  priorityReason: string;
  serviceName: string;
  suggestedTitle: string;
  diagnosticSummary: string;
  suggestedSteps: string[];
  matchedAssetId: string | null;
  matchedAssetName: string | null;
  isAiGenerated: boolean;
  aiEngine: string;
  estimatedResolutionHours: number;
}

/**
 * Heuristic Rule-based Fallback khi không có API Key hoặc Gemini gặp sự cố
 */
function heuristicFallback(text: string, userAssets: any[]): Omit<AiAnalysisResult, 'matchedAssetId' | 'matchedAssetName' | 'estimatedResolutionHours'> & { matchedAssetTag?: string | null } {
  const raw = text.toLowerCase();

  let category: ValidCategory = 'OTHER';
  let serviceName = 'Hỗ trợ chung';
  let priority: ValidPriority = 'MEDIUM';
  let priorityLevel: 'P1' | 'P2' | 'P3' | 'P4' = 'P3';
  let priorityReason = 'Sự cố tiêu chuẩn ảnh hưởng đến người dùng cá nhân.';
  let diagnosticSummary = 'Yêu cầu hỗ trợ IT thông thường.';
  let suggestedSteps: string[] = ['Kỹ thuật viên IT tiếp nhận và liên hệ người dùng.'];
  let matchedAssetTag: string | null = null;

  // 1. Security & Malware (P1 / URGENT)
  if (
    raw.includes('virus') ||
    raw.includes('mã độc') ||
    raw.includes('bị hack') ||
    raw.includes('lừa đảo') ||
    raw.includes('phishing') ||
    raw.includes('ransomware') ||
    raw.includes('bị khóa file') ||
    raw.includes('tống tiền')
  ) {
    category = 'SOFTWARE';
    serviceName = 'An toàn Thông tin & Bảo mật';
    priority = 'URGENT';
    priorityLevel = 'P1';
    priorityReason = '🚨 Phát hiện dấu hiệu tấn công an ninh mạng, mã độc hoặc lừa đảo. Cần can thiệp khẩn cấp để ngăn lây lan hệ thống.';
    diagnosticSummary = 'Cảnh báo an ninh: Nghi vấn thiết bị hoặc tài khoản bị xâm nhập. Cần cô lập mạng ngay lập tức.';
    suggestedSteps = [
      'Ngắt kết nối mạng WiFi/LAN của thiết bị ngay lập tức',
      'Không mở bất kỳ đường link hoặc file đính kèm nào khả nghi',
      'Đổi mật khẩu tài khoản miền (Active Directory) và thông báo cho KTV bảo mật'
    ];
  }
  // 2. Network & Internet (P1 / P2 / P3)
  else if (
    raw.includes('wifi') ||
    raw.includes('mạng') ||
    raw.includes('internet') ||
    raw.includes('vpn') ||
    raw.includes('mất kết nối') ||
    raw.includes('không vào được mạng') ||
    raw.includes('chập chờn')
  ) {
    category = 'NETWORK';
    serviceName = raw.includes('vpn') ? 'Kết nối VPN từ xa' : 'Mạng WiFi & Internet';
    if (raw.includes('cả phòng') || raw.includes('toàn bộ') || raw.includes('sập mạng') || raw.includes('cả công ty') || raw.includes('tất cả')) {
      priority = 'URGENT';
      priorityLevel = 'P1';
      priorityReason = 'Sự cố mạng diện rộng gây tê liệt hoạt động của nhiều nhân sự hoặc cả văn phòng.';
    } else if (raw.includes('vpn') || raw.includes('gấp') || raw.includes('khẩn')) {
      priority = 'HIGH';
      priorityLevel = 'P2';
      priorityReason = 'Mất kết nối mạng/VPN ảnh hưởng trực tiếp đến công việc cấp bách của người dùng.';
    } else {
      priority = 'MEDIUM';
      priorityLevel = 'P3';
      priorityReason = 'Sự cố kết nối mạng cá nhân hoặc tốc độ mạng chậm cục bộ.';
    }
    diagnosticSummary = `Người dùng báo cáo sự cố kết nối với ${serviceName}. Cần kiểm tra địa chỉ IP, DNS và hạ tầng Access Point.`;
    suggestedSteps = [
      'Kiểm tra tình trạng kết nối cáp LAN hoặc sóng WiFi',
      'Thử bật/tắt lại card mạng hoặc khởi động lại máy tính',
      'Kiểm tra tài khoản cấp phát IP DHCP và trạng thái máy chủ DNS'
    ];
  }
  // 3. Software & ERP (P1 / P2 / P3)
  else if (
    raw.includes('erp') ||
    raw.includes('bravo') ||
    raw.includes('sap') ||
    raw.includes('misa') ||
    raw.includes('crm') ||
    raw.includes('phần mềm') ||
    raw.includes('hóa đơn') ||
    raw.includes('sql')
  ) {
    category = 'SOFTWARE';
    serviceName = raw.includes('bravo') ? 'ERP Bravo' : raw.includes('sap') ? 'ERP SAP' : raw.includes('misa') ? 'Phần mềm MISA' : 'Phần mềm Nghiệp vụ';
    if (raw.includes('chốt sổ') || raw.includes('không xuất được hóa đơn') || raw.includes('treo hệ thống') || raw.includes('quyết toán')) {
      priority = 'HIGH';
      priorityLevel = 'P2';
      priorityReason = 'Lỗi phần mềm nghiệp vụ quan trọng trong kỳ xử lý số liệu hoặc xuất hóa đơn tài chính.';
    } else {
      priority = 'MEDIUM';
      priorityLevel = 'P3';
      priorityReason = 'Lỗi tính năng hoặc phân quyền phần mềm sử dụng hàng ngày.';
    }
    diagnosticSummary = `Sự cố phát sinh trên ứng dụng ${serviceName}. Có thể do lỗi phân quyền người dùng, xung đột cache hoặc mất kết nối DB.`;
    suggestedSteps = [
      'Kiểm tra tài khoản người dùng và phân quyền module nghiệp vụ',
      'Xóa cache tạm ứng dụng và khởi động lại phần mềm',
      'Kiểm tra kết nối tới cơ sở dữ liệu hoặc máy chủ ứng dụng'
    ];
  }
  // 4. Access Permission & Account (P3 / P4)
  else if (
    raw.includes('quền') ||
    raw.includes('quyền') ||
    raw.includes('mật khẩu') ||
    raw.includes('password') ||
    raw.includes('tài khoản') ||
    raw.includes('unlock') ||
    raw.includes('khóa tài khoản') ||
    raw.includes('thư mục chia sẻ') ||
    raw.includes('nas') ||
    raw.includes('share')
  ) {
    category = 'ACCESS_REQUEST';
    serviceName = raw.includes('mật khẩu') || raw.includes('password') ? 'Tài khoản & Mật khẩu' : 'Phân quyền Truy cập Dữ liệu';
    priority = raw.includes('khóa') || raw.includes('không đăng nhập được') ? 'HIGH' : 'MEDIUM';
    priorityLevel = priority === 'HIGH' ? 'P2' : 'P3';
    priorityReason = priority === 'HIGH' ? 'Tài khoản bị khóa ngăn cản hoàn toàn việc đăng nhập làm việc.' : 'Yêu cầu cấp quyền bổ sung.';
    diagnosticSummary = `Yêu cầu phân quyền hoặc mở khóa cho dịch vụ ${serviceName}.`;
    suggestedSteps = [
      'Xác thực danh tính người dùng và phê duyệt của quản lý trực tiếp',
      'Kiểm tra trạng thái tài khoản trên Active Directory / Domain Controller',
      'Gán quyền truy cập thư mục hoặc reset mật khẩu tạm thời'
    ];
  }
  // 5. License & Subscriptions (P3 / P4)
  else if (
    raw.includes('license') ||
    raw.includes('bản quyền') ||
    raw.includes('office') ||
    raw.includes('m365') ||
    raw.includes('outlook') ||
    raw.includes('adobe') ||
    raw.includes('hết hạn')
  ) {
    category = 'LICENSE';
    serviceName = 'Bản quyền Phần mềm & Microsoft 365';
    priority = raw.includes('hết hạn') ? 'MEDIUM' : 'LOW';
    priorityLevel = priority === 'MEDIUM' ? 'P3' : 'P4';
    priorityReason = 'Vấn đề liên quan đến kích hoạt giấy phép sử dụng phần mềm.';
    diagnosticSummary = `Người dùng yêu cầu kích hoạt hoặc gia hạn ${serviceName}.`;
    suggestedSteps = [
      'Kiểm tra số lượng seat còn trống trong hệ thống quản lý License',
      'Xác minh tài khoản người dùng trên Microsoft 365 Admin Center',
      'Hướng dẫn người dùng đăng xuất và đăng nhập lại để nhận giấy phép'
    ];
  }
  // 6. Hardware & Devices (P1 / P2 / P3)
  else if (
    raw.includes('máy in') ||
    raw.includes('in không được') ||
    raw.includes('kẹt giấy') ||
    raw.includes('laptop') ||
    raw.includes('máy tính') ||
    raw.includes('màn hình') ||
    raw.includes('bàn phím') ||
    raw.includes('chuột') ||
    raw.includes('sập nguồn') ||
    raw.includes('xanh màn hình') ||
    raw.includes('bốc khói') ||
    raw.includes('chập cháy')
  ) {
    category = 'HARDWARE';
    serviceName = raw.includes('máy in') ? 'Máy in văn phòng' : 'Thiết bị Máy tính & Phần cứng';
    if (raw.includes('chập cháy') || raw.includes('bốc khói') || raw.includes('nổ')) {
      priority = 'URGENT';
      priorityLevel = 'P1';
      priorityReason = '⚠️ NGUY CƠ CHÁY NỔ PHẦN CỨNG: Cần ngắt nguồn ngay để đảm bảo an toàn tính mạng & tài sản!';
    } else if (raw.includes('sập nguồn') || raw.includes('không lên') || raw.includes('xanh màn hình')) {
      priority = 'HIGH';
      priorityLevel = 'P2';
      priorityReason = 'Thiết bị làm việc chính bị hỏng hoàn toàn khiến người dùng không thể làm việc.';
    } else {
      priority = 'MEDIUM';
      priorityLevel = 'P3';
      priorityReason = 'Sự cố thiết bị ngoại vi hoặc linh kiện phụ.';
    }
    diagnosticSummary = `Sự cố phần cứng liên quan đến ${serviceName}.`;
    suggestedSteps = [
      'Kiểm tra cáp nguồn, sạc và các kết nối ngoại vi',
      'Nếu màn hình xanh (BSOD): Ghi lại mã lỗi dừng (Stop Code) và khởi động vào Safe Mode',
      'Nếu máy in: Kiểm tra khay giấy, tình trạng mực và đèn báo lỗi phần cứng'
    ];
  }

  // Tự động sinh tiêu đề kỹ thuật chuẩn
  let suggestedTitle = text.slice(0, 65).trim();
  if (text.length > 65) suggestedTitle += '...';
  if (!suggestedTitle.startsWith('[')) {
    suggestedTitle = `[${serviceName}] ${suggestedTitle}`;
  }

  return {
    category,
    priority,
    priorityLevel,
    priorityReason,
    serviceName,
    suggestedTitle,
    diagnosticSummary,
    suggestedSteps,
    matchedAssetTag,
    isAiGenerated: false,
    aiEngine: 'Rule-based NLP Engine (Offline Fallback)',
  };
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { text, userId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Nội dung mô tả sự cố không được để trống' }, { status: 400 });
    }

    // 1. Lấy danh sách tài sản đang được cấp phát cho người dùng
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
    const userAssetsInfo = userAssets.map((a) => `${a.assetTag}: ${a.name} (${a.category?.name || 'Thiết bị'}, ${a.brand || ''} ${a.model || ''})`).join('; ');

    // 2. Thử phân tích bằng Gemini AI thông qua generateUnifiedTextAI
    let analysis: Omit<AiAnalysisResult, 'matchedAssetId' | 'matchedAssetName' | 'estimatedResolutionHours'> & { matchedAssetTag?: string | null } | null = null;
    const geminiKey = await getGeminiApiKey();

    if (geminiKey && geminiKey.trim().length > 0) {
      try {
        const systemPrompt = `Bạn là Trợ lý AI Chuyên gia Điều phối Helpdesk & Phân loại Sự cố Kỹ thuật (IT Service Desk Triage AI) theo chuẩn ITIL quốc tế cho doanh nghiệp.
Nhiệm vụ của bạn:
1. Phân tích nội dung người dùng gõ bằng tiếng Việt (hoặc tiếng Anh).
2. Tự động nhận diện chính xác danh mục sự cố (Category) thuộc 1 trong các giá trị:
   - HARDWARE: Thiết bị phần cứng, máy tính, laptop, màn hình, máy in, bàn phím, chuột, sạc, pin, linh kiện vật lý.
   - SOFTWARE: Ứng dụng văn phòng, phần mềm kế toán, ERP (Bravo/SAP/MISA), trình duyệt, hệ điều hành Windows/macOS.
   - NETWORK: Mạng WiFi, cáp LAN, đường truyền Internet, kết nối VPN từ xa, không vào được web nội bộ.
   - LICENSE: Bản quyền phần mềm, Microsoft 365, Adobe, AutoCAD, gia hạn hoặc hết hạn license.
   - ACCESS_REQUEST: Cấp quyền truy cập, reset/quên mật khẩu, mở khóa tài khoản miền (AD), quyền thư mục chia sẻ (NAS).
   - OTHER: Các yêu cầu hành chính hoặc hỗ trợ chung khác.
3. Đề xuất Mức độ Ưu tiên (Priority) & Mức độ Khẩn cấp (Severity) theo nguyên tắc ITIL:
   - URGENT (P1 - Khẩn cấp): Sự cố diện rộng (cả phòng, toàn công ty, sập mạng chính), đe dọa an ninh mạng nghiêm trọng (mã độc, virus, phishing, hack, rò rỉ dữ liệu), nguy cơ cháy nổ, tê liệt quy trình kinh doanh sống còn.
   - HIGH (P2 - Cao): Nhân sự chủ chốt bị gián đoạn hoàn toàn (kế toán chốt sổ, xuất hóa đơn thuế, máy lãnh đạo), máy trạm chính hỏng không có máy thay thế, phần mềm cốt lõi không truy cập được.
   - MEDIUM (P3 - Trung bình): Sự cố tiêu chuẩn ảnh hưởng 1 người dùng, có giải pháp thay thế tạm thời hoặc lỗi tính năng nhỏ (máy in chung chậm, chuột kẹt, lag nhẹ).
   - LOW (P4 - Thấp): Yêu cầu tư vấn, hỏi đáp hướng dẫn, xin cài thêm tiện ích phụ, dọn dẹp bảo dưỡng không gấp.
4. Tóm tắt chẩn đoán ngắn gọn, lịch sự, chuyên nghiệp bằng tiếng Việt và đề xuất 2-3 bước kiểm tra sơ bộ.
5. So khớp xem nội dung có nhắc đến thiết bị nào trong danh sách thiết bị của người dùng hay không: [${userAssetsInfo || 'Chưa có thiết bị nào gán sẵn'}]`;

        const userPrompt = `Hãy phân tích nội dung ticket sau và trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm giải thích markdown ngoài JSON):
"${text}"

Cấu trúc JSON bắt buộc:
{
  "category": "HARDWARE" | "SOFTWARE" | "NETWORK" | "LICENSE" | "ACCESS_REQUEST" | "OTHER",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "priorityLevel": "P1" | "P2" | "P3" | "P4",
  "priorityReason": "Giải thích ngắn gọn 1-2 câu vì sao lại gán mức ưu tiên này",
  "serviceName": "Tên dịch vụ kỹ thuật liên quan (VD: Mạng WiFi văn phòng, Phần mềm Kế toán MISA, Máy tính xách tay...)",
  "suggestedTitle": "Tiêu đề chuẩn hóa kỹ thuật [Dịch vụ] Mô tả ngắn gọn",
  "diagnosticSummary": "Tóm tắt chẩn đoán 1-2 câu súc tích bằng tiếng Việt",
  "suggestedSteps": ["Bước 1...", "Bước 2..."],
  "matchedAssetTag": "Mã tag thiết bị như IT-AST-xxxx nếu xác định được, hoặc null"
}`;

        const rawResponse = await generateUnifiedTextAI({
          prompt: userPrompt,
          systemPrompt,
          temperature: 0.1,
          maxTokens: 1000,
          jsonMode: true,
        });

        // Parse JSON phản hồi từ Gemini
        const cleaned = rawResponse.replace(/```json\s*|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed && typeof parsed === 'object') {
          const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'OTHER';
          const priority = VALID_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'MEDIUM';
          const priorityLevel = (['P1', 'P2', 'P3', 'P4'].includes(parsed.priorityLevel)
            ? parsed.priorityLevel
            : priority === 'URGENT' ? 'P1' : priority === 'HIGH' ? 'P2' : priority === 'MEDIUM' ? 'P3' : 'P4') as any;

          analysis = {
            category,
            priority,
            priorityLevel,
            priorityReason: parsed.priorityReason || 'Đánh giá tự động bởi Gemini AI dựa trên mức độ tác động và tính khẩn cấp.',
            serviceName: parsed.serviceName || 'Hỗ trợ kỹ thuật',
            suggestedTitle: parsed.suggestedTitle || `[${parsed.serviceName || 'IT'}] ${text.slice(0, 50)}`,
            diagnosticSummary: parsed.diagnosticSummary || 'Đã phân tích sự cố bằng trí tuệ nhân tạo.',
            suggestedSteps: Array.isArray(parsed.suggestedSteps) && parsed.suggestedSteps.length > 0 ? parsed.suggestedSteps : ['Kỹ thuật viên IT liên hệ xác nhận.'],
            matchedAssetTag: parsed.matchedAssetTag || null,
            isAiGenerated: true,
            aiEngine: 'Google Gemini AI (Realtime LLM)',
          };
        }
      } catch (geminiError: any) {
        console.warn('Gemini AI analysis error, falling back to heuristic:', geminiError?.message || geminiError);
      }
    }

    // 3. Fallback sang Heuristic nếu Gemini chưa được cấu hình hoặc gặp lỗi
    if (!analysis) {
      analysis = heuristicFallback(text, userAssets);
    }

    // 4. So khớp thiết bị liên quan với tài sản thực tế của người dùng
    let matchedAssetId: string | null = null;
    let matchedAssetName: string | null = null;

    if (analysis.matchedAssetTag) {
      const foundByTag = userAssets.find((a) => a.assetTag?.toLowerCase() === analysis?.matchedAssetTag?.toLowerCase());
      if (foundByTag) {
        matchedAssetId = foundByTag.id;
        matchedAssetName = `[${foundByTag.assetTag}] ${foundByTag.name}`;
      }
    }

    // Nếu chưa khớp được bằng mã tag, tự khớp theo loại thiết bị người dùng đang giữ
    if (!matchedAssetId && (analysis.category === 'HARDWARE' || analysis.category === 'SOFTWARE')) {
      const pcAsset = userAssets.find((a) => {
        const name = `${a.name || ''} ${a.category?.name || ''} ${a.model || ''}`.toLowerCase();
        return name.includes('laptop') || name.includes('macbook') || name.includes('máy tính') || name.includes('pc') || name.includes('thinkpad');
      });
      if (pcAsset) {
        matchedAssetId = pcAsset.id;
        matchedAssetName = `[${pcAsset.assetTag}] ${pcAsset.name}`;
      }
    }

    // 5. Tính thời gian cam kết SLA dự kiến theo độ ưu tiên ITIL
    const resolutionHoursMap: Record<ValidPriority, number> = {
      URGENT: 4,  // P1: Tối đa 4 giờ
      HIGH: 8,    // P2: Tối đa 8 giờ (1 ngày làm việc)
      MEDIUM: 24, // P3: Tối đa 24 giờ (3 ngày làm việc)
      LOW: 48,    // P4: Tối đa 48 giờ (trong tuần)
    };

    const finalResult: AiAnalysisResult = {
      ...analysis,
      matchedAssetId,
      matchedAssetName,
      estimatedResolutionHours: resolutionHoursMap[analysis.priority] || 24,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...finalResult,
        userAssets: userAssets.map((a) => ({
          id: a.id,
          label: `[${a.assetTag}] ${a.name} (${a.brand || ''} ${a.model || ''})`.trim(),
        })),
      },
    });
  } catch (error: any) {
    console.error('AI ticket analysis error:', error);
    return NextResponse.json({ error: error.message || 'Phân tích AI thất bại' }, { status: 500 });
  }
}
