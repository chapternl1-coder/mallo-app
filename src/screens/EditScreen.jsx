import React from 'react';
import { ArrowLeft, X, Minus } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { runAutoTagMatchingForVisit } from '../utils/tagMatching';

function EditScreen({
  tempResultData,
  setTempResultData,
  editingVisit,
  setEditingVisit,
  editingCustomer,
  setEditingCustomer,
  editingVisitTagIds,
  setEditingVisitTagIds,
  allVisitTags,
  normalizeRecordWithCustomer,
  setResultData,
  setVisits,
  setCustomers,
  setCurrentScreen,
  setSelectedCustomerId,
  isEditingVisitTagPickerOpen,
  setIsEditingVisitTagPickerOpen,
  TagPickerModal
}) {

  if (!tempResultData) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p style={{ color: '#232323' }}>편집할 데이터가 없습니다.</p>
        <button onClick={() => setCurrentScreen(SCREENS.RECORD)} className="mt-4 font-medium" style={{ color: '#232323' }}>결과 화면으로 돌아가기</button>
      </div>
    );
  }

  // 편집 중인 visit과 customer 정보로 정규화
  const normalizedVisit = editingVisit && editingCustomer 
    ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
    : null;

  // 섹션 내용 업데이트 함수
  const updateSectionContent = (sectionIndex, contentIndex, newValue) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].content[contentIndex] = newValue;
      return updated;
    });
  };

  // 섹션에 새 항목 추가 함수
  const addSectionItem = (sectionIndex) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].content.push('');
      return updated;
    });
  };

  // 섹션 항목 삭제 함수
  const removeSectionItem = (sectionIndex, contentIndex) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].content.splice(contentIndex, 1);
      return updated;
    });
  };

  // 제목에서 고객 이름과 신규/기존 정보 제거 함수
  const cleanTitle = (title) => {
    if (!title) return title;
    let cleaned = title;
    
    // 편집 중인 고객 이름 제거
    if (editingCustomer?.name) {
      const customerName = editingCustomer.name;
      // 이름 패턴 제거 (앞뒤 공백 포함)
      cleaned = cleaned.replace(new RegExp(`\\s*${customerName}\\s*`, 'g'), ' ').trim();
      // "○○○ 고객" 패턴 제거
      cleaned = cleaned.replace(new RegExp(`${customerName}\\s*고객`, 'g'), '').trim();
    }
    
    // "신규 고객", "기존 고객" 패턴 제거
    cleaned = cleaned.replace(/\s*신규\s*고객\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*기존\s*고객\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*신규\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*기존\s*/gi, ' ').trim();
    
    // 연속된 공백 정리
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // 제목 업데이트 함수
  const updateTitle = (newTitle) => {
    // 입력 시에도 자동으로 정리
    const cleaned = cleanTitle(newTitle);
    setTempResultData(prev => ({
      ...prev,
      title: cleaned
    }));
  };

  // content 배열의 모든 항목을 문자열로 변환하는 헬퍼 함수
  const normalizeContentArray = (content) => {
    if (!Array.isArray(content)) {
      return [];
    }
    
    const result = [];
    
    content.forEach((item) => {
      if (typeof item === 'string') {
        if (!item.trim()) {
          return;
        }
        const trimmed = item.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(item);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              Object.entries(parsed).forEach(([key, value]) => {
                const valStr = typeof value === 'object' && value !== null 
                  ? JSON.stringify(value) 
                  : String(value || '');
                result.push(`${key}: ${valStr}`);
              });
              return;
            }
            result.push(JSON.stringify(parsed));
            return;
          } catch (e) {
            result.push(item);
            return;
          }
        }
        result.push(item);
        return;
      }
      
      if (typeof item === 'object' && item !== null) {
        try {
          if (Array.isArray(item)) {
            item.forEach(i => {
              if (typeof i === 'object' && i !== null) {
                Object.entries(i).forEach(([key, value]) => {
                  result.push(`${key}: ${String(value || '')}`);
                });
              } else {
                result.push(String(i || ''));
              }
            });
            return;
          }
          Object.entries(item).forEach(([key, value]) => {
            const valStr = typeof value === 'object' && value !== null 
              ? JSON.stringify(value) 
              : String(value || '');
            result.push(`${key}: ${valStr}`);
          });
          return;
        } catch (e) {
          result.push(String(item));
          return;
        }
      }
      
      const str = String(item || '');
      if (str.trim()) {
        result.push(str);
      }
    });
    
    return result.filter(item => item && item.trim());
  };

  // 완료 버튼 클릭 핸들러
  const handleComplete = async () => {
    // 빈 항목 제거
    const cleanedData = {
      ...tempResultData,
      sections: tempResultData.sections.map(section => ({
        ...section,
        content: section.content.filter(item => item.trim() !== '')
      }))
    };
    
    // resultData 업데이트
    setResultData(cleanedData);
    
    // 편집 중인 visit이 있으면 업데이트 (customerName, customerPhone 저장)
    const currentNormalizedVisit = editingVisit && editingCustomer 
      ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
      : null;
    
    if (editingVisit && editingCustomer && currentNormalizedVisit) {
      const customerId = editingCustomer.id;
      
      // 수정된 요약을 기준으로 태그 자동 재매칭
      let finalVisitTagIds = editingVisitTagIds;
      
      try {
        // summarySections를 태그 매칭 함수에 맞는 형태로 변환
        const summarySections = cleanedData.sections.map(section => ({
          title: typeof section.title === 'string' ? section.title : String(section.title || ''),
          content: Array.isArray(section.content) 
            ? section.content.map(item => typeof item === 'string' ? item : String(item || '')).join('\n')
            : String(section.content || '')
        }));
        
        // 태그 재매칭 실행
        const { visitTags: matchedVisitTagIds } = runAutoTagMatchingForVisit({
          summarySections,
          allTags: allVisitTags
        });
        
        // 기존에 선택된 태그와 매칭된 태그를 합침 (중복 제거)
        finalVisitTagIds = [...new Set([...editingVisitTagIds, ...matchedVisitTagIds])];
        
        console.log('[편집 저장] 태그 재매칭 완료:', {
          기존태그: editingVisitTagIds,
          매칭된태그: matchedVisitTagIds,
          최종태그: finalVisitTagIds
        });
      } catch (error) {
        console.error('[편집 저장] 태그 재매칭 실패:', error);
        // 태그 재매칭 실패해도 기존 태그는 유지
      }
      
      // 편집된 태그를 label 배열로 변환
      const editedTagLabels = finalVisitTagIds
        .map(id => {
          const tag = allVisitTags.find(t => t.id === id);
          return tag ? tag.label : null;
        })
        .filter(label => label !== null);
      
      setVisits(prev => {
        const updated = { ...prev };
        if (updated[customerId]) {
          updated[customerId] = updated[customerId].map(v => 
            v.id === editingVisit.id 
              ? { 
                  ...v, 
                  customerName: currentNormalizedVisit.customerName,
                  customerPhone: currentNormalizedVisit.customerPhone,
                  tags: editedTagLabels, // 재매칭된 태그 업데이트
                  detail: {
                    sections: cleanedData.sections
                  }
                }
              : v
          );
        }
        return updated;
      });
      
      console.log('[편집 저장] 요약 + 태그 업데이트 완료');
    }
    
    setTempResultData(null);
    setEditingVisit(null);
    setEditingCustomer(null);
    setEditingVisitTagIds([]);
    
    // 결과 화면으로 복귀 (Record 화면의 result 상태)
    // 편집 화면에서 온 경우 CustomerDetail로 돌아가기
    if (editingVisit) {
      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
    } else {
      setCurrentScreen(SCREENS.RECORD);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
        {/* 뒤로가기 버튼 */}
        <button
          type="button"
          onClick={() => {
            setTempResultData(null);
            setEditingVisit(null);
            setEditingCustomer(null);
            setEditingVisitTagIds([]);
            // 편집 화면에서 온 경우 CustomerDetail로 돌아가기
            if (editingVisit) {
              setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
            } else {
              setCurrentScreen(SCREENS.RECORD);
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: '#232323' }}
        >
          <span className="text-[24px]">&#x2039;</span>
        </button>

        {/* 가운데 타이틀 */}
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>기록 편집</h2>

        {/* 오른쪽 완료 버튼 */}
        <button
          type="button"
          onClick={handleComplete}
          className="ml-2 px-3 py-1.5 text-[12px] font-medium rounded-full bg-[#C9A27A] text-white"
        >
          완료
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-5">
        {/* 제목 편집 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-3" style={{ color: '#232323' }}>시술 요약</label>
          <textarea
            value={cleanTitle(tempResultData.title || '')}
            onChange={(e) => updateTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border-none resize-none focus:bg-gray-50 outline-none transition-colors"
            style={{ color: '#232323', minHeight: '60px' }}
            rows={2}
            placeholder="시술 내용만 입력하세요 (고객 이름, 신규/기존 정보는 자동으로 제거됩니다)"
          />
        </div>

        {/* 시술 태그 편집 섹션 */}
        {editingVisit && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h4 className="text-base font-bold mb-2" style={{ color: '#232323' }}>
                시술 태그
              </h4>
              <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
                이번 방문에 적용된 시술 태그를 편집할 수 있습니다.
              </p>
            </div>

            {/* 태그 칩들 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {editingVisitTagIds.length === 0 ? (
                <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                  태그가 없어요. 아래 버튼에서 추가할 수 있어요.
                </p>
              ) : (
                editingVisitTagIds.map((tagId) => {
                  const tag = allVisitTags.find((t) => t.id === tagId);
                  if (!tag) return null;

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setEditingVisitTagIds((prev) =>
                          prev.filter((id) => id !== tag.id)
                        );
                      }}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-[#C9A27A] text-white shadow-sm hover:opacity-80 flex items-center gap-1"
                    >
                      {tag.label}
                      <X size={14} />
                    </button>
                  );
                })
              )}
            </div>

            {/* 태그 더 추가하기 버튼 */}
            <button
              type="button"
              onClick={() => setIsEditingVisitTagPickerOpen(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + 태그 더 추가하기
            </button>
          </div>
        )}

        {/* 섹션 편집 */}
        {tempResultData.sections.map((section, sectionIndex) => {
          // section.title을 안전하게 문자열로 변환
          const safeSectionTitle = typeof section.title === 'string' 
            ? section.title 
            : (typeof section.title === 'object' && section.title !== null 
              ? JSON.stringify(section.title, null, 2) 
              : String(section.title || ''));
          
          return (
            <div key={sectionIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-base font-bold mb-4" style={{ color: '#232323' }}>
                {safeSectionTitle}
              </h4>
            <div className="space-y-3">
              {section.content.map((item, contentIndex) => {
                const sectionTitleStr = typeof section.title === 'string' ? section.title : String(section.title || '');
                const isCustomerBasicInfo = sectionTitleStr && sectionTitleStr.includes('고객 기본 정보');
                const isVisitInfo = sectionTitleStr && (
                  sectionTitleStr.includes('방문·예약 정보') ||
                  sectionTitleStr.includes('방문예약 정보')
                );
                const isProtectedSection = isCustomerBasicInfo || isVisitInfo;
                
                // 보호된 섹션에서 기본 항목 이후에 추가된 항목만 삭제 버튼 표시
                let showDeleteButton = false;
                if (isProtectedSection) {
                  if (isCustomerBasicInfo) {
                    // 고객 기본 정보: 처음 3개 항목은 삭제 불가, 4번째부터 삭제 가능
                    showDeleteButton = contentIndex >= 3;
                  } else if (isVisitInfo) {
                    // 방문·예약 정보: 처음 1개 항목은 삭제 불가, 2번째부터 삭제 가능
                    showDeleteButton = contentIndex >= 1;
                  }
                } else {
                  // 보호되지 않은 섹션: 항목이 2개 이상이면 삭제 버튼 표시
                  showDeleteButton = section.content.length > 1;
                }

                return (
                  <div key={contentIndex} className="flex gap-2 relative">
                    <textarea
                      value={typeof item === 'string' ? item : (typeof item === 'object' && item !== null ? JSON.stringify(item, null, 2) : String(item || ''))}
                      onChange={(e) => updateSectionContent(sectionIndex, contentIndex, e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl border-none resize-none focus:bg-gray-50 outline-none transition-colors"
                      style={{ color: '#232323', minHeight: '60px', paddingRight: showDeleteButton ? '50px' : '16px' }}
                      rows={Math.max(2, Math.ceil(String(item || '').length / 40))}
                      placeholder="내용을 입력하세요..."
                    />
                    {showDeleteButton && (
                      <button
                        onClick={() => removeSectionItem(sectionIndex, contentIndex)}
                        className="absolute top-2 right-2 bg-red-100 text-red-500 p-1.5 rounded-full hover:bg-red-200 transition-colors flex items-center justify-center z-10"
                        title="삭제"
                      >
                        <Minus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => addSectionItem(sectionIndex)}
              className="w-full py-3 rounded-2xl text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
              style={{ color: '#232323' }}
            >
              + 항목 추가
            </button>
          </div>
          );
        })}
        
        {/* 전체 삭제 버튼 (editingVisit이 있을 때만 표시, 스크롤 끝에만 표시) */}
        {editingVisit && editingCustomer && (
          <div className="flex justify-center p-6 mt-5">
            <button 
              onClick={() => {
                if (window.confirm('이 방문 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.')) {
                  const customerId = editingCustomer.id;
                  const visitId = editingVisit.id;
                  
                  // 방문 기록 삭제 및 고객 방문 횟수 업데이트
                  setVisits(prev => {
                    const updated = { ...prev };
                    if (updated[customerId]) {
                      const remainingVisits = updated[customerId].filter(v => v.id !== visitId);
                      updated[customerId] = remainingVisits.length > 0 ? remainingVisits : [];
                      
                      // 고객의 방문 횟수 업데이트
                      setCustomers(prevCustomers => prevCustomers.map(c => {
                        if (c.id === customerId) {
                          return {
                            ...c,
                            visitCount: remainingVisits.length,
                            lastVisit: remainingVisits.length > 0 
                              ? remainingVisits[0].date 
                              : null
                          };
                        }
                        return c;
                      }));
                    }
                    return updated;
                  });
                  
                  // 상태 초기화
                  setTempResultData(null);
                  setEditingVisit(null);
                  setEditingCustomer(null);
                  setEditingVisitTagIds([]);
                  
                  // CustomerDetail 화면으로 돌아가기
                  setSelectedCustomerId(customerId);
                  setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
              style={{ backgroundColor: '#EF4444' }}
            >
              전체 삭제
            </button>
          </div>
        )}
      </main>

      {/* 방문 편집용 태그 선택 모달 */}
      {isEditingVisitTagPickerOpen && (
        <TagPickerModal
          allVisitTags={allVisitTags}
          selectedTagIds={editingVisitTagIds}
          onClose={() => setIsEditingVisitTagPickerOpen(false)}
          onChangeSelected={(nextSelected) => setEditingVisitTagIds(nextSelected)}
        />
      )}
    </div>
  );
}

export default EditScreen;

