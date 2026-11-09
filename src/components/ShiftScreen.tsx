import React, { useState } from 'react';
import {
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Lock,
  Receipt,
  RotateCcw,
  User,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { Shift } from '../types';

export const ShiftScreen: React.FC = () => {
  const {
    currentShift,
    openShift,
    closeShift,
    recordCashMovement,
    orders,
    language,
    currentUserName,
  } = usePos();

  const t = translations[language];

  // Open Shift State
  const [openingFloat, setOpeningFloat] = useState<number>(2000);

  // Pay in / out Modal
  const [movementModal, setMovementModal] = useState<{
    open: boolean;
    type: 'pay_in' | 'pay_out';
  }>({ open: false, type: 'pay_in' });
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementNote, setMovementNote] = useState<string>('');

  // Close shift modal
  const [closeModalOpen, setCloseModalOpen] = useState<boolean>(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closedShiftResult, setClosedShiftResult] = useState<{
    shift: Shift;
    expectedCash: number;
    difference: number;
  } | null>(null);

  // Calculate live shift figures if shift is active
  const shiftOrders = currentShift
    ? orders.filter((o) => o.shiftId === currentShift.id && o.status === 'paid')
    : [];

  let liveCashSales = 0;
  let livePromptPaySales = 0;
  let liveCardSales = 0;
  let liveOtherSales = 0;

  shiftOrders.forEach((o) => {
    o.payments.forEach((p) => {
      if (p.method === 'cash') liveCashSales += p.amount;
      if (p.method === 'promptpay') livePromptPaySales += p.amount;
      if (p.method === 'card') liveCardSales += p.amount;
      if (p.method === 'other') liveOtherSales += p.amount;
    });
  });

  const netMovements = currentShift
    ? currentShift.cashMovements.reduce(
        (sum, m) => (m.type === 'pay_in' ? sum + m.amount : sum - m.amount),
        0
      )
    : 0;

  const currentExpectedCash = currentShift
    ? currentShift.openingCash + liveCashSales + netMovements
    : 0;

  const handleOpenShift = () => {
    openShift(openingFloat);
  };

  const handleAddMovement = () => {
    if (movementAmount <= 0) return;
    recordCashMovement(movementModal.type, movementAmount, movementNote);
    setMovementModal({ open: false, type: 'pay_in' });
    setMovementAmount(0);
    setMovementNote('');
  };

  const handleConfirmClose = () => {
    const result = closeShift(countedCash);
    setClosedShiftResult(result);
    setCloseModalOpen(false);
  };

  return (
    <div className="flex-1 p-3 sm:p-5 max-w-5xl mx-auto w-full space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            <span>{t.shiftTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกเงินสดรับ-จ่าย การเปิดกะ และการสรุปยอดนับเงินปิดกะ
          </p>
        </div>

        {currentShift ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCountedCash(currentExpectedCash);
                setCloseModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 active:scale-98 transition flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>{t.closeShiftBtn}</span>
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            {t.noOpenShift}
          </div>
        )}
      </div>

      {/* CLOSED SHIFT RESULT MODAL / BANNER */}
      {closedShiftResult && (
        <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-extrabold text-lg">
            <CheckCircle2 className="w-6 h-6" />
            <span>ปิดกะขายเรียบร้อยแล้ว</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border">
              <span className="text-xs text-slate-400">เงินทอนเริ่มแรก</span>
              <p className="font-extrabold mt-1">
                ฿{closedShiftResult.shift.openingCash.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border">
              <span className="text-xs text-slate-400">เงินสดที่ควรมี</span>
              <p className="font-extrabold mt-1">
                ฿{closedShiftResult.expectedCash.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border">
              <span className="text-xs text-slate-400">เงินสดนับจริง</span>
              <p className="font-extrabold mt-1">
                ฿{(closedShiftResult.shift.closingCash || 0).toLocaleString()}
              </p>
            </div>
            <div className={`p-3 bg-white dark:bg-slate-900 rounded-2xl border ${
              closedShiftResult.difference === 0
                ? 'text-emerald-600'
                : closedShiftResult.difference > 0
                ? 'text-blue-600'
                : 'text-rose-600'
            }`}>
              <span className="text-xs text-slate-400">ผลต่าง (เกิน/ขาด)</span>
              <p className="font-extrabold mt-1">
                {closedShiftResult.difference > 0 ? '+' : ''}
                ฿{closedShiftResult.difference.toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={() => setClosedShiftResult(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            ปิดหน้าสรุป
          </button>
        </div>
      )}

      {/* IF NO OPEN SHIFT: SHOW OPEN SHIFT WIZARD */}
      {!currentShift && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
            <DollarSign className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {t.openShiftPrompt}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ระบุเงินสดเริ่มต้นในลิ้นชัก (Opening Float) เพื่อเริ่มต้นบันทึกการขาย
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">{t.openingCash}</span>
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className="text-2xl font-black text-slate-400">฿</span>
                <input
                  type="number"
                  value={openingFloat || ''}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  className="w-40 text-3xl font-black text-slate-900 dark:text-white text-center bg-transparent focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-4 gap-2.5">
              {[1000, 1500, 2000, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOpeningFloat(preset)}
                  className="btn-3d-slate py-2 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-100 hover:btn-3d-amber transition"
                >
                  ฿{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleOpenShift}
            className="btn-3d-amber w-full py-3.5 rounded-2xl text-white font-black text-base shadow-lg transition"
          >
            {t.openShiftBtn}
          </button>
        </div>
      )}

      {/* IF SHIFT IS ACTIVE: DASHBOARD & CASH MOVEMENTS */}
      {currentShift && (
        <div className="space-y-5">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4.5">
            <div className="card-3d surface-3d p-4.5 rounded-3xl">
              <span className="text-xs text-slate-400 font-bold">{t.openingCash}</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 drop-shadow-xs">
                ฿{currentShift.openingCash.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block flex items-center gap-1 font-semibold">
                <User className="w-3 h-3 text-amber-500" /> {currentShift.openedByName}
              </span>
            </div>

            <div className="card-3d surface-3d p-4.5 rounded-3xl">
              <span className="text-xs text-slate-400 font-bold">ยอดขายเงินสด (Cash)</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 drop-shadow-xs">
                ฿{liveCashSales.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                {shiftOrders.length} บิลที่ชำระแล้ว
              </span>
            </div>

            <div className="card-3d surface-3d p-4.5 rounded-3xl">
              <span className="text-xs text-slate-400 font-bold">ยอดขายพร้อมเพย์ / บัตร</span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 drop-shadow-xs">
                ฿{(livePromptPaySales + liveCardSales + liveOtherSales).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
                QR ฿{livePromptPaySales.toLocaleString()} • บัตร ฿{liveCardSales.toLocaleString()}
              </span>
            </div>

            <div className="card-3d surface-3d p-4.5 rounded-3xl ring-2 ring-amber-400/40 dark:ring-amber-500/40 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
              <span className="text-xs text-amber-800 dark:text-amber-400 font-black">{t.expectedCash}</span>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 drop-shadow-xs">
                ฿{currentExpectedCash.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block font-semibold">
                (เงินทอน + เงินสดรับ + เข้า/ออก)
              </span>
            </div>
          </div>

          {/* Middle Row: Pay In / Pay Out Action Buttons */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                นำเงินสดเข้า / เบิกเงินออก (Cash In / Out)
              </h3>
              <p className="text-xs text-slate-400">
                บันทึกการซื้อของใช้ด่วน เติมเงินทอน หรือจ่ายค่าวัตถุดิบหน้าร้าน
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMovementModal({ open: true, type: 'pay_in' })}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>{t.payInBtn}</span>
              </button>

              <button
                onClick={() => setMovementModal({ open: true, type: 'pay_out' })}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>{t.payOutBtn}</span>
              </button>
            </div>
          </div>

          {/* Cash Movement History List */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.cashMovements} ({currentShift.cashMovements.length})
            </h4>

            {currentShift.cashMovements.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                ยังไม่มีการบันทึกเงินเข้าหรือเงินออกในกะนี้
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentShift.cashMovements.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {m.type === 'pay_in' ? (
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                          <ArrowDownCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600">
                          <ArrowUpCircle className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {m.type === 'pay_in' ? 'นำเงินเข้า (Pay In)' : 'นำเงินออก (Pay Out)'}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {m.note || 'ไม่มีหมายเหตุ'} • โดย {m.by}
                        </p>
                      </div>
                    </div>

                    <span className={`font-mono font-bold text-sm ${
                      m.type === 'pay_in' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {m.type === 'pay_in' ? '+' : '-'}฿{m.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pay In / Pay Out Modal */}
      {movementModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {movementModal.type === 'pay_in' ? (
                <>
                  <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                  <span>บันทึกนำเงินเข้า (Pay In)</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-5 h-5 text-rose-500" />
                  <span>บันทึกนำเงินออก (Pay Out)</span>
                </>
              )}
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-500">จำนวนเงิน (บาท)</label>
              <input
                type="number"
                min="0"
                value={movementAmount || ''}
                onChange={(e) => setMovementAmount(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-lg font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500">เหตุผล / หมายเหตุ</label>
              <input
                type="text"
                value={movementNote}
                onChange={(e) => setMovementNote(e.target.value)}
                placeholder="เช่น ซื้อน้ำแข็ง, เติมเหรียญสิบทอน"
                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovementModal({ open: false, type: 'pay_in' })}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={movementAmount <= 0}
                onClick={handleAddMovement}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-bold shadow-md"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />
              <span>{t.closeShiftBtn}</span>
            </h3>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span>เงินทอนเริ่มแรก:</span>
                <span>฿{currentShift?.openingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>ยอดขายเงินสด:</span>
                <span>฿{liveCashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>เงินเข้า-ออกสุทธิ:</span>
                <span>{netMovements >= 0 ? '+' : ''}฿{netMovements.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t text-sm">
                <span>เงินสดที่ควรมีตามระบบ:</span>
                <span className="text-amber-600 dark:text-amber-400">
                  ฿{currentExpectedCash.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.actualCashCount}
              </label>
              <input
                type="number"
                min="0"
                value={countedCash || ''}
                onChange={(e) => setCountedCash(Number(e.target.value))}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-2xl font-black text-slate-900 dark:text-white text-center"
              />
            </div>

            {/* Difference indicator */}
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
              countedCash - currentExpectedCash === 0
                ? 'bg-emerald-50 text-emerald-700'
                : countedCash - currentExpectedCash > 0
                ? 'bg-blue-50 text-blue-700'
                : 'bg-rose-50 text-rose-700'
            }`}>
              <span>ผลต่าง (Difference):</span>
              <span>
                {countedCash - currentExpectedCash > 0 ? '+' : ''}
                ฿{(countedCash - currentExpectedCash).toLocaleString()}
                {countedCash - currentExpectedCash === 0
                  ? ' (ตรงเป๊ะ)'
                  : countedCash - currentExpectedCash > 0
                  ? ' (เงินเกิน)'
                  : ' (เงินขาด)'}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCloseModalOpen(false)}
                className="flex-1 py-3 rounded-xl border text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
              >
                ยืนยันปิดกะ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
