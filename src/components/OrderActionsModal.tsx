import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Merge,
  Ban,
  Tag,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { ManagerPinModal } from './ManagerPinModal';
import { OrderDiscount } from '../types';

interface OrderActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActionTab = 'discount' | 'move' | 'merge' | 'voidItem' | 'voidBill';

export const OrderActionsModal: React.FC<OrderActionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeOrder,
    tablesConfig,
    orders,
    moveTable,
    mergeOrders,
    voidItem,
    voidEntireOrder,
    applyOrderDiscount,
    language,
    currentRole,
  } = usePos();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<ActionTab>('discount');

  // Discount state
  const [discType, setDiscType] = useState<'percent' | 'amount'>('percent');
  const [discValue, setDiscValue] = useState<number>(0);
  const [discReason, setDiscReason] = useState<string>('');

  // Move table state
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<string>('');

  // Merge table state
  const [selectedMergeOrderId, setSelectedMergeOrderId] = useState<string>('');

  // Void item state
  const [selectedVoidItemId, setSelectedVoidItemId] = useState<string>('');
  const [voidItemReason, setVoidItemReason] = useState<string>('ลูกค้าขอยกเลิก');

  // Void bill state
  const [voidBillReason, setVoidBillReason] = useState<string>('เปิดบิลผิดพลาด');

  // PIN modal control
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  if (!isOpen || !activeOrder) return null;

  // Available empty tables for Move
  const occupiedTableIds = orders
    .filter((o) => o.status === 'open' && o.tableId)
    .map((o) => o.tableId as string);

  const availableEmptyTables = tablesConfig.tables.filter(
    (tb) => !occupiedTableIds.includes(tb.id) && tb.id !== activeOrder.tableId
  );

  // Other open orders for Merge
  const otherOpenOrders = orders.filter(
    (o) => o.status === 'open' && o.id !== activeOrder.id
  );

  const requirePinOrExecute = (action: () => void) => {
    // If owner or manager, can proceed or still verify PIN
    if (currentRole === 'owner') {
      action();
      onClose();
    } else {
      setPendingAction(() => () => {
        action();
        onClose();
      });
      setPinModalOpen(true);
    }
  };

  const handleApplyDiscount = () => {
    const discount: OrderDiscount = {
      type: discType,
      value: discValue,
      amount: 0,
      reason: discReason.trim() || undefined,
    };

    if (discValue > 0) {
      requirePinOrExecute(() => {
        applyOrderDiscount(activeOrder.id, discount);
      });
    } else {
      applyOrderDiscount(activeOrder.id, discount);
      onClose();
    }
  };

  const handleMoveTable = () => {
    if (!selectedTargetTableId) return;
    const success = moveTable(activeOrder.id, selectedTargetTableId);
    if (success) {
      onClose();
    }
  };

  const handleMergeOrders = () => {
    if (!selectedMergeOrderId) return;
    requirePinOrExecute(() => {
      mergeOrders(activeOrder.id, selectedMergeOrderId);
    });
  };

  const handleVoidItem = () => {
    if (!selectedVoidItemId) return;
    requirePinOrExecute(() => {
      voidItem(activeOrder.id, selectedVoidItemId, voidItemReason);
    });
  };

  const handleVoidBill = () => {
    requirePinOrExecute(() => {
      voidEntireOrder(activeOrder.id, voidBillReason);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-3xl card-3d flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/60 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {t.orderActionsTitle} - {activeOrder.tableName} ({activeOrder.queueNumber})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ยอดปัจจุบัน ฿{activeOrder.total.toLocaleString()} • {activeOrder.items.length} รายการ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 p-1.5 gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('discount')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'discount'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>ส่วนลด (Discount)</span>
          </button>

          <button
            onClick={() => setActiveTab('move')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'move'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{t.moveTable}</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'merge'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Merge className="w-3.5 h-3.5" />
            <span>{t.mergeTables}</span>
          </button>

          <button
            onClick={() => setActiveTab('voidItem')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'voidItem'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{t.voidItem}</span>
          </button>

          <button
            onClick={() => setActiveTab('voidBill')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'voidBill'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.voidBill}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB: Discount */}
          {activeTab === 'discount' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ประเภทส่วนลด
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setDiscType('percent')}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      discType === 'percent'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    เปอร์เซ็นต์ (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscType('amount')}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      discType === 'amount'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    จำนวนเงิน (บาท)
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ปุ่มลัดส่วนลด
                </label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {discType === 'percent'
                    ? [5, 10, 15, 20].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDiscValue(p)}
                          className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-white"
                        >
                          {p}%
                        </button>
                      ))
                    : [20, 50, 100, 200].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setDiscValue(b)}
                          className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-white"
                        >
                          ฿{b}
                        </button>
                      ))}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ระบุค่าส่วนลด ({discType === 'percent' ? '%' : 'บาท'})
                </label>
                <input
                  type="number"
                  min="0"
                  max={discType === 'percent' ? 100 : activeOrder.subtotal}
                  value={discValue || ''}
                  onChange={(e) => setDiscValue(Number(e.target.value))}
                  placeholder="0"
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-base font-bold text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  เหตุผลส่วนลด (เช่น สมาชิกร้าน, บัตรพนักงาน, โปรโมชั่น)
                </label>
                <input
                  type="text"
                  value={discReason}
                  onChange={(e) => setDiscReason(e.target.value)}
                  placeholder="เช่น สมาชิก VIP, ส่วนลดพนักงาน"
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyDiscount}
                className="w-full py-3.5 rounded-2xl btn-3d-amber text-white font-extrabold text-sm shadow-md cursor-pointer"
              >
                บันทึกส่วนลด
              </button>
            </div>
          )}

          {/* TAB: Move Table */}
          {activeTab === 'move' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                เลือกโต๊ะว่างที่ต้องการย้ายออเดอร์นี้ไป
              </p>

              {availableEmptyTables.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500">
                  ไม่มีโต๊ะว่างในขณะนี้
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                  {availableEmptyTables.map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setSelectedTargetTableId(tb.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition ${
                        selectedTargetTableId === tb.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-base font-extrabold">{tb.name}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {tb.seats} ที่นั่ง
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={!selectedTargetTableId}
                onClick={handleMoveTable}
                className="w-full py-3.5 rounded-2xl btn-3d-blue disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md cursor-pointer"
              >
                ยืนยันย้ายโต๊ะ
              </button>
            </div>
          )}

          {/* TAB: Merge Tables */}
          {activeTab === 'merge' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                เลือกโต๊ะที่ต้องการนำรายการของโต๊ะนี้ไปรวมด้วย (บิลนี้จะถูกปิดหลังรวม)
              </p>

              {otherOpenOrders.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500">
                  ไม่มีบิลอื่นที่เปิดอยู่ในขณะนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {otherOpenOrders.map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setSelectedMergeOrderId(ord.id)}
                      className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition ${
                        selectedMergeOrderId === ord.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-black text-sm">{ord.tableName}</span>
                        <span className="ml-2 text-xs text-slate-400">({ord.queueNumber})</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ord.items.filter((i) => i.status !== 'voided').length} รายการ
                        </p>
                      </div>
                      <span className="font-extrabold text-sm">
                        ฿{ord.total.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={!selectedMergeOrderId}
                onClick={handleMergeOrders}
                className="w-full py-3.5 rounded-2xl btn-3d-teal disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md cursor-pointer"
              >
                ยืนยันรวมโต๊ะ (ต้องใช้รหัส PIN)
              </button>
            </div>
          )}

          {/* TAB: Void Item */}
          {activeTab === 'voidItem' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                เลือกรายการอาหารที่ต้องการยกเลิก (ต้องระบุสาเหตุและใส่รหัส PIN)
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeOrder.items
                  .filter((i) => i.status !== 'voided')
                  .map((item) => (
                    <button
                      key={item.orderItemId}
                      type="button"
                      onClick={() => setSelectedVoidItemId(item.orderItemId)}
                      className={`w-full p-3 rounded-2xl border-2 text-left flex items-center justify-between transition ${
                        selectedVoidItemId === item.orderItemId
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs sm:text-sm">
                          {language === 'th' ? item.nameTh : item.nameEn}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-slate-500">
                          x{item.qty}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          สถานะ: {item.status}
                        </span>
                      </div>
                      <span className="font-bold text-xs">
                        ฿{(item.price * item.qty).toLocaleString()}
                      </span>
                    </button>
                  ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  สาเหตุในการยกเลิก
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5 mb-2">
                  {[
                    'ลูกค้าขอยกเลิก',
                    'วัตถุดิบหมด',
                    'ทำรายการผิด',
                    'รอนานเกินไป',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVoidItemReason(r)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border ${
                        voidItemReason === r
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={voidItemReason}
                  onChange={(e) => setVoidItemReason(e.target.value)}
                  placeholder="ระบุเหตุผลอื่นๆ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={!selectedVoidItemId}
                onClick={handleVoidItem}
                className="w-full py-3.5 rounded-2xl btn-3d-rose disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md cursor-pointer"
              >
                ยืนยันยกเลิกรายการ (ต้องใช้รหัส PIN)
              </button>
            </div>
          )}

          {/* TAB: Void Entire Bill */}
          {activeTab === 'voidBill' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>คำเตือน: ยกเลิกทั้งบิล</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed">
                  การยกเลิกทั้งบิลจะทำให้ออเดอร์นี้สิ้นสุดลงทันที และบันทึกประวัติการ Void ลงในระบบเพื่อตรวจสอบ
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  สาเหตุในการยกเลิกทั้งบิล
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5 mb-2">
                  {[
                    'เปิดบิลผิดพลาด',
                    'ลูกค้ายกเลิกโต๊ะ',
                    'ทดสอบระบบ',
                    'อื่นๆ',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVoidBillReason(r)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border ${
                        voidBillReason === r
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={voidBillReason}
                  onChange={(e) => setVoidBillReason(e.target.value)}
                  placeholder="ระบุรายละเอียด..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleVoidBill}
                className="w-full py-3.5 rounded-2xl btn-3d-rose text-white font-extrabold text-sm shadow-md cursor-pointer"
              >
                ยืนยันยกเลิกทั้งบิล (ต้องใช้รหัส PIN)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manager PIN Modal */}
      <ManagerPinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setPinModalOpen(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
};
