import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Category } from '../../types/database';
import { Search, Plus, Check, ChevronDown, Loader2, Sparkles, Folder } from 'lucide-react';

interface CategorySelectProps {
  value?: number | null;
  onChange: (categoryId: number | null) => void;
  required?: boolean;
}

export default function CategorySelect({ value, onChange, required = false }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load categories
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedCategory = categories.find((c) => c.id === value);

  // Filter categories by search query
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const exactMatch = categories.some(
    (c) => c.name.toLowerCase().trim() === search.toLowerCase().trim()
  );

  const handleCreateNew = async () => {
    const trimmed = search.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      const newCat = await api.createCategory({
        name: trimmed,
        icon: '📚',
        description: null,
      });

      // Update state and select the new category
      setCategories((prev) => [...prev, newCat]);
      onChange(newCat.id);
      setSearch('');
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create category.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer bg-white text-left shadow-2xs ${
          isOpen
            ? 'border-brand-600 ring-2 ring-brand-500/10'
            : selectedCategory
            ? 'border-slate-300 text-slate-900 hover:border-slate-400'
            : 'border-slate-300 text-slate-400 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedCategory ? (
            <>
              <span className="text-base select-none leading-none">{selectedCategory.icon}</span>
              <span className="truncate text-slate-900 font-bold">{selectedCategory.name}</span>
            </>
          ) : (
            <>
              <Folder className="w-4 h-4 text-slate-400" />
              <span>Select or create category...</span>
            </>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-brand-600' : ''
          }`}
        />
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length === 1) {
                    onChange(filtered[0].id);
                    setIsOpen(false);
                    setSearch('');
                  } else if (!exactMatch && search.trim()) {
                    handleCreateNew();
                  }
                }
              }}
              placeholder="Search or type to create new..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none py-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                <span>Loading categories...</span>
              </div>
            ) : filtered.length === 0 && !search.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No categories available yet. Type above to create one.
              </div>
            ) : (
              filtered.map((cat) => {
                const isSelected = cat.id === value;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200/60'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base select-none leading-none">{cat.icon}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cat.lessons_count !== undefined && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                          {cat.lessons_count}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                    </div>
                  </button>
                );
              })
            )}

            {/* Create on the Fly Action Button */}
            {!exactMatch && search.trim() && (
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateNew}
                className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-brand-700 bg-brand-50/80 hover:bg-brand-100/80 border border-dashed border-brand-300 transition cursor-pointer"
              >
                {isCreating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                )}
                <span>Create &ldquo;{search.trim()}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
