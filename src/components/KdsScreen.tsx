import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Volume2,
  ChefHat,
  Coffee,
  CheckCheck,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { Station, ItemStatus } from '../types';
import { sound } from '../utils/audio';

export const KdsScreen: React.FC = () => {
  const {
    orders,
    updateItemStatus,
    markTicketReady,
    language,
  } = usePos();

  const t = translations[language];
  const [selectedStation, setSelectedStation] = useState<Station | 'all'>('all');
  const [, setTick] = useState<number>(0);

  // Refresh elapsed timer every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter only today's open orders that contain sent/cooking/ready items
  const kdsTickets = orders
    .filter((ord) => ord.status === 'open')
    .map((ord) => {
      const stationItems = ord.items.filter((item) => {
        const matchesStation = selectedStation === 'all' || item.station === selectedStation;
        // Don't show 'new' (not yet sent) or 'voided' or 'served'
        const isKitchenActive = ['sent', 'cooking', 'ready'].includes(item.status);
        return matchesStation && isKitchenActive;
      });

      return {
        order: ord,
        items: stationItems,
      };
    })
    .filter((ticket) => ticket.items.length > 0)
    // Sort oldest first
    .sort((a, b) => {
      const aMinSent = Math.min(...a.items.map((i) => i.sentAt || a.order.createdAt));
      const bMinSent = Math.min(...b.items.map((i) => i.sentAt || b.order.createdAt));
      return aMinSent - bMinSent;
    });

  const handleAdvanceStatus = (orderId: string, orderItemId: string, currentStatus: ItemStatus) => {
    if (currentStatus === 'sent') {
      updateItemStatus(orderId, orderItemId, 'cooking');
    } else if (currentStatus === 'cooking') {
      updateItemStatus(orderId, orderItemId, 'ready');
      sound.playKitchenOrderAlert();
    } else if (currentStatus === 'ready') {
      updateItemStatus(orderId, orderItemId, 'served');
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'sent':
        return {
          label: 'รอทำ',
          bg: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300',
        };
      case 'cooking':
        return {
          label: 'กำลังทำ 🍳',
          bg: 'bg-orange-500 text-white border-orange-600 animate-pulse',
        };
      case 'ready':
        return {
          label: 'เสร็จแล้ว 🛎️',
          bg: 'bg-emerald-500 text-white border-emerald-600',
        };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-600' };
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Top Station Filter Bar & Audio alert */}
      <div className="card-3d p-3 sm:p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedStation('all')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              selectedStation === 'all'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.stationAll}
          </button>
          <button
            onClick={() => setSelectedStation('kitchen')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedStation === 'kitchen'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>{t.stationKitchen}</span>
          </button>
          <button
            onClick={() => setSelectedStation('bar')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedStation === 'bar'
                ? 'btn-3d-emerald text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>{t.stationBar}</span>
          </button>
        </div>

        {/* Audio notification test & Ticket count */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            กำลังรอทำ: <span className="text-amber-500 font-black text-lg">{kdsTickets.length}</span> ใบ
          </div>

          <button
            onClick={() => sound.playKitchenOrderAlert()}
            className="btn-3d-slate flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
            title="ทดสอบเสียงเตือน"
          >
            <Volume2 className="w-4 h-4 text-amber-500" />
            <span>ทดสอบเสียง</span>
          </button>
        </div>
      </div>

      {/* Ticket Cards Grid (Tablet-first, high visibility) */}
      {kdsTickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t.noActiveOrders}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ออเดอร์ใหม่ที่ถูกกด "ส่งเข้าครัว/บาร์" จะปรากฏขึ้นที่นี่พร้อมเสียงเตือนทันที
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {kdsTickets.map(({ order, items }) => {
            // Find earliest item sentAt
            const earliestTime = Math.min(
              ...items.map((i) => i.sentAt || order.createdAt)
            );
            const elapsedMinutes = Math.floor((Date.now() - earliestTime) / 60000);

            // Elapsed time warning colors: <10m green, 10-20m orange, >20m red
            let timeColorClass = 'bg-emerald-500 text-white';
            let cardBorderClass = 'border-slate-200 dark:border-slate-800';

            if (elapsedMinutes >= 20) {
              timeColorClass = 'bg-rose-600 text-white animate-pulse';
              cardBorderClass = 'border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/30';
            } else if (elapsedMinutes >= 10) {
              timeColorClass = 'bg-amber-500 text-white';
              cardBorderClass = 'border-amber-400 dark:border-amber-500';
            }

            const allReady = items.every((i) => i.status === 'ready');

            return (
              <div
                key={order.id}
                className={`card-3d surface-3d rounded-3xl p-5 flex flex-col justify-between transition-all ${cardBorderClass}`}
              >
                <div>
                  {/* Ticket Header: Table name, Queue, Elapsed Time */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-slate-900 dark:text-white drop-shadow-xs">
                          {order.tableName}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-black font-mono shadow-xs">
                          {order.queueNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-bold">
                        {order.type === 'dine-in' ? 'ทานที่ร้าน' : 'กลับบ้าน (Takeaway)'}
                      </span>
                    </div>

                    {/* Elapsed Time Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-xs ${timeColorClass}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsedMinutes} นาที</span>
                    </div>
                  </div>

                  {elapsedMinutes >= 20 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{t.urgentWarning}</span>
                    </div>
                  )}

                  {/* Ticket Items (Tap to advance status) */}
                  <div className="mt-3.5 space-y-2.5">
                    {items.map((item) => {
                      const badge = getStatusBadge(item.status);
                      return (
                        <div
                          key={item.orderItemId}
                          onClick={() => handleAdvanceStatus(order.id, item.orderItemId, item.status)}
                          className={`p-3 rounded-2xl border cursor-pointer select-none transition-all active:scale-97 shadow-xs ${
                            item.status === 'ready'
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                              : item.status === 'cooking'
                              ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800'
                              : 'bg-white/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-slate-900 dark:text-white">
                                  {item.qty}x {language === 'th' ? item.nameTh : item.nameEn}
                                </span>
                              </div>

                              {/* Modifiers */}
                              {item.selectedModifiers.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.selectedModifiers.map((m, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs"
                                    >
                                      +{m.optionName}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Note */}
                              {item.note && (
                                <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                  โน้ต: {item.note}
                                </p>
                              )}
                            </div>

                            {/* Status Button */}
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-xl border shrink-0 shadow-xs ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Mark ticket ready button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => markTicketReady(order.id, selectedStation === 'all' ? undefined : selectedStation)}
                    disabled={allReady}
                    className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
                      allReady
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'btn-3d-emerald text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.markAllReady}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
