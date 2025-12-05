import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { SCREENS } from '../constants/screens';

// 헬퍼 함수들
const normalize = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, '')      // 모든 공백 제거
    .replace(/[#\-,.]/g, '')  // #, -, , . 같은 기호 제거
    .trim();
};

const convertVisitTagsToArray = (tags) => {
  const result = [];
  Object.keys(tags).forEach(category => {
    tags[category].forEach((label, index) => {
      // 이미 객체인 경우와 문자열인 경우 모두 처리
      if (typeof label === 'object' && label.label) {
        result.push({
          id: label.id || `${category}-${index}`,
          label: label.label,
          category: category,
          keywords: label.keywords || []
        });
      } else {
        result.push({
          id: `${category}-${index}-${label}`,
          label: label,
          category: category,
          keywords: []
        });
      }
    });
  });
  return result;
};

const convertCustomerTagsToArray = (tags) => {
  const result = [];
  Object.keys(tags).forEach(category => {
    tags[category].forEach((label, index) => {
      if (typeof label === 'object' && label.label) {
        result.push({
          id: label.id || `${category}-${index}`,
          label: label.label,
          category: category,
          keywords: label.keywords || []
        });
      } else {
        result.push({
          id: `${category}-${index}-${label}`,
          label: label,
          category: category,
          keywords: []
        });
      }
    });
  });
  return result;
};

function TagSettingsScreen({
  currentScreen,
  setCurrentScreen,
  visitTags,
  setVisitTags,
  customerTags,
  setCustomerTags,
  tagSettingsMainTab,
  setTagSettingsMainTab,
  tagSettingsSubTab,
  setTagSettingsSubTab,
  newManagedTag,
  setNewManagedTag,
  isTagEditing,
  setIsTagEditing
}) {
  // 대분류 탭 정보
  const mainTabs = {
    visit: { label: '🧴 시술 태그 관리', icon: '🧴' },
    customer: { label: '👤 고객 특징 관리', icon: '👤' }
  };

  // 소분류 탭 정보
  const visitSubTabs = {
    procedure: { label: '시술', placeholder: '시술 태그 입력…' },
    design: { label: '디자인', placeholder: '디자인 태그 입력…' },
    care: { label: '케어', placeholder: '케어 태그 입력…' },
    payment: { label: '결제·예약', placeholder: '결제·예약 태그 입력…' }
  };

  const customerSubTabs = {
    trait: { label: '성향', placeholder: '성향 태그 입력…' },
    pattern: { label: '방문패턴', placeholder: '방문패턴 태그 입력…' },
    caution: { label: '⚠️주의', placeholder: '주의 태그 입력…' }
  };

  // 현재 선택된 대분류에 따른 소분류 탭
  const currentSubTabs = tagSettingsMainTab === 'visit' ? visitSubTabs : customerSubTabs;
  
  // 현재 선택된 카테고리의 태그 목록 (문자열과 객체 모두 처리)
  const currentTags = tagSettingsMainTab === 'visit' 
    ? (visitTags[tagSettingsSubTab] || [])
    : (customerTags[tagSettingsSubTab] || []);
  
  const currentSubTab = currentSubTabs[tagSettingsSubTab];
  const isCautionTab = tagSettingsSubTab === 'caution';

  // 대분류 탭 변경 시 소분류 탭 초기화
  const handleMainTabChange = (newMainTab) => {
    setTagSettingsMainTab(newMainTab);
    // 대분류 변경 시 첫 번째 소분류로 초기화
    if (newMainTab === 'visit') {
      setTagSettingsSubTab('procedure');
    } else {
      setTagSettingsSubTab('trait');
    }
  };

  // 태그 추가 함수
  const handleAddTag = () => {
    if (newManagedTag.trim()) {
      const trimmedLabel = newManagedTag.trim().replace(/^#/, '');
      
      // 현재 카테고리의 태그 개수 확인
      const currentCategoryTags = tagSettingsMainTab === 'visit' 
        ? (visitTags[tagSettingsSubTab] || [])
        : (customerTags[tagSettingsSubTab] || []);
        
      // 최대 50개 제한 확인
      if (currentCategoryTags.length >= 50) {
        alert(`각 카테고리마다 최대 50개까지 추가할 수 있습니다.\n현재 ${currentCategoryTags.length}개의 태그가 등록되어 있습니다.`);
        return;
      }
      
      // 모든 태그를 배열로 변환하여 중복 체크
      const allTags = tagSettingsMainTab === 'visit' 
        ? convertVisitTagsToArray(visitTags)
        : convertCustomerTagsToArray(customerTags);
      
      // normalize를 사용한 중복 체크
      const normalizedNew = normalize(trimmedLabel);
      const existing = allTags.find((tag) => {
        const keys = [tag.label, ...(tag.keywords || [])];
        return keys.some((k) => normalize(k) === normalizedNew);
      });
      
      if (existing) {
        // 이미 비슷한 태그가 있는 경우
        alert(`"${trimmedLabel}"와 비슷한 태그 "${existing.label}"가 이미 등록되어 있습니다.`);
        return;
      }
      
      // 같은 카테고리 내에서 정확히 같은 label이 있는지 확인
      const hasExactMatch = currentCategoryTags.some(tag => {
        if (typeof tag === 'string') {
          return tag === trimmedLabel;
        } else if (typeof tag === 'object' && tag.label) {
          return tag.label === trimmedLabel;
        }
        return false;
      });
      
      if (hasExactMatch) {
        alert(`"${trimmedLabel}" 태그는 이미 등록되어 있습니다.`);
        return;
      }
      
      // 새 태그 객체 생성
      const newTag = {
        id: `${tagSettingsSubTab}-${Date.now()}`,
        label: trimmedLabel,
        keywords: [] // 키워드 기능 제거
      };
      
      if (tagSettingsMainTab === 'visit') {
        setVisitTags(prev => {
          const updated = {
            ...prev,
            [tagSettingsSubTab]: [...(prev[tagSettingsSubTab] || []), newTag]
          };
          console.log('[태그 추가] visitTags 업데이트:', updated);
          return updated;
        });
      } else {
        setCustomerTags(prev => {
          const updated = {
            ...prev,
            [tagSettingsSubTab]: [...(prev[tagSettingsSubTab] || []), newTag]
          };
          console.log('[태그 추가] customerTags 업데이트:', updated);
          return updated;
        });
      }
      
      setNewManagedTag('');
      console.log('[태그 추가] 태그 추가 완료:', trimmedLabel, '카테고리:', tagSettingsSubTab);
    }
  };

  // 태그 삭제 함수
  const handleDeleteTag = (tagIndex) => {
    if (tagSettingsMainTab === 'visit') {
      setVisitTags(prev => ({
        ...prev,
        [tagSettingsSubTab]: prev[tagSettingsSubTab].filter((_, i) => i !== tagIndex)
      }));
    } else {
      setCustomerTags(prev => ({
        ...prev,
        [tagSettingsSubTab]: prev[tagSettingsSubTab].filter((_, i) => i !== tagIndex)
      }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F0E6]">
      {/* 헤더 */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <span className="text-[24px]">&#x2039;</span>
        </button>
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>시술 태그 관리</h2>
        <button
          onClick={() => setIsTagEditing(!isTagEditing)}
          className="px-4 h-8 rounded-lg font-semibold text-white text-xs transition-all hover:opacity-90"
          style={{ backgroundColor: '#C9A27A' }}
        >
          {isTagEditing ? '완료' : '편집'}
        </button>
      </header>

      {/* 내용 영역 */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
        {/* 설명 텍스트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-light leading-relaxed" style={{ color: '#232323', opacity: 0.7 }}>
            {tagSettingsMainTab === 'visit' ? (
              <>
                자주 쓰는 시술 용어를 등록해두세요.<br/>
                AI가 녹음 내용을 분석할 때, 원장님만의 태그를 쏙쏙 뽑아줍니다.
              </>
            ) : (
              <>
                고객 특징 키워드를 등록해두면,<br/>
                AI가 대화 속에서 정보를 캐치하여 프로필에 자동으로 정리해줍니다.
              </>
            )}
          </p>
        </div>

        {/* Level 1 탭 (대분류) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {Object.keys(mainTabs).map((mainTabKey) => {
              const isActive = tagSettingsMainTab === mainTabKey;
              return (
                <button
                  key={mainTabKey}
                  onClick={() => handleMainTabChange(mainTabKey)}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    isActive ? '' : 'hover:bg-gray-50'
                  }`}
                  style={{ 
                    color: isActive ? '#8C6D46' : 'rgba(35, 35, 35, 0.4)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    backgroundColor: isActive ? 'rgba(201, 162, 122, 0.08)' : 'transparent'
                  }}
                >
                  {mainTabs[mainTabKey].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2 탭 (소분류) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {Object.keys(currentSubTabs).map((subTabKey) => {
              const isActive = tagSettingsSubTab === subTabKey;
              const isCaution = subTabKey === 'caution';
              return (
                <button
                  key={subTabKey}
                  onClick={() => setTagSettingsSubTab(subTabKey)}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                    isActive ? '' : 'hover:bg-gray-50'
                  }`}
                  style={{ 
                    color: isActive 
                      ? (isCaution ? '#DC2626' : '#8C6D46')
                      : 'rgba(35, 35, 35, 0.4)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    backgroundColor: isActive 
                      ? (isCaution ? 'rgba(220, 38, 38, 0.08)' : 'rgba(201, 162, 122, 0.08)')
                      : 'transparent'
                  }}
                >
                  {currentSubTabs[subTabKey].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 태그 입력 영역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newManagedTag}
              onChange={(e) => setNewManagedTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
              placeholder={currentSubTab.placeholder}
              className="flex-1 min-w-0 px-4 py-1.5 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] transition-all text-sm"
              style={{ color: '#232323', backgroundColor: '#FFFFFF' }}
            />
            <button
              onClick={handleAddTag}
              className="px-4 h-8 rounded-lg text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: '#C9A27A' }}
            >
              추가
            </button>
          </div>
        </div>

        {/* 태그 클라우드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
            {currentSubTab.label} 태그 ({currentTags.length}개)
          </h3>
          {currentTags.length === 0 ? (
            <p className="text-sm font-light text-center py-8" style={{ color: '#232323', opacity: 0.5 }}>
              등록된 태그가 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentTags.map((tag, idx) => {
                // 문자열인 경우와 객체인 경우 모두 처리
                const tagLabel = typeof tag === 'string' ? tag : (tag.label || tag);
                const tagKeywords = typeof tag === 'object' && tag.keywords ? tag.keywords : [];
                const displayLabel = tagLabel.replace(/^#/, '');
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: isCautionTab ? '#FEF2F2' : '#F7F5F0',
                      color: isCautionTab ? '#DC2626' : '#4A4A4A',
                      border: isCautionTab ? '1px solid #FECACA' : 'none'
                    }}
                  >
                    {displayLabel}
                    {isTagEditing && (
                      <button
                        onClick={() => handleDeleteTag(idx)}
                        className="ml-1 hover:opacity-70 transition-opacity"
                        style={{ color: isCautionTab ? '#DC2626' : '#B8A08A' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TagSettingsScreen;


