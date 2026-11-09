import React, { useState } from 'react';
import {
  X,
  Store,
  Receipt,
  QrCode,
  Lock,
  Database,
  RotateCcw,
  Check,
  Percent,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { VatMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    shopConfig,
    updateShopConfig,
    resetDemoData,
    changeManagerPin,
    isDemoMode,
    toggleDemoMode,
    firebaseConfig,
    saveFirebaseSettings,
    language,
  } = usePos();

  const t = translations[language];

  // Local form state
  const [name, setName] = useState(shopConfig.name);
  const [address, setAddress] = useState(shopConfig.address);
  const [phone, setPhone] = useState(shopConfig.phone);
  const [taxId, setTaxId] = useState(shopConfig.taxId);
  const [vatMode, setVatMode] = useState<VatMode>(shopConfig.vatMode);
  const [serviceChargeRate, setServiceChargeRate] = useState(shopConfig.serviceChargeRate);
  const [promptPayId, setPromptPayId] = useState(shopConfig.promptPayId);
  const [promptPayName, setPromptPayName] = useState(shopConfig.promptPayName || '');
  const [receiptHeader, setReceiptHeader] = useState(shopConfig.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(shopConfig.receiptFooter);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>(
    shopConfig.printerPaperSize || '80mm'
  );

  // New PIN state
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);

  // Firebase config state
  const [demoActive, setDemoActive] = useState(isDemoMode);
  const [fbApiKey, setFbApiKey] = useState(firebaseConfig.apiKey || '');
  const [fbProjectId, setFbProjectId] = useState(firebaseConfig.projectId || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(firebaseConfig.authDomain || '');
  const [fbAppId, setFbAppId] = useState(firebaseConfig.appId || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    updateShopConfig({
      name,
      address,
      phone,
      taxId,
      vatMode,
      serviceChargeRate,
      promptPayId,
      promptPayName,
      receiptHeader,
      receiptFooter,
      printerPaperSize,
    });

    if (newPin && newPin.length === 4) {
      await changeManagerPin(newPin);
    }

    toggleDemoMode(demoActive);
    saveFirebaseSettings({
      ...firebaseConfig,
      apiKey: fbApiKey,
      projectId: fbProjectId,
      authDomain: fbAuthDomain,
      appId: fbAppId,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetDemo = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างเมนูอาหารไทยทั้งหมดใช่หรือไม่?')) {
      resetDemoData();
      alert('รีเซ็ตข้อมูลเรียบร้อยแล้ว');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-3xl card-3d flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/60 dark:bg-slate-800/40">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 shadow-xs">
                <Store className="w-5 h-5 text-amber-500" />
              </span>
              <span>{t.settingsTitle}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ตั้งค่าข้อมูลร้านค้า ภาษี VAT รหัสพร้อมเพย์ และระบบ Firebase
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* 1. Shop Info */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
              <Store className="w-4 h-4 text-amber-500" />
              <span>{t.shopInfo}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.shopName}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.shopPhone}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {t.shopAddress}
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {t.shopTaxId}
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="01055xxxxxxxx"
                className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          {/* 2. Tax & Service Charge */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
              <Percent className="w-4 h-4 text-emerald-500" />
              <span>ภาษีและค่าบริการ (VAT & Service Charge)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.vatSettings}
                </label>
                <select
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="none">{t.vatNone}</option>
                  <option value="included">{t.vatIncluded}</option>
                  <option value="excluded">{t.vatExcluded}</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.serviceChargeSettings}
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={serviceChargeRate}
                  onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* 3. PromptPay Setup */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
              <QrCode className="w-4 h-4 text-blue-500" />
              <span>{t.promptPaySettings} (EMVCo Dynamic QR)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.promptPayIdLabel}
                </label>
                <input
                  type="text"
                  value={promptPayId}
                  onChange={(e) => setPromptPayId(e.target.value)}
                  placeholder="เช่น 0812345678 หรือ 1100200300400"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {t.promptPayNameLabel}
                </label>
                <input
                  type="text"
                  value={promptPayName}
                  onChange={(e) => setPromptPayName(e.target.value)}
                  placeholder="เช่น บจก. บ้านสบาย คาเฟ่"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 4. Receipt & Printer */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
              <Receipt className="w-4 h-4 text-purple-500" />
              <span>{t.receiptNotes} & เครื่องพิมพ์ความร้อน</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ขนาดกระดาษพิมพ์เริ่มต้น
                </label>
                <select
                  value={printerPaperSize}
                  onChange={(e) => setPrinterPaperSize(e.target.value as '58mm' | '80mm')}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="80mm">80 มม. (มาตรฐานเคาน์เตอร์ POS)</option>
                  <option value="58mm">58 มม. (เครื่องพิมพ์พกพาไร้สาย)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ข้อความท้ายใบเสร็จ
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="ขอบคุณที่ใช้บริการ / WiFi"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 5. Manager PIN */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 border-b pb-1.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>{t.managerPinTitle}</span>
            </h4>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="ตั้งรหัสใหม่ 4 หลัก (ค่าเดิม: 1234)"
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-mono tracking-widest"
                />
              </div>
              <span className="text-xs text-slate-400">
                (ใช้สำหรับ Void บิล / ยกเลิกรายการ / ให้ส่วนลด)
              </span>
            </div>
          </div>

          {/* 6. Firebase & Deployment config */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>{t.firebaseConfigSection} (Spark Free Plan 100%)</span>
              </h4>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-600 dark:text-amber-400">
                <input
                  type="checkbox"
                  checked={demoActive}
                  onChange={(e) => setDemoActive(e.target.checked)}
                  className="rounded-sm"
                />
                <span>{t.useDemoMode}</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-500">
              รองรับ Offline Persistence 100% ด้วย multi-tab cache และคำนวณสรุปด้วย Daily Summary doc จึงไม่กินโควตา Free Plan
            </p>

            {!demoActive && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {t.firebaseApiKey}
                  </label>
                  <input
                    type="text"
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {t.firebaseProjectId}
                  </label>
                  <input
                    type="text"
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. Reset sample data */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold border border-rose-200 dark:border-rose-900 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.seedSampleData}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl btn-3d-slate text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl btn-3d-amber text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-white" /> : null}
            <span>{savedSuccess ? 'บันทึกเรียบร้อย' : t.saveSettings}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
