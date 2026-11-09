import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { Order } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  receiptNumber?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  order,
  receiptNumber,
  onClose,
}) => {
  const { shopConfig, language } = usePos();
  const t = translations[language];

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(
    shopConfig.printerPaperSize || '80mm'
  );

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const recNum = receiptNumber || order.receiptNumber || `INV-${order.id.slice(-6)}`;
  const dateStr = new Date(order.paidAt || order.updatedAt).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const activeItems = order.items.filter((i) => i.status !== 'voided');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-md rounded-3xl card-3d flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Controls (not printed) */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 font-bold shadow-xs">
              <CheckCircle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {t.receiptTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono font-medium">{recNum}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm toggle */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold border border-slate-300/50 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperWidth === '58mm' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-black shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  paperWidth === '80mm' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-black shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body (This portion is styled to look exactly like a thermal paper receipt) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white text-black p-5 shadow-sm font-mono text-xs rounded-xl border border-slate-300 transition-all ${
              paperWidth === '58mm' ? 'w-[260px] text-[11px]' : 'w-[340px] text-xs'
            }`}
          >
            {/* Shop Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                {shopConfig.name}
              </h2>
              <p className="text-[10px] text-gray-600 leading-snug">
                {shopConfig.address}
              </p>
              {shopConfig.phone && (
                <p className="text-[10px] text-gray-600">โทร: {shopConfig.phone}</p>
              )}
              {shopConfig.taxId && (
                <p className="text-[10px] text-gray-600">
                  เลขประจำตัวผู้เสียภาษี: {shopConfig.taxId}
                </p>
              )}

              <div className="pt-1">
                <span className="font-bold border border-gray-400 px-2 py-0.5 text-[10px] uppercase">
                  {t.taxInvoiceAbbr} (ABB)
                </span>
              </div>
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 space-y-0.5 border-b border-dashed border-gray-400 text-[10px]">
              <div className="flex justify-between">
                <span>เลขที่ / INV:</span>
                <span className="font-bold">{recNum}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่ / Date:</span>
                <span>{dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>โต๊ะ / Table:</span>
                <span className="font-bold">{order.tableName} ({order.queueNumber})</span>
              </div>
              <div className="flex justify-between">
                <span>แคชเชียร์ / Cashier:</span>
                <span>{order.openedByName || 'Cashier'}</span>
              </div>
            </div>

            {/* Items Header */}
            <div className="py-1.5 flex justify-between font-bold border-b border-dashed border-gray-400 text-[11px]">
              <span>รายการอาหาร (Qty x Name)</span>
              <span>รวม</span>
            </div>

            {/* Items List */}
            <div className="py-2 space-y-2 border-b border-dashed border-gray-400">
              {activeItems.map((item) => {
                const modifierSum = item.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
                const itemTotal = (item.price + modifierSum) * item.qty;

                return (
                  <div key={item.orderItemId} className="space-y-0.5">
                    <div className="flex justify-between items-start">
                      <span className="font-bold flex-1 pr-2">
                        {item.qty}x {item.nameTh}
                      </span>
                      <span className="font-extrabold shrink-0">
                        {itemTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Modifiers line */}
                    {item.selectedModifiers.length > 0 && (
                      <div className="pl-4 text-[10px] text-gray-500">
                        {item.selectedModifiers.map((m, idx) => (
                          <div key={idx}>
                            + {m.optionName} {m.priceDelta > 0 ? `(+${m.priceDelta})` : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    {item.note && (
                      <div className="pl-4 text-[10px] text-gray-400 italic">
                        * {item.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals & VAT Breakdown */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-gray-400 text-[11px]">
              <div className="flex justify-between">
                <span>รวมเงิน (Subtotal):</span>
                <span>฿{order.subtotal.toFixed(2)}</span>
              </div>

              {order.discount.amount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>ส่วนลด (Discount):</span>
                  <span>-฿{order.discount.amount.toFixed(2)}</span>
                </div>
              )}

              {order.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span>ค่าบริการ (Service Charge):</span>
                  <span>฿{order.serviceCharge.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-300">
                <span>ยอดสุทธิ (Grand Total):</span>
                <span>฿{order.total.toFixed(2)}</span>
              </div>

              {/* VAT Breakdown */}
              {shopConfig.vatMode !== 'none' && (
                <div className="pt-1.5 text-[10px] text-gray-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>มูลค่าสินค้าก่อนภาษี:</span>
                    <span>฿{(order.total - order.vat).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span>฿{order.vat.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payments Summary */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-gray-400 text-[10px]">
              {order.payments.map((p) => (
                <div key={p.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>
                      {p.method === 'cash'
                        ? 'เงินสด (Cash)'
                        : p.method === 'promptpay'
                        ? 'พร้อมเพย์ (PromptPay)'
                        : p.method === 'card'
                        ? 'บัตรเครดิต/เดบิต (Card)'
                        : 'อื่นๆ (Other)'}
                    </span>
                    <span>฿{p.amount.toFixed(2)}</span>
                  </div>
                  {p.method === 'cash' && p.tenderedAmount !== undefined && (
                    <>
                      <div className="flex justify-between pl-2 text-gray-600">
                        <span>รับเงินมา (Tendered):</span>
                        <span>฿{p.tenderedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pl-2 font-bold">
                        <span>เงินทอน (Change Due):</span>
                        <span>฿{(p.change || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Receipt Footer Message */}
            <div className="pt-3 text-center text-[10px] text-gray-600 space-y-1">
              <p className="font-bold">{shopConfig.receiptFooter || t.thankYouMessage}</p>
              <p className="text-[9px] text-gray-400">Powered by SabaiPOS</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons (Print / Close) */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl btn-3d-slate text-slate-700 dark:text-slate-300 font-bold text-sm"
          >
            {t.closeReceipt}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl btn-3d-amber text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>{t.printReceipt}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
