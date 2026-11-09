import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ChefHat,
  Coffee,
  CheckCircle2,
  XCircle,
  X,
  Search,
  BookOpen,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { translations } from '../i18n/translations';
import { MenuItem, MenuCategory, Station } from '../types';

export const MenuManagement: React.FC = () => {
  const { menuConfig, updateMenuConfig, language } = usePos();
  const t = translations[language];

  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Item Modal state
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Item form fields
  const [nameTh, setNameTh] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [station, setStation] = useState<Station>('kitchen');
  const [emoji, setEmoji] = useState<string>('🍲');
  const [selectedModGroups, setSelectedModGroups] = useState<string[]>([]);

  // Category Modal state
  const [catModalOpen, setCatModalOpen] = useState<boolean>(false);
  const [catNameTh, setCatNameTh] = useState<string>('');
  const [catNameEn, setCatNameEn] = useState<string>('');
  const [catEmoji, setCatEmoji] = useState<string>('🍽️');

  const filteredItems = menuConfig.items.filter((item) => {
    const matchesCat = selectedCatId === 'all' || item.categoryId === selectedCatId;
    const q = searchQuery.toLowerCase().trim();
    const matchesQ =
      !q ||
      item.nameTh.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  // Toggle Sold Out (Available) in 1-tap
  const toggleItemAvailability = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = menuConfig.items.map((i) =>
      i.id === itemId ? { ...i, available: !i.available } : i
    );
    updateMenuConfig({ items: updated });
  };

  const handleOpenItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setNameTh(item.nameTh);
      setNameEn(item.nameEn);
      setPrice(item.price);
      setCategoryId(item.categoryId);
      setStation(item.station);
      setEmoji(item.emoji || '🍲');
      setSelectedModGroups(item.modifierGroupIds || []);
    } else {
      setEditingItem(null);
      setNameTh('');
      setNameEn('');
      setPrice(50);
      setCategoryId(menuConfig.categories[0]?.id || '');
      setStation('kitchen');
      setEmoji('🍲');
      setSelectedModGroups([]);
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!nameTh || price <= 0 || !categoryId) return;

    if (editingItem) {
      // Update
      const updated = menuConfig.items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              nameTh,
              nameEn: nameEn || nameTh,
              price,
              categoryId,
              station,
              emoji,
              modifierGroupIds: selectedModGroups,
            }
          : i
      );
      updateMenuConfig({ items: updated });
    } else {
      // Add new
      const newItem: MenuItem = {
        id: 'item_' + Date.now(),
        categoryId,
        nameTh,
        nameEn: nameEn || nameTh,
        price,
        emoji,
        available: true,
        station,
        modifierGroupIds: selectedModGroups,
        sortOrder: menuConfig.items.length + 1,
      };
      updateMenuConfig({ items: [...menuConfig.items, newItem] });
    }
    setItemModalOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('คุณต้องการลบเมนูนี้ใช่หรือไม่?')) {
      const updated = menuConfig.items.filter((i) => i.id !== itemId);
      updateMenuConfig({ items: updated });
      setItemModalOpen(false);
    }
  };

  const handleSaveCategory = () => {
    if (!catNameTh) return;
    const newCat: MenuCategory = {
      id: 'cat_' + Date.now(),
      nameTh: catNameTh,
      nameEn: catNameEn || catNameTh,
      emoji: catEmoji,
      sortOrder: menuConfig.categories.length + 1,
    };
    updateMenuConfig({ categories: [...menuConfig.categories, newCat] });
    setCatModalOpen(false);
    setCatNameTh('');
    setCatNameEn('');
  };

  const toggleModGroup = (groupId: string) => {
    setSelectedModGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <div className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
      {/* Top Header & Action Buttons */}
      <div className="card-3d p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-500 shadow-xs">
              <BookOpen className="w-6 h-6 text-amber-500" />
            </span>
            <span>{t.menuMgmtTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ปรับแต่งรายการอาหาร เพิ่มหมวดหมู่ หรือกดปิดสถานะ "สินค้าหมด" ได้ทันที
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCatModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl btn-3d-slate text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            {t.addNewCategory}
          </button>

          <button
            onClick={() => handleOpenItemModal()}
            className="px-4 py-2.5 rounded-xl btn-3d-amber text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{t.addNewItem}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Categories & Search */}
      <div className="card-3d p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCatId === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.allCategories} ({menuConfig.items.length})
          </button>
          {menuConfig.categories.map((cat) => {
            const count = menuConfig.items.filter((i) => i.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCatId === cat.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{cat.emoji}</span>{' '}
                <span>{language === 'th' ? cat.nameTh : cat.nameEn}</span> ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchMenu}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>
      </div>

      {/* Menu Item Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => {
          const cat = menuConfig.categories.find((c) => c.id === item.categoryId);
          return (
            <div
              key={item.id}
              onClick={() => handleOpenItemModal(item)}
              className={`p-4 rounded-3xl transition-all cursor-pointer flex flex-col justify-between card-3d surface-3d ${
                item.available ? 'hover:border-amber-400' : 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-3xl p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40">
                    {item.emoji || '🍽️'}
                  </span>

                  {/* 1-Tap Sold Out Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleItemAvailability(item.id, e)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 transition ${
                      item.available
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    }`}
                    title={t.toggleSoldOut}
                  >
                    {item.available ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ขายอยู่</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>หมด (Sold Out)</span>
                      </>
                    )}
                  </button>
                </div>

                <h4 className="mt-3 font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                  {language === 'th' ? item.nameTh : item.nameEn}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'th' ? cat?.nameTh : cat?.nameEn} •{' '}
                  {item.station === 'kitchen' ? '🍳 ครัว' : '☕ บาร์'}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  ฿{item.price.toLocaleString()}
                </span>

                <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600">
                  <Edit2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Modal (Create & Edit) */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl card-3d p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingItem ? t.editItem : t.addNewItem}
              </h3>
              <button onClick={() => setItemModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อเมนูภาษาไทย
                </label>
                <input
                  type="text"
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                  placeholder="เช่น ข้าวกะเพราเนื้อโคขุน"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อภาษาอังกฤษ (English Name)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Stir-Fried Beef Basil Rice"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="0"
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm font-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    อิโมจิ (Emoji)
                  </label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    หมวดหมู่
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {menuConfig.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.nameTh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    สเตชั่นจัดส่ง (KDS)
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value as Station)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="kitchen">🍳 ครัวอาหาร</option>
                    <option value="bar">☕ บาร์น้ำ/เครื่องดื่ม</option>
                  </select>
                </div>
              </div>

              {/* Modifier Groups checkbox */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  กลุ่มตัวเลือก / ท็อปปิ้ง ที่เชื่อมต่อ
                </label>
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border">
                  {menuConfig.modifierGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModGroups.includes(group.id)}
                        onChange={() => toggleModGroup(group.id)}
                        className="rounded-sm text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {group.nameTh}
                      </span>
                      <span className="text-slate-400">
                        ({group.options.length} ตัวเลือก)
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              {editingItem ? (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(editingItem.id)}
                  className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  ลบเมนูนี้
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl btn-3d-slate text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  className="px-5 py-2.5 rounded-xl btn-3d-amber text-white text-xs font-extrabold cursor-pointer"
                >
                  {t.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl card-3d p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t.addNewCategory}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อหมวดหมู่ภาษาไทย
                </label>
                <input
                  type="text"
                  value={catNameTh}
                  onChange={(e) => setCatNameTh(e.target.value)}
                  placeholder="เช่น กับข้าวโบราณ"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ชื่อภาษาอังกฤษ
                </label>
                <input
                  type="text"
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  placeholder="e.g. Traditional Dishes"
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  อิโมจิ
                </label>
                <input
                  type="text"
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-sm text-center"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl btn-3d-slate text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="flex-1 py-2.5 rounded-xl btn-3d-amber text-white text-xs font-extrabold cursor-pointer"
              >
                {t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
