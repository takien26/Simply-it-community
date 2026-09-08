'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { QuickViewDrawer } from '@/components/common/QuickViewDrawer';

// Lazy load heavy global modals so they do not block route navigation
const AIQuickInputModal = dynamic(
  () => import('@/components/ai/ai-quick-input-modal').then((mod) => mod.AIQuickInputModal),
  { ssr: false }
);
const ExcelImportModal = dynamic(
  () => import('@/components/import/excel-import-modal').then((mod) => mod.ExcelImportModal),
  { ssr: false }
);
const ChatWidget = dynamic(
  () => import('@/components/chatbot/ChatWidget').then((mod) => mod.ChatWidget),
  { ssr: false }
);
const RealtimeNotificationListener = dynamic(
  () => import('@/components/common/RealtimeNotificationListener').then((mod) => mod.RealtimeNotificationListener),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const handleGlobalRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenAIModal={() => setIsAIModalOpen(true)}
          onOpenExcelModal={() => setIsExcelModalOpen(true)}
        />
        <main className="flex-1 p-5 sm:p-6 lg:p-7 max-w-full">{children}</main>
      </div>

      {/* Global AI & Excel Modals (Only rendered when opened) */}
      {isAIModalOpen && (
        <AIQuickInputModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onSuccess={handleGlobalRefresh}
        />
      )}
      {isExcelModalOpen && (
        <ExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onSuccess={handleGlobalRefresh}
        />
      )}

      {/* Global Quick View Slide-over Drawer */}
      <QuickViewDrawer />

      {/* Global AI Chatbot Self-Service Floating Widget */}
      <ChatWidget />

      {/* Global Live Real-time SSE Notification Listener */}
      <RealtimeNotificationListener />

      {/* Mobile-Only Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* PWA "Add to Home Screen" Mobile Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
