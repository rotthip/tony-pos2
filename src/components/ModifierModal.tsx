import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { MenuItem, ModifierGroup, OrderItem } from '../types';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';

interface ModifierModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onConfirm: (payload: {
    itemId: string;
    nameTh: string;
    nameEn: string;
    price: number;
    qty: number;
    station: MenuItem['station'];
    selectedModifiers: OrderItem['selectedModifiers'];
    note?: string;
  }) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm,
}) => {
  const { menuConfig, language } = usePos();
  const t = translations[language];

  const [qty, setQty] = useState<number>(1);
  const [selectedMap, setSelectedMap] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get relevant modifier groups for this item
  const itemModifierGroups: ModifierGroup[] = item
    ? menuConfig.modifierGroups.filter((g) => item.modifierGroupIds.includes(g.id))
    : [];

  // Reset and pre-select defaults whenever item opens
  useEffect(() => {
    if (isOpen && item) {
      setQty(1);
      setNote('');
      setValidationError(null);

      const defaults: Record<string, string[]> = {};
      itemModifierGroups.forEach((group) => {
        // Pre-select first option for required single-choice groups (e.g. 100% sweetness)
        if (group.required && group.maxSelect === 1 && group.options.length > 0) {
          defaults[group.id] = [group.options[0].id];
        } else {
          defaults[group.id] = [];
        }
      });
      setSelectedMap(defaults);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    const current = selectedMap[group.id] || [];
    let updated: string[];

    if (group.maxSelect === 1) {
      // Radio single-choice
      updated = [optionId];
    } else {
      // Checkbox multi-choice
      if (current.includes(optionId)) {
        updated = current.filter((id) => id !== optionId);
      } else {
        if (current.length >= group.maxSelect) {
          return; // Max reached
        }
        updated = [...current, optionId];
      }
    }

    setSelectedMap((prev) => ({
      ...prev,
      [group.id]: updated,
    }));
    setValidationError(null);
  };

  // Calculate total price with selected modifiers
  const calculateUnitPrice = (): number => {
    let price = item.price;
    itemModifierGroups.forEach((group) => {
      const selectedIds = selectedMap[group.id] || [];
      group.options.forEach((opt) => {
        if (selectedIds.includes(opt.id)) {
          price += opt.priceDelta;
        }
      });
    });
    return price;
  };

  const handleAdd = () => {
    // Validate required groups
    for (const group of itemModifierGroups) {
      const selected = selectedMap[group.id] || [];
      if (group.required && selected.length < group.minSelect) {
        setValidationError(`กรุณาเลือก "${language === 'th' ? group.nameTh : group.nameEn}"`);
        return;
      }
    }

    // Build selectedModifiers list
    const selectedModifiers: OrderItem['selectedModifiers'] = [];
    itemModifierGroups.forEach((group) => {
      const selectedIds = selectedMap[group.id] || [];
      group.options.forEach((opt) => {
        if (selectedIds.includes(opt.id)) {
          selectedModifiers.push({
            groupId: group.id,
            groupName: language === 'th' ? group.nameTh : group.nameEn,
            optionId: opt.id,
            optionName: language === 'th' ? opt.nameTh : opt.nameEn,
            priceDelta: opt.priceDelta,
          });
        }
      });
    });

    onConfirm({
      itemId: item.id,
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      price: item.price,
      qty,
      station: item.station,
      selectedModifiers,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const unitPrice = calculateUnitPrice();
  const totalPrice = unitPrice * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="card-3d w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/40 shrink-0">
              {item.emoji || '🍽️'}
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {language === 'th' ? item.nameTh : item.nameEn}
              </h3>
              <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                ฿{item.price.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modifier Options */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {itemModifierGroups.map((group) => {
            const selected = selectedMap[group.id] || [];
            return (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {language === 'th' ? group.nameTh : group.nameEn}
                    </span>
                    {group.required ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                        {t.requiredSelect}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {t.optionalSelect}
                      </span>
                    )}
                  </div>
                  {group.maxSelect > 1 && (
                    <span className="text-xs text-slate-400">
                      (สูงสุด {group.maxSelect} อย่าง)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(group, option.id)}
                        className={`p-3 rounded-2xl border-2 text-left flex items-center justify-between transition active:scale-98 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-amber-500 text-white'
                                : 'border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold truncate">
                            {language === 'th' ? option.nameTh : option.nameEn}
                          </span>
                        </div>
                        {option.priceDelta > 0 && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-1">
                            +฿{option.priceDelta}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Kitchen / Bar Special Note */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.additionalNote}</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่หวาน, เผ็ดน้อย, ใส่ถุงแยกน้ำแข็ง..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {validationError && (
            <p className="text-xs font-bold text-rose-500 text-center animate-shake">
              {validationError}
            </p>
          )}
        </div>

        {/* Modal Footer: Quantity & Confirm */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setQty((prev) => Math.max(1, prev - 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-black text-slate-900 dark:text-white text-base">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((prev) => prev + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleAdd}
            className="btn-3d-amber flex-1 py-3 px-5 rounded-2xl text-white font-extrabold text-sm sm:text-base flex items-center justify-between transition"
          >
            <span>{t.addToCart}</span>
            <span className="font-black text-white">
              ฿{totalPrice.toLocaleString()}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
