import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  CreditCard,
  Ban,
  Calendar,
  Sparkles,
  Award,
  Layers,
  Banknote,
  QrCode,
  Wallet,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { DailySummary } from '../types';

type DateFilter = 'today' | 'week' | 'month';

export const ReportsScreen: React.FC = () => {
  const { dailySummaries, getDailySummary, language } = usePos();
  const t = translations[language];

  const [filter, setFilter] = useState<DateFilter>('today');

  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  // Aggregate stats based on filter
  const calculateAggregatedStats = () => {
    let salesTotal = 0;
    let billCount = 0;
    let voidCount = 0;
    let voidAmount = 0;
    let discountTotal = 0;
    let serviceChargeTotal = 0;
    let vatTotal = 0;
    const paymentTotals = { cash: 0, promptpay: 0, card: 0, other: 0 };
    const topItemsMap: Record<string, { nameTh: string; nameEn: string; qty: number; total: number }> = {};

    const datesToInclude: string[] = [];

    if (filter === 'today') {
      datesToInclude.push(todayStr);
    } else if (filter === 'week') {
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datesToInclude.push(`${y}-${m}-${day}`);
      }
    } else {
      // Month
      const currentMonthPrefix = todayStr.substring(0, 7); // yyyy-MM
      Object.keys(dailySummaries).forEach((d) => {
        if (d.startsWith(currentMonthPrefix)) {
          datesToInclude.push(d);
        }
      });
      if (!datesToInclude.includes(todayStr)) {
        datesToInclude.push(todayStr);
      }
    }

    datesToInclude.forEach((dateStr) => {
      const summary = getDailySummary(dateStr);
      salesTotal += summary.salesTotal;
      billCount += summary.billCount;
      voidCount += summary.voidCount;
      voidAmount += summary.voidAmount;
      discountTotal += summary.discountTotal;
      serviceChargeTotal += summary.serviceChargeTotal;
      vatTotal += summary.vatTotal;

      paymentTotals.cash += summary.paymentTotals.cash;
      paymentTotals.promptpay += summary.paymentTotals.promptpay;
      paymentTotals.card += summary.paymentTotals.card;
      paymentTotals.other += summary.paymentTotals.other;

      Object.entries(summary.topItems).forEach(([itemId, data]) => {
        if (!topItemsMap[itemId]) {
          topItemsMap[itemId] = { ...data };
        } else {
          topItemsMap[itemId].qty += data.qty;
          topItemsMap[itemId].total += data.total;
        }
      });
    });

    const topItemsList = Object.values(topItemsMap).sort((a, b) => b.qty - a.qty);
    const avgPerBill = billCount > 0 ? Math.round(salesTotal / billCount) : 0;

    return {
      salesTotal,
      billCount,
      voidCount,
      voidAmount,
      discountTotal,
      serviceChargeTotal,
      vatTotal,
      paymentTotals,
      topItemsList,
      avgPerBill,
    };
  };

  const stats = calculateAggregatedStats();

  const totalPayments =
    stats.paymentTotals.cash +
    stats.paymentTotals.promptpay +
    stats.paymentTotals.card +
    stats.paymentTotals.other;

  const cashPct = totalPayments > 0 ? Math.round((stats.paymentTotals.cash / totalPayments) * 100) : 0;
  const ppPct = totalPayments > 0 ? Math.round((stats.paymentTotals.promptpay / totalPayments) * 100) : 0;
  const cardPct = totalPayments > 0 ? Math.round((stats.paymentTotals.card / totalPayments) * 100) : 0;
  const otherPct = totalPayments > 0 ? Math.round((stats.paymentTotals.other / totalPayments) * 100) : 0;

  return (
    <div className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4 sm:space-y-5 overflow-y-auto">
      {/* Header & Date Range Filter */}
      <div className="card-3d p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>{t.reportsTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t.dailyDocNotice}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-slate-950/20 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner">
          <button
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'today'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterToday}
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'week'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterWeek}
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'month'
                ? 'btn-3d-amber text-white'
                : 'btn-3d-slate text-slate-700 dark:text-slate-300'
            }`}
          >
            {t.filterMonth}
          </button>
        </div>
      </div>

      {/* 4 Main Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        {/* Total Revenue */}
        <div className="card-3d surface-3d p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-xs font-black uppercase tracking-wider">{t.totalRevenue}</span>
            <TrendingUp className="w-5 h-5 drop-shadow-xs" />
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2 drop-shadow-xs">
            ฿{stats.salesTotal.toLocaleString()}
          </p>
          <span className="text-[11px] opacity-80 mt-1 block font-semibold">
            รวมส่วนลด ฿{stats.discountTotal.toLocaleString()}
          </span>
        </div>

        {/* Bill Count */}
        <div className="card-3d surface-3d p-5 rounded-3xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">{t.totalBills}</span>
            <Receipt className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 drop-shadow-xs">
            {stats.billCount} <span className="text-sm font-bold text-slate-400">บิล</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-semibold">
            บิลชำระเงินเรียบร้อย
          </span>
        </div>

        {/* Average per Bill */}
        <div className="card-3d surface-3d p-5 rounded-3xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">{t.avgPerBill}</span>
            <CreditCard className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 drop-shadow-xs">
            ฿{stats.avgPerBill.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-semibold">
            ยอดใช้จ่ายเฉลี่ยต่อบิล
          </span>
        </div>

        {/* Voids */}
        <div className="card-3d surface-3d p-5 rounded-3xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-black uppercase tracking-wider">{t.voidsTotal}</span>
            <Ban className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 drop-shadow-xs">
            {stats.voidCount} <span className="text-sm font-bold text-slate-400">รายการ</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-semibold">
            มูลค่าที่ยกเลิก ฿{stats.voidAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Middle Row: Payment Methods & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Payment Methods Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span>{t.paymentBreakdown}</span>
          </h3>

          {/* Visual Percentage Bar */}
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {cashPct > 0 && <div style={{ width: `${cashPct}%` }} className="bg-emerald-500" />}
            {ppPct > 0 && <div style={{ width: `${ppPct}%` }} className="bg-blue-500" />}
            {cardPct > 0 && <div style={{ width: `${cardPct}%` }} className="bg-purple-500" />}
            {otherPct > 0 && <div style={{ width: `${otherPct}%` }} className="bg-slate-500" />}
          </div>

          <div className="space-y-3 pt-2">
            {/* Cash */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <Banknote className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.cash} ({cashPct}%)
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                ฿{stats.paymentTotals.cash.toLocaleString()}
              </span>
            </div>

            {/* PromptPay */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-500" />
                <QrCode className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.promptpay} ({ppPct}%)
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                ฿{stats.paymentTotals.promptpay.toLocaleString()}
              </span>
            </div>

            {/* Card */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-purple-500" />
                <CreditCard className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.card} ({cardPct}%)
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                ฿{stats.paymentTotals.card.toLocaleString()}
              </span>
            </div>

            {/* Other */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-500" />
                <Wallet className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t.otherPayment} ({otherPct}%)
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                ฿{stats.paymentTotals.other.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Top Selling Items (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t.topSellingItems}</span>
          </h3>

          {stats.topItemsList.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              ยังไม่มีข้อมูลการขายในรอบเวลานี้
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.topItemsList.slice(0, 7).map((item, index) => (
                <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : index === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                        : 'text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {language === 'th' ? item.nameTh : item.nameEn}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        ขายได้ {item.qty} ที่
                      </p>
                    </div>
                  </div>

                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    ฿{item.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
