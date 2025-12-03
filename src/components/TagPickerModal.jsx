import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function TagPickerModal({ allVisitTags, selectedTagIds, onClose, onChangeSelected }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const categoryLabels = {
    'all': '전체',
    'procedure': '시술',
    'design': '디자인',
    'care': '케어'
  };

  const filteredTags = allVisitTags.filter((tag) => {
    if (activeCategory !== 'all' && tag.category !== activeCategory) return false;
    if (!search) return true;
    return tag.label.toLowerCase().includes(search.toLowerCase());
  });

  const toggleTag = (tagId) => {
    onChangeSelected(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: '#232323' }}>태그 추가</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            style={{ color: '#232323' }}
          >
            <X size={20} />
          </button>
        </header>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 px-6 py-4 border-b border-gray-200 overflow-x-auto">
          {['all', 'procedure', 'design', 'care'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-[#C9A27A] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="태그 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A]"
            style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
          />
        </div>

        {/* 태그 리스트 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {filteredTags.length === 0 ? (
              <p className="text-sm w-full text-center" style={{ color: '#232323', opacity: 0.5 }}>
                해당 조건에 맞는 태그가 없어요.
              </p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#C9A27A] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: '#C9A27A' }}
          >
            완료
          </button>
        </footer>
      </div>
    </div>
  );
}





