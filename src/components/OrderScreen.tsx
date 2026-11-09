import React, { useState } from 'react';
import {
  Search,
  Send,
  CreditCard,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { MenuItem, OrderItem } from '../types';
import { ModifierModal } from './ModifierModal';

interface OrderScreenProps {
  onBackToFloorPlan: () => void;
  onOpenPayment: () => void;
  onOpenOrderActions: () => void;
}

export const OrderScreen: React.FC<OrderScreenProps> = ({
  onBackToFloorPlan,
  onOpenPayment,
  onOpenOrderActions,
}) => {
  const {
    menuConfig,
    activeOrder,
    addItemToOrder,
    updateOrderItemQty,
    sendOrderToKitchen,
    shopConfig,
    language,
    createTakeawayOrder,
  } = usePos();

  const t = translations[language];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  // If there's no active order, show a prompt or create quick takeaway
  if (!activeOrder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          ยังไม่ได้เลือกโต๊ะหรือออเดอร์
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          กรุณาเลือกโต๊ะจากผังร้าน หรือกดสร้างออเดอร์กลับบ้านทันที
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full">
          <button
            onClick={onBackToFloorPlan}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t.navTables}
          </button>
          <button
            onClick={() => createTakeawayOrder()}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20"
          >
            {t.quickTakeaway}
          </button>
        </div>
      </div>
    );
  }

  // Filter items by category & search
  const filteredItems = menuConfig.items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.nameTh.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleItemClick = (item: MenuItem) => {
    if (!item.available) return;

    // If item has modifiers, open modal; otherwise add directly with 1 qty
    if (item.modifierGroupIds.length > 0) {
      setModalItem(item);
    } else {
      addItemToOrder(activeOrder.id, {
        itemId: item.id,
        nameTh: item.nameTh,
        nameEn: item.nameEn,
        price: item.price,
        qty: 1,
        station: item.station,
        selectedModifiers: [],
      });
    }
  };

  const handleModifierConfirm = (payload: {
    itemId: string;
    nameTh: string;
    nameEn: string;
    price: number;
    qty: number;
    station: MenuItem['station'];
    selectedModifiers: OrderItem['selectedModifiers'];
    note?: string;
  }) => {
    addItemToOrder(activeOrder.id, payload);
  };

  const newItemsCount = activeOrder.items.filter((i) => i.status === 'new').length;
  const nonVoidItems = activeOrder.items.filter((i) => i.status !== 'voided');

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* LEFT: Menu Selection Area (Category Tabs + Touch Grid) */}
      <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 overflow-y-auto">
        {/* Top bar: Back to floor plan, search, category pills */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToFloorPlan}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
              title="กลับไปผังโต๊ะ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Search Box */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchMenu}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'btn-3d-amber text-white'
                  : 'btn-3d-slate text-slate-700 dark:text-slate-300'
              }`}
            >
              🍽️ {t.allCategories}
            </button>
            {menuConfig.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'btn-3d-amber text-white'
                    : 'btn-3d-slate text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{cat.emoji}</span>{' '}
                <span>{language === 'th' ? cat.nameTh : cat.nameEn}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid (Tablet-first 3D tactile cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredItems.map((item) => {
            const hasModifiers = item.modifierGroupIds.length > 0;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.available}
                onClick={() => handleItemClick(item)}
                className={`p-4 rounded-3xl text-left flex flex-col justify-between transition-all min-h-[135px] relative ${
                  item.available
                    ? 'card-3d surface-3d hover:border-amber-400'
                    : 'card-3d opacity-60 cursor-not-allowed bg-slate-100/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-slate-900 shadow-inner border border-amber-200/50 dark:border-amber-900/40">
                      {item.emoji || '🍽️'}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs ${
                        item.station === 'kitchen'
                          ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900'
                          : 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900'
                      }`}>
                        {item.station === 'kitchen' ? '🍳 ครัว' : '☕ บาร์'}
                      </span>
                      {hasModifiers && (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          ตัวเลือก
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="mt-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                    {language === 'th' ? item.nameTh : item.nameEn}
                  </h4>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400">
                    ฿{item.price.toLocaleString()}
                  </span>
                  {!item.available && (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-md">
                      {t.soldOut}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Running Cart Sidebar (Landscape tablet optimized) */}
      <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-lg">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {activeOrder.tableName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {activeOrder.queueNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeOrder.type === 'dine-in' ? t.orderTypeDineIn : t.orderTypeTakeaway}
              {activeOrder.guestCount ? ` • ${activeOrder.guestCount} ท่าน` : ''}
            </p>
          </div>

          <button
            onClick={onOpenOrderActions}
            className="btn-3d-slate flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.editOrder}</span>
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {nonVoidItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-medium">{t.noItemsInCart}</p>
            </div>
          ) : (
            nonVoidItems.map((item) => {
              const modifierSum = item.selectedModifiers.reduce(
                (sum, m) => sum + m.priceDelta,
                0
              );
              const itemTotal = (item.price + modifierSum) * item.qty;

              return (
                <div
                  key={item.orderItemId}
                  className={`p-3 rounded-2xl border transition ${
                    item.status === 'new'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {language === 'th' ? item.nameTh : item.nameEn}
                        </span>

                        {/* Status Tag */}
                        {item.status === 'new' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white">
                            ใหม่ (ยังไม่ส่ง)
                          </span>
                        )}
                        {item.status === 'sent' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> ส่งแล้ว
                          </span>
                        )}
                        {item.status === 'cooking' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                            กำลังทำ
                          </span>
                        )}
                        {item.status === 'ready' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                            เสร็จแล้ว
                          </span>
                        )}
                      </div>

                      {/* Modifiers List */}
                      {item.selectedModifiers.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.selectedModifiers.map((mod, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md"
                            >
                              +{mod.optionName} {mod.priceDelta > 0 ? `(+฿${mod.priceDelta})` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Note */}
                      {item.note && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 italic">
                          โน้ต: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        ฿{itemTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Quantity and Actions (Can only decrement/remove directly if status is 'new') */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">
                      ฿{item.price + modifierSum} / ชิ้น
                    </span>

                    {item.status === 'new' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateOrderItemQty(activeOrder.id, item.orderItemId, item.qty - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90"
                        >
                          {item.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="font-bold text-xs text-slate-900 dark:text-white w-4 text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateOrderItemQty(activeOrder.id, item.orderItemId, item.qty + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        x{item.qty}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Summary & Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5 shrink-0">
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>{t.subtotal}</span>
              <span>฿{activeOrder.subtotal.toLocaleString()}</span>
            </div>

            {activeOrder.discount.amount > 0 && (
              <div className="flex justify-between text-rose-500 font-medium">
                <span>{t.discount}</span>
                <span>-฿{activeOrder.discount.amount.toLocaleString()}</span>
              </div>
            )}

            {activeOrder.serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>{t.serviceCharge} ({shopConfig.serviceChargeRate}%)</span>
                <span>฿{activeOrder.serviceCharge.toLocaleString()}</span>
              </div>
            )}

            {shopConfig.vatMode !== 'none' && (
              <div className="flex justify-between">
                <span>
                  {t.vat} {shopConfig.vatMode === 'included' ? t.vatIncludedNote : ''}
                </span>
                <span>฿{activeOrder.vat.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-black text-slate-900 dark:text-white">
              <span>{t.total}</span>
              <span className="text-amber-600 dark:text-amber-400">
                ฿{activeOrder.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Send to Kitchen/Bar button (only enabled if new items exist) */}
            <button
              onClick={() => sendOrderToKitchen(activeOrder.id)}
              disabled={newItemsCount === 0}
              className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
                newItemsCount > 0
                  ? 'btn-3d-blue text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{t.sendToKitchen} {newItemsCount > 0 ? `(${newItemsCount})` : ''}</span>
            </button>

            {/* Checkout / Pay button */}
            <button
              onClick={onOpenPayment}
              disabled={nonVoidItems.length === 0}
              className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
                nonVoidItems.length > 0
                  ? 'btn-3d-emerald text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.payBill}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modifier Dialog */}
      <ModifierModal
        isOpen={!!modalItem}
        item={modalItem}
        onClose={() => setModalItem(null)}
        onConfirm={handleModifierConfirm}
      />
    </div>
  );
};
