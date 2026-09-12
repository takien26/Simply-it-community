'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  Ticket,
  CheckCircle2,
  ChevronDown,
  User,
  HelpCircle,
  ArrowRight,
  Maximize2,
  ZoomIn,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  imageUrl?: string;
  suggestedAction?: { type: string; title: string; description: string } | null;
  timestamp: string;
}

const ADMIN_PROMPTS = [
  { text: '📊 Thống kê tổng quan hệ thống hôm nay', keywords: ['thống kê', 'tổng quan', 'báo cáo', 'hôm nay', 'admin', 'chỉ số'] },
  { text: '🔑 Kiểm tra license sắp hết hạn', keywords: ['license', 'hết hạn', 'bản quyền', 'gia hạn', 'phần mềm'] },
  { text: '🎫 Danh sách ticket đang chờ xử lý', keywords: ['ticket', 'xử lý', 'sla', 'khẩn cấp', 'helpdesk', 'sự cố'] },
  { text: '📦 Cảnh báo tồn kho linh kiện sắp hết', keywords: ['linh kiện', 'kho', 'phụ tùng', 'ram', 'ssd', 'hết hàng', 'tồn kho'] },
];

const STAFF_PROMPTS = [
  { text: '💻 Kiểm tra thiết bị của tôi', keywords: ['máy của tôi', 'thiết bị của tôi', 'tài sản của tôi', 'đang dùng máy gì', 'laptop'] },
  { text: '🌐 Làm sao kết nối VPN từ bên ngoài?', keywords: ['vpn', 'mạng', 'từ xa', 'forticlient', 'remote', 'ngoài'] },
  { text: '📧 Khắc phục lỗi không vào được Outlook', keywords: ['outlook', 'mail', 'email', 'mật khẩu mail', 'không vào được mail', 'credentials'] },
  { text: '🖨️ Cách kết nối máy in văn phòng', keywords: ['in', 'máy in', 'may in', 'scan', 'kẹt giấy', 'print', 'driver', 'in ấn'] },
  { text: '🔑 Quên mật khẩu máy tính / tài khoản Domain', keywords: ['mật khẩu', 'pass', 'password', 'quên pass', 'khóa tài khoản', 'reset', 'đổi mật khẩu'] },
  { text: '📋 Quy trình xin cấp mới hoặc đổi Laptop', keywords: ['cấp máy', 'laptop', 'máy tính', 'đổi máy', 'phê duyệt', 'xin cấp', 'máy mới'] },
  { text: '🎫 Tôi muốn tạo Ticket hỗ trợ kỹ thuật', keywords: ['ticket', 'hỗ trợ', 'kỹ thuật', 'báo hỏng', 'it', 'gặp it', 'tao ticket'] },
];

export function ChatWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('Staff');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content:
        '👋 Xin chào! Mình là **Trợ lý IT ảo SIMPLY IT**. Bạn đang gặp khó khăn gì về máy tính, mạng, Outlook hay cần tra cứu hệ thống?',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isEnterprise, setIsEnterprise] = useState<boolean>(false);

  // Floating & Draggable Chat State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const justDraggedRef = useRef(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Restore saved position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('simply:chat-pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const x = Math.max(10, Math.min(parsed.x, window.innerWidth - 65));
          const y = Math.max(10, Math.min(parsed.y, window.innerHeight - 65));
          setPosition({ x, y });
        }
      }
    } catch {}
  }, []);

  // Clamp position when resizing window
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const w = isOpen ? 410 : 65;
        const h = isOpen ? 560 : 65;
        const x = Math.max(10, Math.min(prev.x, window.innerWidth - w - 10));
        const y = Math.max(10, Math.min(prev.y, window.innerHeight - h - 10));
        return { x, y };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // When opening dialog, keep within screen bounds
  useEffect(() => {
    if (isOpen) {
      setPosition((prev) => {
        if (!prev) return null;
        const dialogW = Math.min(410, window.innerWidth - 20);
        const dialogH = Math.min(560, window.innerHeight - 20);
        const x = Math.max(10, Math.min(prev.x, window.innerWidth - dialogW - 10));
        const y = Math.max(10, Math.min(prev.y, window.innerHeight - dialogH - 10));
        if (x !== prev.x || y !== prev.y) {
          return { x, y };
        }
        return prev;
      });
    }
  }, [isOpen]);

  // Drag handlers for both button and dialog header
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let initX = 0;
    let initY = 0;

    if (position) {
      initX = position.x;
      initY = position.y;
    } else if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
    } else {
      initX = window.innerWidth - (isOpen ? 420 : 75);
      initY = window.innerHeight - (isOpen ? 570 : 75);
    }

    dragStartRef.current = { startX: clientX, startY: clientY, initX, initY };
    isDraggingRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      const curX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dx = curX - dragStartRef.current.startX;
      const dy = curY - dragStartRef.current.startY;

      if (!isDraggingRef.current && Math.hypot(dx, dy) > 4) {
        isDraggingRef.current = true;
      }

      if (isDraggingRef.current) {
        const w = isOpen ? Math.min(410, window.innerWidth - 20) : 65;
        const h = isOpen ? Math.min(560, window.innerHeight - 20) : 65;
        const rawX = dragStartRef.current.initX + dx;
        const rawY = dragStartRef.current.initY + dy;
        const clampedX = Math.max(10, Math.min(rawX, window.innerWidth - w - 10));
        const clampedY = Math.max(10, Math.min(rawY, window.innerHeight - h - 10));

        setPosition({ x: clampedX, y: clampedY });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);

      if (isDraggingRef.current) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 150);

        setPosition((finalPos) => {
          if (finalPos) {
            try {
              localStorage.setItem('simply:chat-pos', JSON.stringify(finalPos));
            } catch {}
          }
          return finalPos;
        });
      }

      dragStartRef.current = null;
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  const handleButtonClick = () => {
    if (justDraggedRef.current) return;
    setIsOpen(true);
  };

  const handleResetPosition = () => {
    setPosition(null);
    try {
      localStorage.removeItem('simply:chat-pos');
    } catch {}
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        setIsEnterprise(!!data?.isEnterprise);
      })
      .catch(() => {});

    const handleLicenseUpdated = () => {
      fetch('/api/license')
        .then((res) => res.json())
        .then((data) => {
          setIsEnterprise(!!data?.isEnterprise);
        })
        .catch(() => {});
    };
    window.addEventListener('simply:license-updated', handleLicenseUpdated);
    return () => window.removeEventListener('simply:license-updated', handleLicenseUpdated);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        const u = data.data || data.user;
        if (u) {
          const roleName = u.role?.name || u.roleName || 'Staff';
          setUserRole(roleName);
          const adminCheck = roleName === 'Admin' || (Array.isArray(u.permissions) && u.permissions.includes('*'));
          setIsAdmin(adminCheck);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Reactive Smart Suggestions: Role-based + live filter as user types!
  const reactiveSuggestions = useMemo(() => {
    const pool = isAdmin ? [...ADMIN_PROMPTS, ...STAFF_PROMPTS] : STAFF_PROMPTS;
    const query = input.trim().toLowerCase();

    if (!query) {
      return (isAdmin ? ADMIN_PROMPTS : STAFF_PROMPTS).slice(0, 4).map((p) => p.text);
    }

    const matched = pool.filter(
      (p) =>
        p.text.toLowerCase().includes(query) ||
        p.keywords.some((k) => k.toLowerCase().includes(query) || query.includes(k.toLowerCase()))
    );

    if (matched.length > 0) {
      return matched.slice(0, 4).map((p) => p.text);
    }

    return [
      `Tìm hướng dẫn về "${input.trim()}"`,
      isAdmin ? '📊 Thống kê tổng quan hệ thống hôm nay' : '💻 Kiểm tra thiết bị của tôi',
      '🎫 Tôi muốn tạo Ticket hỗ trợ kỹ thuật',
      '🌐 Làm sao kết nối VPN từ bên ngoài?',
    ];
  }, [input, isAdmin]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.userRole) {
          setUserRole(data.userRole);
          setIsAdmin(data.userRole === 'Admin');
        }
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: data.reply,
          suggestedAction: data.suggestedAction,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicketFromBot = async (action: { title: string; description: string }) => {
    setCreatingTicket(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: action.title || 'Yêu cầu hỗ trợ từ AI Chatbot',
          description: action.description || 'Yêu cầu được chuyển tiếp từ AI Chatbot',
          category: 'HARDWARE',
          priority: 'MEDIUM',
        }),
      });

      const data = await res.json();
      if (res.ok && (data.ticketNumber || data.id)) {
        const ticketNum = data.ticketNumber || 'TK-NEW';
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'bot',
            content: `🎉 **Đã tạo thành công Ticket #${ticketNum}!**\n\nKỹ thuật viên IT đã nhận được yêu cầu và sẽ liên hệ hỗ trợ bạn trong thời gian sớm nhất.`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        alert('Tạo ticket thất bại: ' + (data.error || 'Lỗi'));
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi');
    } finally {
      setCreatingTicket(false);
    }
  };

  const renderFormattedMessage = (content: string) => {
    const parts = content.split('\n');
    return parts.map((line, idx) => {
      const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const altText = imgMatch[1];
        const imgUrl = imgMatch[2];
        return (
          <div key={idx} className="my-2 relative group rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
            <img
              src={imgUrl}
              alt={altText}
              className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setZoomImage(imgUrl)}
            />
            <button
              type="button"
              onClick={() => setZoomImage(imgUrl)}
              className="absolute bottom-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[10px] flex items-center gap-1 backdrop-blur-xs"
            >
              <ZoomIn className="w-3 h-3" />
              <span>Phóng to</span>
            </button>
          </div>
        );
      }

      const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <p
          key={idx}
          className="mb-1 leading-relaxed last:mb-0"
          dangerouslySetInnerHTML={{ __html: boldFormatted }}
        />
      );
    });
  };

  if (!isEnterprise) return null;

  return (
    <div
      ref={widgetRef}
      style={
        position
          ? {
              position: 'fixed',
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto',
              zIndex: 50,
            }
          : {
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 50,
            }
      }
    >
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          onClick={handleButtonClick}
          className="relative p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl transition-shadow duration-300 hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing flex items-center justify-center group select-none touch-none"
          title="Trợ lý IT ảo AI (Nhấp để mở • Giữ chuột để di chuyển)"
        >
          <Bot className="w-6 h-6 animate-bounce duration-1000 pointer-events-none" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold text-white items-center justify-center">
              {isAdmin ? '👑' : 'AI'}
            </span>
          </span>
        </button>
      )}

      {/* Expandable Chat Dialog */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Chat Header (Draggable) */}
          <div
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-md shrink-0 cursor-grab active:cursor-grabbing select-none"
            title="Giữ và kéo để di chuyển khung chat bất kỳ đâu"
          >
            <div className="flex items-center gap-2.5 pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  <span>Trợ Lý IT Ảo</span>
                  {isAdmin ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full border font-bold flex items-center gap-1 bg-amber-400/30 text-amber-200 border-amber-300/40">
                      <Shield className="w-2.5 h-2.5" />
                      <span>👑 Admin</span>
                    </span>
                  ) : userRole && userRole !== 'Staff' && userRole !== 'User' && userRole !== 'Nhân viên' ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full border font-semibold flex items-center gap-1 bg-blue-400/30 text-blue-200 border-blue-300/40">
                      <span>🛠️ {userRole}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full border font-medium bg-emerald-400/30 text-emerald-200 border-emerald-300/30">
                      Online
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-blue-100 flex items-center gap-1">
                  <span className="opacity-90">⠿ Kéo để di chuyển</span>
                  <span>•</span>
                  <span>{isAdmin ? 'Tra cứu hệ thống' : 'Hỗ trợ 24/7'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {position && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPosition();
                  }}
                  className="px-2 py-0.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors text-[10.5px] cursor-pointer"
                  title="Đặt lại vị trí góc phải mặc định"
                >
                  Gốc
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Đóng chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((msg) => {
              const isBot = msg.role === 'bot';
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end justify-end'}`}>
                  {isBot && (
                    <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                      isAdmin ? 'bg-indigo-600' : 'bg-blue-600'
                    }`}>
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="max-w-[84%] space-y-2">
                    <div
                      className={`p-3 rounded-2xl leading-relaxed ${
                        isBot
                          ? 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs'
                          : 'bg-blue-600 text-white rounded-br-xs shadow-xs font-medium'
                      }`}
                    >
                      {renderFormattedMessage(msg.content)}
                    </div>

                    {isBot && msg.suggestedAction?.type === 'CREATE_TICKET' && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-[11px]">
                          <Ticket className="w-4 h-4 text-indigo-600" />
                          <span>Tạo Ticket Cho Kỹ Thuật Viên IT?</span>
                        </div>
                        <p className="text-[11px] text-indigo-700">
                          Hệ thống sẽ chuyển tiếp yêu cầu đến IT Team để xử lý tận nơi cho bạn.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCreateTicketFromBot(msg.suggestedAction!)}
                          disabled={creatingTicket}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {creatingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                          <span>Tạo Ticket Ngay</span>
                        </button>
                      </div>
                    )}

                    <span className={`text-[9px] text-slate-400 block ${isBot ? 'text-left pl-1' : 'text-right pr-1'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2 text-xs">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Trợ lý đang xử lý dữ liệu...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DYNAMIC REACTIVE SUGGESTIONS BAR (Tự nhảy theo vai trò & từ khóa đang gõ) */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 transition-all">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            {reactiveSuggestions.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(promptText)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition-all border border-slate-200 hover:border-blue-300 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 animate-in fade-in"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder={
                isAdmin
                  ? 'Admin: Nhập câu hỏi, thống kê, kiểm tra kho...'
                  : 'Nhập câu hỏi, sự cố (VD: vpn, máy in, outlook...)'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition-all font-medium placeholder-slate-400"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: FULL-SCREEN IMAGE ZOOM */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-700">
            <img src={zoomImage} alt="Zoomed Screenshot" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
