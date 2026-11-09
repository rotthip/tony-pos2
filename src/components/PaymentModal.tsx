import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  CheckCircle2,
  Copy,
  Check,
  Divide,
  AlertCircle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { PaymentMethod, PaymentRecord, Order } from '../types';
import { generatePromptPayPayload } from '../utils/promptpay';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paidOrder: Order, receiptNumber: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const {
    activeOrder,
    shopConfig,
    processPayment,
    language,
  } = usePos();

  const t = translations[language];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [copiedPromptPay, setCopiedPromptPay] = useState<boolean>(false);

  // Split bill states
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [splitCount, setSplitCount] = useState<number>(2);

  // Canvas ref for PromptPay QR
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalAmount = activeOrder ? activeOrder.total : 0;
  const targetAmount = isSplitting ? Math.ceil((totalAmount / splitCount) * 100) / 100 : totalAmount;

  // Initialize tendered amount with exact target amount
  useEffect(() => {
    if (isOpen && activeOrder) {
      setTenderedAmount(targetAmount);
    }
  }, [isOpen, activeOrder, targetAmount]);

  // Generate dynamic PromptPay QR whenever PromptPay tab is active
  useEffect(() => {
    if (paymentMethod === 'promptpay' && canvasRef.current && shopConfig.promptPayId) {
      try {
        const payload = generatePromptPayPayload(shopConfig.promptPayId, targetAmount);
        QRCode.toCanvas(canvasRef.current, payload, {
          width: 240,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error('Failed to generate PromptPay QR:', err);
      }
    }
  }, [paymentMethod, targetAmount, shopConfig.promptPayId]);

  if (!isOpen || !activeOrder) return null;

  const changeDue = Math.max(0, tenderedAmount - targetAmount);
  const isCashInsufficient = paymentMethod === 'cash' && tenderedAmount < targetAmount;

  const handleCopyPromptPay = () => {
    if (shopConfig.promptPayId && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shopConfig.promptPayId);
      setCopiedPromptPay(true);
      setTimeout(() => setCopiedPromptPay(false), 2000);
    }
  };

  const handleQuickCash = (amount: number) => {
    setTenderedAmount(amount);
  };

  const handleAddCash = (increment: number) => {
    setTenderedAmount((prev) => prev + increment);
  };

  const handleConfirmPayment = () => {
    const paymentRecord: PaymentRecord = {
      id: 'pay_' + Date.now(),
      method: paymentMethod,
      amount: targetAmount,
      tenderedAmount: paymentMethod === 'cash' ? tenderedAmount : targetAmount,
      change: paymentMethod === 'cash' ? changeDue : 0,
      timestamp: Date.now(),
    };

    const { order, receiptNumber } = processPayment(activeOrder.id, [paymentRecord]);
    onClose();
    onPaymentSuccess(order, receiptNumber);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="card-3d w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white drop-shadow-xs">
                {t.paymentTitle} - {activeOrder.tableName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-black shadow-xs">
                {activeOrder.queueNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {activeOrder.items.filter((i) => i.status !== 'voided').length} รายการอาหาร
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-3d-slate p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split Left (Payment Methods & Split) / Right (Details & Numeric) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEFT COLUMN: Total & Methods */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Grand Total Box */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                ยอดที่ต้องชำระ
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  ฿{targetAmount.toLocaleString()}
                </span>
                {isSplitting && (
                  <span className="text-xs font-semibold text-slate-500">
                    (หาร {splitCount} คน จาก ฿{totalAmount})
                  </span>
                )}
              </div>

              {/* Split Toggle */}
              <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSplitting(!isSplitting)}
                  className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition ${
                    isSplitting
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Divide className="w-3.5 h-3.5" />
                  <span>{t.splitEqually}</span>
                </button>

                {isSplitting && (
                  <div className="flex items-center gap-1.5">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSplitCount(n)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold ${
                          splitCount === n
                            ? 'bg-amber-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.paymentMethod}
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-500 mb-1" />
                  <span className="text-xs font-bold">{t.cash}</span>
                </button>

                {/* PromptPay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('promptpay')}
                  className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                    paymentMethod === 'promptpay'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-xs font-bold">{t.promptpay}</span>
                </button>

                {/* Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                    paymentMethod === 'card'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-500 mb-1" />
                  <span className="text-xs font-bold">{t.card}</span>
                </button>

                {/* Other */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('other')}
                  className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition ${
                    paymentMethod === 'other'
                      ? 'border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold">{t.otherPayment}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Specific Method Details */}
          <div className="md:col-span-7 flex flex-col justify-between">
            {/* CASH Flow */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                {/* Cash Tendered & Change Due */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500">{t.tenderedAmount}</span>
                    <input
                      type="number"
                      value={tenderedAmount || ''}
                      onChange={(e) => setTenderedAmount(Number(e.target.value))}
                      className="mt-1 w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div className={`p-3 rounded-2xl border ${
                    isCashInsufficient
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-600'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    <span className="text-[11px] font-bold">
                      {isCashInsufficient ? t.insufficientCash : t.changeAmount}
                    </span>
                    <div className="mt-1 text-2xl font-black">
                      ฿{changeDue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Quick Baht Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">
                    ปุ่มรับเงินด่วน (ธนบัตรไทย)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(targetAmount)}
                      className="btn-3d-amber py-2.5 rounded-2xl text-white text-xs font-black transition"
                    >
                      {t.exactAmount} (฿{targetAmount})
                    </button>
                    {[50, 100, 500, 1000].map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => handleQuickCash(note)}
                        className="btn-3d-slate py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 text-xs font-black transition"
                      >
                        ฿{note}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddCash(100)}
                      className="btn-3d-slate py-2.5 rounded-2xl text-slate-800 dark:text-slate-100 text-xs font-black transition"
                    >
                      +฿100
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PROMPTPAY Flow */}
            {paymentMethod === 'promptpay' && (
              <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-inner">
                {/* Bank of Thailand PromptPay Header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="px-3 py-1 rounded-lg bg-[#003B71] text-white font-black text-xs tracking-wider shadow-xs">
                    Thai QR Payment
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    พร้อมเพย์
                  </span>
                </div>

                {/* Dynamic QR Canvas */}
                <div className="p-3 bg-white rounded-3xl shadow-lg border border-slate-200">
                  <canvas ref={canvasRef} className="rounded-2xl w-48 h-48" />
                </div>

                <div className="mt-3.5 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-xs font-bold text-slate-500">
                      {shopConfig.promptPayName || 'บัญชีพร้อมเพย์'}
                    </span>
                    <button
                      onClick={handleCopyPromptPay}
                      className="btn-3d-slate p-1 rounded-lg text-slate-500"
                      title={t.copyPromptPayId}
                    >
                      {copiedPromptPay ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {shopConfig.promptPayId}
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-bold">
                    {t.promptPayDynamicNote}
                  </p>
                </div>
              </div>
            )}

            {/* CARD Flow */}
            {paymentMethod === 'card' && (
              <div className="p-6 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 text-center space-y-3 shadow-xs">
                <CreditCard className="w-12 h-12 text-purple-600 mx-auto" />
                <h4 className="font-extrabold text-sm text-purple-900 dark:text-purple-300">
                  เครื่องรูดบัตร EDC / บัตรเครดิต
                </h4>
                <p className="text-xs text-purple-700 dark:text-purple-400">
                  กรุณารูดบัตรผ่านเครื่อง EDC ภายนอกของธนาคารตามยอด <strong>฿{targetAmount.toLocaleString()}</strong> แล้วกดปุ่มยืนยัน
                </p>
              </div>
            )}

            {/* OTHER Flow */}
            {paymentMethod === 'other' && (
              <div className="p-6 rounded-3xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
                <Wallet className="w-12 h-12 text-slate-400 mx-auto" />
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  การชำระเงินอื่นๆ (E-Wallet, Food Delivery, คูปอง)
                </h4>
                <p className="text-xs text-slate-500">
                  บันทึกการชำระเงินประเภทอื่นๆ เข้าระบบยอดขาย
                </p>
              </div>
            )}

            {/* Confirm Payment Button */}
            <div className="mt-6">
              <button
                type="button"
                disabled={isCashInsufficient}
                onClick={handleConfirmPayment}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition ${
                  isCashInsufficient
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'btn-3d-emerald text-white'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.confirmPayment}</span>
                <span className="font-mono ml-1">(฿{targetAmount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
