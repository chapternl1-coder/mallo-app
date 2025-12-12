import React, { useState } from 'react';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  user,
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
  // 삭제를 위해 선택된 태그 인덱스 추적 (두 번 클릭 삭제용)
  const [selectedTagIndex, setSelectedTagIndex] = useState(null);
  const [deleteTimer, setDeleteTimer] = useState(null);
  
  // 대분류 탭 정보
  const mainTabs = {
    visit: { label: '🧴 시술 태그 관리', icon: '🧴' },
    customer: { label: '👤 고객 태그 관리', icon: '👤' }
  };

  // 소분류 탭 정보
  const visitSubTabs = {
    procedure: { label: '시술', placeholder: '시술 태그 입력…' },
    design: { label: '디자인', placeholder: '디자인 태그 입력…' },
    care: { label: '케어', placeholder: '케어 태그 입력…' },
    payment: { label: '결제·예약', placeholder: '결제·예약 태그 입력…' }
  };

  const customerSubTabs = {
    feature: { label: '특징', placeholder: '특징 태그 입력…' },
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
      setTagSettingsSubTab('feature');
    }
    // 탭 변경 시 선택 상태 초기화
    setSelectedTagIndex(null);
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      setDeleteTimer(null);
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

  // 태그 클릭 핸들러 (두 번 클릭으로 삭제)
  const handleTagClick = (tagIndex) => {
    console.log('[태그 클릭]', { tagIndex, selectedTagIndex, isTagEditing });
    
    // 순서변경 모드에서는 삭제 불가
    if (isTagEditing) {
      console.log('[태그 클릭] 순서변경 모드에서는 삭제 불가');
      return;
    }
    
    // 이미 선택된 태그를 다시 클릭하면 삭제
    if (selectedTagIndex === tagIndex) {
      console.log('[태그 삭제] 인덱스:', tagIndex);
      
      // 타이머 제거
      if (deleteTimer) {
        clearTimeout(deleteTimer);
        setDeleteTimer(null);
      }
      
      // 실제 삭제
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
      
      setSelectedTagIndex(null);
    } else {
      // 다른 태그 클릭 시 선택 상태 변경
      console.log('[태그 선택] 인덱스:', tagIndex);
      
      if (deleteTimer) {
        clearTimeout(deleteTimer);
      }
      
      setSelectedTagIndex(tagIndex);
      
      // 3초 후 자동으로 선택 해제
      const timer = setTimeout(() => {
        console.log('[자동 선택 해제]');
        setSelectedTagIndex(null);
        setDeleteTimer(null);
      }, 3000);
      
      setDeleteTimer(timer);
    }
  };

  // 태그 순서 변경 함수
  const handleReorderTags = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const newTags = [...currentTags];
    const [movedTag] = newTags.splice(fromIndex, 1);
    newTags.splice(toIndex, 0, movedTag);

    if (tagSettingsMainTab === 'visit') {
      setVisitTags(prev => ({
        ...prev,
        [tagSettingsSubTab]: newTags
      }));
    } else {
      setCustomerTags(prev => ({
        ...prev,
        [tagSettingsSubTab]: newTags
      }));
    }
    
    // 순서 변경 시 선택 상태 초기화 (인덱스가 바뀌므로)
    setSelectedTagIndex(null);
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      setDeleteTimer(null);
    }
  };

  // 화살표 버튼으로 순서 변경
  const handleMoveLeft = (index) => {
    if (index > 0) {
      handleReorderTags(index, index - 1);
    }
  };

  const handleMoveRight = (index) => {
    if (index < currentTags.length - 1) {
      handleReorderTags(index, index + 1);
    }
  };

  // 로그인하지 않은 경우 태그 설정 사용 불가
  if (!user) {
    return (
      <div className="flex flex-col h-full bg-[#F2F0E6]">
        {/* 헤더 */}
        <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen(SCREENS.PROFILE)}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
            style={{ color: '#232323' }}
          >
            <span className="text-[32px]">&#x2039;</span>
          </button>
          <h2 className="font-bold text-base" style={{ color: '#232323' }}>태그 관리</h2>
          <div className="w-8"></div> {/* Spacer for centering */}
        </header>

        {/* 로그인 필요 메시지 */}
        <main className="flex-1 flex items-center justify-center px-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#232323' }}>
              로그인이 필요합니다
            </h3>
            <p className="text-sm font-light leading-relaxed mb-6" style={{ color: '#232323', opacity: 0.7 }}>
              태그 관리를 사용하려면<br/>
              로그인을 먼저 해주세요.
            </p>
            <button
              onClick={() => setCurrentScreen(SCREENS.LOGIN)}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#C9A27A' }}
            >
              로그인하기
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F0E6]">
      {/* 헤더 */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
        <button 
          onClick={() => setCurrentScreen(SCREENS.PROFILE)} 
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>태그 관리</h2>
        <button
          onClick={() => {
            setIsTagEditing(!isTagEditing);
            // 편집 모드 종료 시 선택 상태 초기화
            if (isTagEditing) {
              setSelectedTagIndex(null);
              if (deleteTimer) {
                clearTimeout(deleteTimer);
                setDeleteTimer(null);
              }
            }
          }}
          className="px-3 h-8 rounded-lg font-semibold text-white text-xs transition-all hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: '#C9A27A' }}
        >
          {isTagEditing ? '완료' : '순서변경'}
        </button>
      </header>

      {/* 내용 영역 */}
      <main className="flex-1 overflow-y-auto px-5 pt-5 space-y-5 pb-40">
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
                  onClick={() => {
                    setTagSettingsSubTab(subTabKey);
                    // 소분류 탭 변경 시 선택 상태 초기화
                    setSelectedTagIndex(null);
                    if (deleteTimer) {
                      clearTimeout(deleteTimer);
                      setDeleteTimer(null);
                    }
                  }}
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
            <span className="text-xs font-normal ml-2" style={{ color: '#232323', opacity: 0.6 }}>
              {isTagEditing ? '(화살표로 순서변경)' : '(태그 두 번 클릭: 삭제)'}
            </span>
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
                const displayLabel = tagLabel.replace(/^#/, '');
                const isFirst = idx === 0;
                const isLast = idx === currentTags.length - 1;
                
                // 카테고리별 색상 정의 (말로 테마)
                const getChipColors = () => {
                  if (isCautionTab) {
                    return {
                      bg: 'rgba(220, 38, 38, 0.08)',
                      border: '#FCA5A5',
                      text: '#DC2626',
                      hoverBg: 'rgba(220, 38, 38, 0.15)'
                    };
                  }
                  
                  switch(tagSettingsSubTab) {
                    case 'feature':
                      return {
                        bg: 'rgba(59, 130, 246, 0.1)',
                        border: '#93C5FD',
                        text: '#1E40AF',
                        hoverBg: 'rgba(59, 130, 246, 0.18)'
                      };
                    case 'design':
                      return {
                        bg: 'rgba(140, 109, 70, 0.08)',
                        border: '#D4C5B0',
                        text: '#6B5437',
                        hoverBg: 'rgba(140, 109, 70, 0.15)'
                      };
                    case 'care':
                      return {
                        bg: 'rgba(168, 162, 158, 0.1)',
                        border: '#D6D3D1',
                        text: '#57534E',
                        hoverBg: 'rgba(168, 162, 158, 0.18)'
                      };
                    case 'trait':
                      return {
                        bg: 'rgba(184, 160, 138, 0.1)',
                        border: '#E0D4C8',
                        text: '#78614A',
                        hoverBg: 'rgba(184, 160, 138, 0.18)'
                      };
                    case 'pattern':
                      return {
                        bg: 'rgba(161, 143, 122, 0.1)',
                        border: '#D9CFC3',
                        text: '#6D5F4D',
                        hoverBg: 'rgba(161, 143, 122, 0.18)'
                      };
                    default:
                      return {
                        bg: 'rgba(201, 162, 122, 0.1)',
                        border: '#E6D5C3',
                        text: '#8C6D46',
                        hoverBg: 'rgba(201, 162, 122, 0.18)'
                      };
                  }
                };
                
                const colors = getChipColors();
                const isSelected = selectedTagIndex === idx;
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-in-out shadow-sm ${
                      isSelected ? 'ring-2 ring-red-400 shadow-lg scale-105' : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.15)' : colors.bg,
                      border: isSelected ? '1px solid #F87171' : `1px solid ${colors.border}`,
                      color: isSelected ? '#DC2626' : colors.text,
                      transform: 'translateY(0)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {/* 왼쪽 화살표 (순서변경 모드일 때만) */}
                    {isTagEditing && !isFirst && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLeft(idx);
                        }}
                        className="flex-shrink-0 p-0.5 rounded-full hover:bg-black hover:bg-opacity-10 active:scale-90 transition-all duration-150"
                        aria-label="왼쪽으로 이동"
                        title="왼쪽으로 이동"
                        style={{ color: isSelected ? '#DC2626' : colors.text }}
                      >
                        <ChevronLeft size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    
                    {/* 태그 레이블 (기본 모드에서만 클릭 가능) */}
                    <span 
                      onClick={() => !isTagEditing && handleTagClick(idx)}
                      className={`${isTagEditing ? 'mx-1' : 'mx-2'} ${isTagEditing ? 'cursor-default' : 'cursor-pointer'} whitespace-nowrap select-none flex items-center gap-1`}
                      style={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {displayLabel}
                      {isSelected && !isTagEditing && (
                        <span className="text-xs opacity-75 ml-1">
                          (다시 클릭)
                        </span>
                      )}
                    </span>
                    
                    {/* 오른쪽 화살표 (순서변경 모드일 때만) */}
                    {isTagEditing && !isLast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveRight(idx);
                        }}
                        className="flex-shrink-0 p-0.5 rounded-full hover:bg-black hover:bg-opacity-10 active:scale-90 transition-all duration-150"
                        aria-label="오른쪽으로 이동"
                        title="오른쪽으로 이동"
                        style={{ color: isSelected ? '#DC2626' : colors.text }}
                      >
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
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


