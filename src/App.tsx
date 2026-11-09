/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { Header, ActiveTab } from './components/Header';
import { FloorPlan } from './components/FloorPlan';
import { OrderScreen } from './components/OrderScreen';
import { KdsScreen } from './components/KdsScreen';
import { ShiftScreen } from './components/ShiftScreen';
import { MenuManagement } from './components/MenuManagement';
import { ReportsScreen } from './components/ReportsScreen';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { OrderActionsModal } from './components/OrderActionsModal';
import { SettingsModal } from './components/SettingsModal';
import { Order } from './types';
import { WifiOff, AlertTriangle } from 'lucide-react';

const PosMain: React.FC = () => {
  const { isOnline, pendingSyncCount, activeOrder, setActiveOrderById } = usePos();
  const [activeTab, setActiveTab] = useState<ActiveTab>('tables');

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [actionsModalOpen, setActionsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<{
    open: boolean;
    order: Order | null;
    receiptNumber?: string;
  }>({ open: false, order: null });

  // Navigation handlers
  const handleSelectTable = (tableId: string) => {
    setActiveTab('order');
  };

  const handleOpenTakeaway = () => {
    setActiveTab('order');
  };

  const handleOpenOrder = (orderId: string) => {
    setActiveOrderById(orderId);
    setActiveTab('order');
  };

  const handlePaymentSuccess = (paidOrder: Order, receiptNumber: string) => {
    setReceiptModalData({
      open: true,
      order: paidOrder,
      receiptNumber,
    });
    // Return to floor plan after payment
    setActiveTab('tables');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-100 via-stone-50/80 to-amber-50/30 dark:from-[#0b0f19] dark:via-[#111827] dark:to-[#0b0f19] text-slate-800 dark:text-slate-100 select-none">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openSettings={() => setSettingsModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'tables' && (
          <FloorPlan
            onSelectTable={handleSelectTable}
            onOpenTakeaway={handleOpenTakeaway}
            onOpenOrder={handleOpenOrder}
          />
        )}

        {activeTab === 'order' && (
          <OrderScreen
            onBackToFloorPlan={() => setActiveTab('tables')}
            onOpenPayment={() => setPaymentModalOpen(true)}
            onOpenOrderActions={() => setActionsModalOpen(true)}
          />
        )}

        {activeTab === 'kds' && <KdsScreen />}

        {activeTab === 'shift' && <ShiftScreen />}

        {activeTab === 'menu' && <MenuManagement />}

        {activeTab === 'reports' && <ReportsScreen />}
      </main>

      {/* Floating Offline Toast */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xl animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>โหมดออฟไลน์ — บันทึกข้อมูลในเครื่อง อัตโนมัติ (จะซิงค์เมื่อต่อเน็ต)</span>
          {pendingSyncCount > 0 && (
            <span className="bg-amber-950 px-2 py-0.5 rounded-full text-[10px]">
              {pendingSyncCount} รายการ
            </span>
          )}
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ReceiptModal
        isOpen={receiptModalData.open}
        order={receiptModalData.order}
        receiptNumber={receiptModalData.receiptNumber}
        onClose={() => setReceiptModalData({ open: false, order: null })}
      />

      <OrderActionsModal
        isOpen={actionsModalOpen}
        onClose={() => setActionsModalOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <PosMain />
    </PosProvider>
  );
}
