import React from 'react';
import {
  LayoutGrid,
  UtensilsCrossed,
  Tv,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Globe,
  User,
  LogIn,
  LogOut,
  Cloud,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';
import { Role } from '../types';

export type ActiveTab = 'tables' | 'order' | 'kds' | 'shift' | 'menu' | 'reports';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openSettings,
}) => {
  const {
    shopConfig,
    language,
    setLanguage,
    isDarkMode,
    toggleDarkMode,
    isOnline,
    pendingSyncCount,
    isDemoMode,
    currentRole,
    setCurrentRole,
    orders,
    currentShift,
    currentUser,
    authLoading,
    signInWithGoogle,
    signOutUser,
    firestoreLoading,
    firestoreError,
    clearFirestoreError,
  } = usePos();

  const t = translations[language];

  const activeBillsCount = orders.filter((o) => o.status === 'open').length;

  const roles: { id: Role; label: string }[] = [
    { id: 'cashier', label: t.roleCashier },
    { id: 'kitchen', label: t.roleKitchen },
    { id: 'manager', label: t.roleManager },
    { id: 'owner', label: t.roleOwner },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] border-b border-slate-800/80">
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Brand & Shop info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setActiveTab('tables')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-rose-500 flex items-center justify-center shadow-[0_6px_14px_rgba(245,158,11,0.35)] border-t border-amber-200/50 border-b-2 border-amber-700 active:scale-95 transition-all">
              <span className="text-xl drop-shadow-sm">🍲</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight text-white drop-shadow-xs">
                  {shopConfig.name ? shopConfig.name.split('(')[0] : t.appName}
                </h1>
                {isDemoMode && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-xs">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                {t.appSubtitle} {currentShift ? `• กะเปิดอยู่ (${currentShift.openedByName})` : '• ยังไม่เปิดกะ'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Touch-friendly 3D tactile keys) */}
        <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'tables'
                ? 'btn-3d-amber text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t.navTables}</span>
            {activeBillsCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'tables' ? 'bg-amber-900/60 text-amber-200' : 'bg-slate-700 text-amber-400'
              }`}>
                {activeBillsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('order')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'order'
                ? 'btn-3d-amber text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{t.navOrder}</span>
          </button>

          <button
            onClick={() => setActiveTab('kds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'kds'
                ? 'btn-3d-amber text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>{t.navKds}</span>
          </button>

          <button
            onClick={() => setActiveTab('shift')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'shift'
                ? 'btn-3d-amber text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t.navShift}</span>
          </button>

          {(currentRole === 'owner' || currentRole === 'manager') && (
            <>
              <button
                onClick={() => setActiveTab('menu')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'menu'
                    ? 'btn-3d-amber text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.navMenu}</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'reports'
                    ? 'btn-3d-amber text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t.navReports}</span>
              </button>
            </>
          )}
        </nav>

        {/* Right: Controls, Role Switcher, PWA, Offline */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online / Offline status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shadow-xs ${
              isOnline
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                : 'bg-amber-950/50 border-amber-700/60 text-amber-300 animate-pulse'
            }`}
            title={isOnline ? t.online : t.offline}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? t.online : t.offline}</span>
            {pendingSyncCount > 0 && (
              <span className="bg-amber-500 text-slate-900 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {pendingSyncCount}
              </span>
            )}
          </div>

          {/* Firebase Authentication & Cloud Sync */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-xl border border-slate-700/80 px-2 py-1 shadow-xs">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full border border-amber-400"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 font-black text-[10px] flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="hidden xl:block text-left leading-tight">
                <p className="text-[11px] font-bold text-white max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </p>
                <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                  <Cloud className="w-2.5 h-2.5" />
                  <span>Cloud Sync</span>
                </span>
              </div>
              <button
                type="button"
                onClick={signOutUser}
                title="ออกจากระบบ / Sign Out"
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authLoading}
              onClick={signInWithGoogle}
              className="btn-3d-amber flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black text-white cursor-pointer"
              title="เข้าสู่ระบบด้วย Google เพื่อซิงค์ข้อมูล Cloud Firestore"
            >
              {authLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Google Login</span>
            </button>
          )}

          {/* Cloud Sync Status Icon */}
          {currentUser && (
            <div
              className={`p-1.5 rounded-xl border ${
                firestoreLoading
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
              }`}
              title={firestoreLoading ? 'กำลังซิงค์ข้อมูล Cloud Firestore...' : 'Cloud Firestore เชื่อมต่อแบบเรียลไทม์'}
            >
              <Cloud className={`w-3.5 h-3.5 ${firestoreLoading ? 'animate-pulse' : ''}`} />
            </div>
          )}

          {/* Quick Role Switcher (for demo/tablet test) */}
          <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700 px-1.5 py-0.5 shadow-xs">
            <User className="w-3.5 h-3.5 text-slate-400 ml-1 mr-1" />
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as Role)}
              className="bg-transparent text-xs text-amber-400 font-bold focus:outline-hidden py-1 pr-1 cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-800 text-white font-semibold">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="btn-3d-slate flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition"
            title="สลับภาษา / Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="btn-3d-slate p-2 rounded-xl text-slate-700 dark:text-slate-200 transition"
            title="โหมดมืด/สว่าง (Dark/Light mode)"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Settings */}
          <button
            onClick={openSettings}
            className="btn-3d-slate p-2 rounded-xl text-slate-700 dark:text-slate-200 transition"
            title={t.settingsTitle}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Firestore Error Alert Banner */}
      {firestoreError && (
        <div className="bg-rose-900/90 text-white text-xs px-4 py-2 flex items-center justify-between border-t border-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
            <span>{firestoreError}</span>
          </div>
          <button
            onClick={clearFirestoreError}
            className="text-rose-200 hover:text-white underline text-[11px] font-bold"
          >
            ปิด
          </button>
        </div>
      )}
    </header>
  );
};
