import React, { useState } from 'react';
import { Lock, Delete, X, AlertCircle } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';

interface ManagerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
}) => {
  const { verifyManagerPin, language } = usePos();
  const t = translations[language];

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      // Auto submit when 4 digits reached
      if (nextPin.length === 4) {
        checkPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const checkPin = async (inputPin: string) => {
    setIsVerifying(true);
    try {
      const isValid = await verifyManagerPin(inputPin);
      if (isValid) {
        setPin('');
        setError(null);
        onSuccess();
      } else {
        setError(t.wrongPin);
        setPin('');
      }
    } catch {
      setError(t.wrongPin);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="card-3d w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 text-amber-500">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {title || t.pinModalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle || t.pinModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Dots Display */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-amber-500 scale-110 shadow-sm shadow-amber-500/50'
                      : 'border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <p className="mt-2 text-[11px] text-slate-400 text-center">
            {t.currentDemoPinNote}
          </p>
        </div>

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(digit)}
              className="btn-3d-slate h-14 rounded-2xl text-2xl font-black text-slate-800 dark:text-slate-100 transition"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="btn-3d-slate h-14 rounded-2xl text-xs font-black text-slate-500 dark:text-slate-400 transition"
          >
            ล้าง (C)
          </button>

          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="btn-3d-slate h-14 rounded-2xl text-2xl font-black text-slate-800 dark:text-slate-100 transition"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="btn-3d-slate h-14 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
