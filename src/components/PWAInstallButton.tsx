import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { language } = usePos();
  const t = translations[language];

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl btn-3d-emerald text-white cursor-pointer"
        title={t.installPwa}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t.installPwa}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl btn-3d-slate text-slate-700 dark:text-slate-300"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">PWA iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl card-3d p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-xs">
                    <Smartphone className="w-5 h-5 text-emerald-500" />
                  </span>
                  ติดตั้งบน iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 active:scale-95 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">1</div>
                  <p>กดปุ่ม <strong>แชร์ (Share)</strong> ที่แถบเครื่องมือ Safari ด้านล่าง</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">2</div>
                  <p>เลื่อนลงแล้วแตะ <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">3</div>
                  <p>เปิดแอปจากหน้าจอโฮม จะแสดงผลแบบเต็มหน้าจอ POS ทันที</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-2xl btn-3d-slate text-slate-800 dark:text-slate-200 py-3 text-sm font-black"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
