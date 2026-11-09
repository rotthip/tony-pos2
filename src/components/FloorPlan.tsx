import React, { useState } from 'react';
import {
  Users,
  ShoppingBag,
  Plus,
  Clock,
  CircleDollarSign,
  Receipt,
  Layers,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { RestaurantTable } from '../types';

interface FloorPlanProps {
  onSelectTable: (tableId: string) => void;
  onOpenTakeaway: () => void;
  onOpenOrder: (orderId: string) => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  onSelectTable,
  onOpenTakeaway,
  onOpenOrder,
}) => {
  const {
    tablesConfig,
    orders,
    createDineInOrder,
    language,
  } = usePos();

  const t = translations[language];
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [guestPickerTable, setGuestPickerTable] = useState<RestaurantTable | null>(null);

  // Filter tables by zone
  const filteredTables =
    selectedZone === 'all'
      ? tablesConfig.tables
      : tablesConfig.tables.filter((tb) => tb.zoneId === selectedZone);

  // Separate active takeaway orders
  const activeTakeawayOrders = orders.filter((o) => o.type === 'takeaway' && o.status === 'open');

  const handleTableClick = (table: RestaurantTable) => {
    // Check if table already has an active order
    const existingOrder = orders.find(
      (o) => o.tableId === table.id && o.status === 'open'
    );

    if (existingOrder) {
      onOpenOrder(existingOrder.id);
    } else {
      // Prompt for guest count or open immediately
      setGuestPickerTable(table);
    }
  };

  const handleConfirmOpenTable = (guestCount: number) => {
    if (guestPickerTable) {
      const newOrder = createDineInOrder(guestPickerTable.id, guestCount);
      setGuestPickerTable(null);
      onSelectTable(guestPickerTable.id);
      onOpenOrder(newOrder.id);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Top Action Bar: Zones & Quick Takeaway */}
      <div className="card-3d p-3 sm:p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Zone Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Layers className="w-4 h-4 text-amber-500 mr-1 shrink-0" />
          <button
            onClick={() => setSelectedZone('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              selectedZone === 'all'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.allZones} ({tablesConfig.tables.length})
          </button>
          {tablesConfig.zones.map((zone) => {
            const countInZone = tablesConfig.tables.filter((tb) => tb.zoneId === zone.id).length;
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  selectedZone === zone.id
                    ? 'btn-3d-amber text-white'
                    : 'btn-3d-slate text-slate-700 dark:text-slate-300'
                }`}
              >
                {language === 'th' ? zone.nameTh : zone.nameEn} ({countInZone})
              </button>
            );
          })}
        </div>

        {/* Quick Takeaway Button (Physical 3D tactile button) */}
        <button
          onClick={onOpenTakeaway}
          className="btn-3d-emerald flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white font-extrabold text-sm transition shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t.quickTakeaway}</span>
          {activeTakeawayOrders.length > 0 && (
            <span className="bg-emerald-950/60 px-2 py-0.5 rounded-full text-xs font-black shadow-inner">
              {activeTakeawayOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Takeaways strip if any */}
      {activeTakeawayOrders.length > 0 && (
        <div className="card-3d bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 p-4 rounded-3xl">
          <div className="flex items-center gap-2 mb-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>ออเดอร์กลับบ้านที่เปิดอยู่ ({activeTakeawayOrders.length} คิว)</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {activeTakeawayOrders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => onOpenOrder(ord.id)}
                className="surface-3d cursor-pointer shrink-0 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-md hover:border-emerald-500 transition min-w-[160px]"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                    {ord.queueNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3" />
                    {Math.round((Date.now() - ord.createdAt) / 60000)} น.
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {ord.items.filter((i) => i.status !== 'voided').length} รายการ
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                  ฿{ord.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 shadow-inner" />
          <span>{t.tableStatusEmpty}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_2px_4px_rgba(245,158,11,0.4)]" />
          <span>{t.tableStatusOrdering}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_2px_4px_rgba(168,85,247,0.4)]" />
          <span>{t.tableStatusWaitingPayment}</span>
        </div>
      </div>

      {/* Table Grid (Tablet-first 3D tactile cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
        {filteredTables.map((table) => {
          const activeOrder = orders.find(
            (o) => o.tableId === table.id && o.status === 'open'
          );
          const isOccupied = !!activeOrder;
          const itemsCount = activeOrder
            ? activeOrder.items.filter((i) => i.status !== 'voided').length
            : 0;

          const minutesSeated = activeOrder
            ? Math.floor((Date.now() - activeOrder.createdAt) / 60000)
            : 0;

          let cardClasses = 'card-3d surface-3d';
          let badgeClasses = 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

          if (isOccupied) {
            if (activeOrder.items.some((i) => i.status === 'ready' || i.status === 'served')) {
              // Waiting to pay / eating
              cardClasses = 'card-3d surface-3d ring-2 ring-purple-400/50 dark:ring-purple-500/50 shadow-[0_12px_24px_-4px_rgba(168,85,247,0.2)] bg-gradient-to-b from-purple-50/60 to-white dark:from-purple-950/30 dark:to-slate-900';
              badgeClasses = 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs';
            } else {
              // Ordering / cooking
              cardClasses = 'card-3d surface-3d ring-2 ring-amber-400/50 dark:ring-amber-500/50 shadow-[0_12px_24px_-4px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/30 dark:to-slate-900';
              badgeClasses = 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs';
            }
          }

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`cursor-pointer rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[155px] ${cardClasses}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-xs">
                    {table.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-0.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>{table.seats} {t.tableSeats}</span>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${badgeClasses}`}>
                  {isOccupied ? activeOrder?.queueNumber : t.tableStatusEmpty}
                </div>
              </div>

              {/* Status details inside card */}
              {isOccupied && activeOrder ? (
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-500" />
                      {itemsCount} รายการ
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {minutesSeated} น.
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400 font-bold">ยอดรวม</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      ฿{activeOrder.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-center py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-bold hover:text-amber-500 transition shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <Plus className="w-4 h-4 mr-1 text-amber-500" />
                  <span>{t.openNewTable}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guest Count Picker Modal */}
      {guestPickerTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="card-3d w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              เปิดโต๊ะ {guestPickerTable.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              เลือกจำนวนลูกค้า (จำนวนที่นั่งปกติ: {guestPickerTable.seats})
            </p>

            <div className="grid grid-cols-4 gap-2.5 my-6">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleConfirmOpenTable(num)}
                  className="btn-3d-slate h-13 rounded-2xl hover:btn-3d-amber text-base font-black text-slate-800 dark:text-slate-100 transition"
                >
                  {num} คน
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGuestPickerTable(null)}
                className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
