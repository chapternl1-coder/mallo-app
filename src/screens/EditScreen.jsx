// 파일: src/screens/EditScreen.jsx
import React from 'react';
import { X, Minus } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { runAutoTagMatchingForVisit } from '../utils/tagMatching';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

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
  TagPickerModal,
  refreshVisitLogs
}) {
  const { user } = useAuth();
  if (!tempResultData) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center"
        style={{ backgroundColor: '#F2F0E6' }}
      >
        <p style={{ color: '#232323' }}>편집할 데이터가 없습니다.</p>
        <button
          onClick={() => setCurrentScreen(SCREENS.RECORD)}
          className="mt-4 font-medium"
          style={{ color: '#232323' }}
        >
          결과 화면으로 돌아가기
        </button>
      </div>
    );
  }

  // 편집 중인 visit과 customer 정보로 정규화
  const normalizedVisit =
    editingVisit && editingCustomer
      ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
      : null;

  // 섹션 내용 업데이트 함수
  const updateSectionContent = (sectionIndex, contentIndex, newValue) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (
        updated.sections[sectionIndex] &&
        Array.isArray(updated.sections[sectionIndex].content) &&
        contentIndex >= 0 &&
        contentIndex < updated.sections[sectionIndex].content.length
      ) {
        updated.sections[sectionIndex].content[contentIndex] = newValue;
      }
      return updated;
    });
  };

  // 섹션에 새 항목 추가
  const addSectionItem = sectionIndex => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.sections[sectionIndex].content.push('');
      return updated;
    });
  };

  // 섹션 항목 삭제
  const removeSectionItem = (sectionIndex, displayContentIndex, isCustomerInfoSection) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));

      if (isCustomerInfoSection) {
        // 고객 기본 정보 섹션: 이름(인덱스 0)과 전화번호(인덱스 1)는 삭제 불가
        // 인덱스 2 이상만 삭제 가능 (구분 등)
        if (displayContentIndex >= 2) {
          const section = updated.sections[sectionIndex];
          const sectionContent = section.content || [];
          
          // displayContent 재구성하여 삭제할 항목의 실제 내용 찾기
          // (이름/전화번호를 제외한 항목들만 필터링)
          const nonNamePhoneItems = sectionContent.filter(item => {
            const itemStr = typeof item === 'string' ? item : String(item || '');
            return (
              itemStr &&
              !itemStr.includes('이름:') &&
              !itemStr.includes('전화번호:') &&
              !itemStr.includes('name:') &&
              !itemStr.includes('phone:') &&
              !itemStr.match(/이름.*전화번호|전화번호.*이름/) &&
              !itemStr.match(/name.*phone|phone.*name/i)
            );
          });
          
          // displayContentIndex 2부터는 nonNamePhoneItems의 (displayContentIndex - 2)번째 항목
          const targetIndexInFiltered = displayContentIndex - 2;
          if (targetIndexInFiltered >= 0 && targetIndexInFiltered < nonNamePhoneItems.length) {
            const itemToDelete = nonNamePhoneItems[targetIndexInFiltered];
            const itemToDeleteStr = typeof itemToDelete === 'string' ? itemToDelete : String(itemToDelete || '');
            
            // 원본 content 배열에서 해당 항목의 실제 인덱스 찾기
            let foundIndex = -1;
            for (let i = 0; i < sectionContent.length; i++) {
              const itemStr = typeof sectionContent[i] === 'string' 
                ? sectionContent[i] 
                : String(sectionContent[i] || '');
              
              // 이름/전화번호 항목이 아닌 경우에만 비교
              if (
                itemStr &&
                !itemStr.includes('이름:') &&
                !itemStr.includes('전화번호:') &&
                !itemStr.includes('name:') &&
                !itemStr.includes('phone:') &&
                !itemStr.match(/이름.*전화번호|전화번호.*이름/) &&
                !itemStr.match(/name.*phone|phone.*name/i)
              ) {
                if (itemStr === itemToDeleteStr) {
                  foundIndex = i;
                  break;
                }
              }
            }
            
            // 찾은 인덱스에서 삭제
            if (foundIndex >= 0 && foundIndex < sectionContent.length) {
              updated.sections[sectionIndex].content.splice(foundIndex, 1);
            }
          }
        }
      } else {
        if (
          displayContentIndex >= 0 &&
          displayContentIndex < updated.sections[sectionIndex].content.length
        ) {
          updated.sections[sectionIndex].content.splice(displayContentIndex, 1);
        }
      }

      return updated;
    });
  };

  // 제목에서 고객 이름 / 신규/기존 제거
  const cleanTitle = title => {
    if (!title) return title;
    let cleaned = title;

    if (editingCustomer?.name) {
      const customerName = editingCustomer.name;
      cleaned = cleaned
        .replace(new RegExp(`\\s*${customerName}\\s*`, 'g'), ' ')
        .trim();
      cleaned = cleaned
        .replace(new RegExp(`${customerName}\\s*고객`, 'g'), '')
        .trim();
    }

    cleaned = cleaned.replace(/\s*신규\s*고객\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*기존\s*고객\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*신규\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s*기존\s*/gi, ' ').trim();
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  };

  // 제목 업데이트 (입력 중에는 원본 값 유지, 저장 시에만 정리)
  const updateTitle = newTitle => {
    setTempResultData(prev => ({
      ...prev,
      title: newTitle
    }));
  };

  // 완료 버튼 클릭 핸들러 – 로컬 + Supabase 둘 다 업데이트
  const handleComplete = async () => {
    if (!tempResultData) return;

    // 1) 섹션에서 빈 줄 제거 + 제목 정리
    const cleanedSections = tempResultData.sections.map(section => ({
      ...section,
      content: (section.content || [])
        .map(item => String(item ?? ''))
        .filter(item => item.trim() !== '')
    }));

    const cleanedTitle = cleanTitle(tempResultData.title || '');

    const cleanedData = {
      ...tempResultData,
      title: cleanedTitle,
      sections: cleanedSections,
    };

    // RecordScreen 쪽에서 쓰는 resultData도 같이 교체
    setResultData(cleanedData);

    // 편집 중인 방문 + 고객 정보 정규화
    const currentNormalizedVisit =
      editingVisit && editingCustomer
        ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
        : null;

    // 방문 편집이 아닐 수도 있으니 조건 체크
    if (editingVisit && editingCustomer && currentNormalizedVisit) {
      const customerId = editingCustomer.id;

      // 2) 태그 자동 재매칭
      let finalVisitTagIds = editingVisitTagIds;

      try {
        const summarySections = cleanedData.sections.map(section => ({
          title:
            typeof section.title === 'string'
              ? section.title
              : String(section.title || ''),
          content: Array.isArray(section.content)
            ? section.content
                .map(item =>
                  typeof item === 'string' ? item : String(item || ''),
                )
                .join('\n')
            : String(section.content || ''),
        }));

        const { visitTags: matchedVisitTagIds } = runAutoTagMatchingForVisit({
          summarySections,
          allTags: allVisitTags,
        });

        finalVisitTagIds = [
          ...new Set([...editingVisitTagIds, ...matchedVisitTagIds]),
        ];

        console.log('[편집 저장] 태그 재매칭 완료:', {
          기존태그: editingVisitTagIds,
          매칭된태그: matchedVisitTagIds,
          최종태그: finalVisitTagIds,
        });
      } catch (error) {
        console.error('[편집 저장] 태그 재매칭 실패:', error);
        // 실패해도 기존 태그는 유지
      }

      // 태그 ID → label 배열로 변환
      const editedTagLabels = finalVisitTagIds
        .map(id => {
          const tag = allVisitTags.find(t => t.id === id);
          return tag ? tag.label : null;
        })
        .filter(label => label !== null);

      // 3) 로컬 visits 상태 업데이트 (고객상세/편집에서 보는 데이터)
      setVisits(prev => {
        if (!prev) return prev;
        const updated = { ...prev };

        if (updated[customerId] && Array.isArray(updated[customerId])) {
          updated[customerId] = updated[customerId].map(visit => {
            if (visit.id !== editingVisit.id) return visit;

            return {
              ...visit,
              // 어떤 화면에서든 제목을 가져가도 통일되도록 여러 필드에 다 반영
              title: cleanedTitle || visit.title,
              summaryTitle: cleanedTitle || visit.summaryTitle,
              summary: cleanedTitle || visit.summary,

              customerName: currentNormalizedVisit.customerName,
              customerPhone: currentNormalizedVisit.customerPhone,
              tags: editedTagLabels,

              // 상세 요약 구조도 같이 덮어쓰기
              detail: {
                ...(visit.detail || {}),
                sections: cleanedSections,
                summaryJson: cleanedData,
                summary_json: cleanedData,
              },
              summaryJson: cleanedData,
              summary_json: cleanedData,
            };
          });
        }

        return updated;
      });

      // 4) Supabase visit_logs 업데이트 (History / 다시 로드할 때 기준 데이터)
      if (editingVisit.id && user) {
        try {
          const { error } = await supabase
            .from('visit_logs')
            .update({
              title: cleanedTitle,      // 카드 상단 제목 컬럼
              summary_json: cleanedData // 전체 요약 JSON
            })
            .eq('id', editingVisit.id)
            .eq('owner_id', user.id);

          if (error) {
            console.error(
              '[EditScreen] Supabase visit_logs 업데이트 에러:',
              error,
            );
          } else {
            console.log('[EditScreen] Supabase visit_logs 업데이트 성공');

            // 최신 visit_logs 다시 불러와서 History/고객상세 동기화
            if (typeof refreshVisitLogs === 'function') {
              await refreshVisitLogs();
            }
          }
        } catch (e) {
          console.error('[EditScreen] visit_logs 업데이트 중 예외:', e);
        }
      }
    }

    // 5) 편집 상태 초기화 + 화면 이동
    // editingVisit 값을 먼저 저장 (상태 초기화 전)
    const wasEditingVisit = editingVisit;
    
    setTempResultData(null);
    setEditingVisit(null);
    setEditingCustomer(null);
    setEditingVisitTagIds([]);

    // 상태 초기화 후 화면 전환 (녹음 중 페이지가 보이지 않도록)
    setTimeout(() => {
      if (wasEditingVisit) {
        // 기존 방문 편집 → 고객상세로 복귀
        setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
      } else {
        // 녹음 직후 편집 → RECORD 결과 화면으로 복귀
        setCurrentScreen(SCREENS.RECORD);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center justify-between">
        {/* 뒤로가기 */}
        <button
          type="button"
          onClick={() => {
            // editingVisit 값을 먼저 저장 (상태 초기화 전)
            const wasEditingVisit = editingVisit;
            
            // 상태 초기화
            setTempResultData(null);
            setEditingVisit(null);
            setEditingCustomer(null);
            setEditingVisitTagIds([]);
            
            // 상태 초기화 후 화면 전환 (녹음 중 페이지가 보이지 않도록)
            setTimeout(() => {
              if (wasEditingVisit) {
                setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
              } else {
                setCurrentScreen(SCREENS.RECORD);
              }
            }, 0);
          }}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: '#232323' }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>

        <h2 className="font-bold text-base" style={{ color: '#232323' }}>
          기록 편집
        </h2>

        <button
          type="button"
          onClick={handleComplete}
          className="ml-2 px-3 py-1.5 text-[12px] font-medium rounded-full bg-[#C9A27A] text-white"
        >
          완료
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-5 pt-5 space-y-5 pb-40">
        {/* 제목 편집 */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 relative"
          style={{ padding: '12px 16px' }}
        >
          <label
            className="block text-sm font-bold mb-3"
            style={{ color: '#232323' }}
          >
            시술 요약
          </label>
          <textarea
            value={tempResultData.title || ''}
            onChange={e => {
              updateTitle(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onFocus={e => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            ref={el => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            className="w-full px-4 py-2 rounded-xl border-none resize-none focus:bg-gray-50 outline-none transition-colors overflow-hidden"
            style={{
              color: '#232323',
              minHeight: '40px',
              height: 'auto',
              lineHeight: '1.5'
            }}
            rows={1}
            placeholder="시술 내용만 입력하세요 (고객 이름, 신규/기존 정보는 자동으로 제거됩니다)"
          />
        </div>

        {/* 시술 태그 편집 */}
        {editingVisit && (
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 relative"
            style={{ padding: '12px 16px' }}
          >
            <div className="mb-4">
              <h4
                className="text-base font-bold mb-2"
                style={{ color: '#232323' }}
              >
                시술 태그
              </h4>
              <p
                className="text-sm"
                style={{ color: '#232323', opacity: 0.7 }}
              >
                이번 방문에 적용된 시술 태그를 편집할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {editingVisitTagIds.length === 0 ? (
                <p
                  className="text-sm"
                  style={{ color: '#232323', opacity: 0.5 }}
                >
                  태그가 없어요. 아래 버튼에서 추가할 수 있어요.
                </p>
              ) : (
                editingVisitTagIds.map(tagId => {
                  const tag = allVisitTags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setEditingVisitTagIds(prev =>
                          prev.filter(id => id !== tag.id)
                        )
                      }
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all bg-[#C9A27A] text-white shadow-sm hover:opacity-80 flex items-center gap-1"
                    >
                      {tag.label}
                      <X size={14} />
                    </button>
                  );
                })
              )}
            </div>

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
          const safeSectionTitle =
            typeof section.title === 'string'
              ? section.title
              : typeof section.title === 'object' && section.title !== null
              ? JSON.stringify(section.title, null, 2)
              : String(section.title || '');

          const isCustomerInfoSection =
            safeSectionTitle.includes('고객 기본 정보') ||
            safeSectionTitle.includes('고객 정보') ||
            safeSectionTitle.toLowerCase().includes('customer');

          // 고객 기본 정보 UI용 content 구성
          let displayContent = section.content || [];
          if (isCustomerInfoSection) {
            // 우선순위: tempResultData.customerInfo > editingCustomer > section.content에서 추출
            let customerName = '';
            let customerPhone = '';
            
            // 1순위: tempResultData.customerInfo (수정된 값)
            if (tempResultData.customerInfo) {
              customerName = tempResultData.customerInfo.name || '';
              customerPhone = tempResultData.customerInfo.phone || '';
            }
            
            // 2순위: editingCustomer
            if (!customerName && editingCustomer) {
              customerName = editingCustomer.name || '';
            }
            if (!customerPhone && editingCustomer) {
              customerPhone = editingCustomer.phone || '';
            }
            
            // 3순위: section.content에서 추출
            if (!customerName && !customerPhone) {
              (section.content || []).forEach(item => {
                const itemStr = typeof item === 'string' ? item : String(item || '');
                // 슬래시로 연결된 형식 처리
                if (itemStr.includes('/') && (itemStr.includes('이름') || itemStr.includes('전화번호'))) {
                  const parts = itemStr.split('/').map(p => p.trim());
                  parts.forEach(part => {
                    if (part.includes('이름:')) {
                      const nameMatch = part.match(/이름:\s*(.+)/);
                      if (nameMatch && nameMatch[1]) {
                        customerName = nameMatch[1].trim();
                      }
                    } else if (part.includes('전화번호:')) {
                      const phoneMatch = part.match(/전화번호:\s*(.+)/);
                      if (phoneMatch && phoneMatch[1]) {
                        customerPhone = phoneMatch[1].trim();
                      }
                    }
                  });
                } else if (itemStr.includes('이름:')) {
                  const nameMatch = itemStr.match(/이름:\s*(.+)/);
                  if (nameMatch && nameMatch[1]) {
                    customerName = nameMatch[1].trim();
                  }
                } else if (itemStr.includes('전화번호:')) {
                  const phoneMatch = itemStr.match(/전화번호:\s*(.+)/);
                  if (phoneMatch && phoneMatch[1]) {
                    customerPhone = phoneMatch[1].trim();
                  }
                }
              });
            }
            
            // 이름과 전화번호를 각각 별도 줄로 표시
            displayContent = [];
            if (customerName && customerName !== '이름 미입력') {
              displayContent.push(`이름: ${customerName}`);
            }
            if (customerPhone && customerPhone !== '전화번호 미기재') {
              displayContent.push(`전화번호: ${customerPhone}`);
            }
            
            // 기존 content에서 이름/전화번호 관련 항목 제거하고 나머지만 추가
            (section.content || []).forEach(item => {
              const itemStr = typeof item === 'string' ? item : String(item || '');
              // 이름/전화번호 관련 항목 제거 (다양한 형식 대응)
              if (
                itemStr &&
                !itemStr.includes('이름:') &&
                !itemStr.includes('전화번호:') &&
                !itemStr.includes('name:') &&
                !itemStr.includes('phone:') &&
                !itemStr.match(/이름.*전화번호|전화번호.*이름/) && // 슬래시로 연결된 형식 제거
                !itemStr.match(/name.*phone|phone.*name/i)
              ) {
                displayContent.push(itemStr);
              }
            });
          }

          return (
            <div
              key={sectionIndex}
              className="bg-white rounded-xl shadow-sm border border-gray-200 relative"
              style={{ padding: '12px 16px' }}
            >
              <h4
                className="text-base font-bold mb-4"
                style={{ color: '#232323' }}
              >
                {safeSectionTitle}
              </h4>

              <div className="space-y-3 mb-3">
                {displayContent.map((item, contentIndex) => {
                  const sectionTitleStr =
                    typeof section.title === 'string'
                      ? section.title
                      : String(section.title || '');
                  const isCustomerBasicInfo =
                    sectionTitleStr &&
                    sectionTitleStr.includes('고객 기본 정보');
                  const isVisitInfo =
                    sectionTitleStr &&
                    (sectionTitleStr.includes('방문·예약 정보') ||
                      sectionTitleStr.includes('방문예약 정보'));
                  const isProtectedSection = isCustomerBasicInfo || isVisitInfo;

                  let showDeleteButton = false;
                  if (isProtectedSection) {
                    if (isCustomerBasicInfo) {
                      showDeleteButton = contentIndex >= 2;
                    } else if (isVisitInfo) {
                      showDeleteButton = contentIndex >= 1;
                    }
                  } else {
                    showDeleteButton = displayContent.length > 1;
                  }

                  // 이름과 번호는 삭제 불가하지만 수정은 가능
                  const isNameOrPhone = isCustomerBasicInfo && (contentIndex === 0 || contentIndex === 1);
                  const isReadOnly = false; // 모든 항목 수정 가능

                  return (
                    <div key={contentIndex} className="flex gap-2 relative">
                      <textarea
                        value={
                          typeof item === 'string'
                            ? item
                            : typeof item === 'object' && item !== null
                            ? JSON.stringify(item, null, 2)
                            : String(item || '')
                        }
                        onChange={e => {
                          if (isCustomerInfoSection) {
                            // 이름(인덱스 0) 수정
                            if (contentIndex === 0) {
                              const newValue = e.target.value;
                              // "이름: " 접두사 제거
                              const nameValue = newValue.replace(/^이름:\s*/, '').trim();
                              setTempResultData(prev => {
                                const updated = JSON.parse(JSON.stringify(prev));
                                if (!updated.customerInfo) {
                                  updated.customerInfo = {};
                                }
                                updated.customerInfo.name = nameValue;
                                return updated;
                              });
                            }
                            // 전화번호(인덱스 1) 수정
                            else if (contentIndex === 1) {
                              const newValue = e.target.value;
                              // "전화번호: " 접두사 제거
                              const phoneValue = newValue.replace(/^전화번호:\s*/, '').trim();
                              setTempResultData(prev => {
                                const updated = JSON.parse(JSON.stringify(prev));
                                if (!updated.customerInfo) {
                                  updated.customerInfo = {};
                                }
                                updated.customerInfo.phone = phoneValue;
                                return updated;
                              });
                            }
                            // 구분 등 다른 항목(인덱스 2 이상) 수정
                            else if (contentIndex >= 2) {
                              const originalIndex = contentIndex - 2;
                              if (originalIndex < section.content.length) {
                                updateSectionContent(
                                  sectionIndex,
                                  originalIndex,
                                  e.target.value
                                );
                              } else {
                                setTempResultData(prev => {
                                  const updated = JSON.parse(
                                    JSON.stringify(prev)
                                  );
                                  updated.sections[sectionIndex].content.push(
                                    e.target.value
                                  );
                                  return updated;
                                });
                              }
                            }
                          } else {
                            updateSectionContent(
                              sectionIndex,
                              contentIndex,
                              e.target.value
                            );
                          }

                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        ref={el => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        readOnly={isReadOnly}
                        className={`flex-1 px-4 py-2 rounded-xl border-none resize-none outline-none transition-colors ${
                          isReadOnly
                            ? 'bg-gray-50 cursor-not-allowed'
                            : 'focus:bg-gray-50'
                        }`}
                        style={{
                          color: '#232323',
                          minHeight: '40px',
                          height: 'auto',
                          paddingRight: showDeleteButton ? '50px' : '16px',
                          lineHeight: '1.5',
                          overflow: 'hidden'
                        }}
                        rows={1}
                        placeholder={
                          isReadOnly ? '' : '내용을 입력하세요...'
                        }
                      />
                      {showDeleteButton && (
                        <button
                          onClick={() =>
                            removeSectionItem(
                              sectionIndex,
                              contentIndex,
                              isCustomerInfoSection
                            )
                          }
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

              {!isCustomerInfoSection && (
                <button
                  onClick={() => addSectionItem(sectionIndex)}
                  className="w-full py-3 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors mt-4"
                  style={{ color: '#232323' }}
                >
                  + 항목 추가
                </button>
              )}
            </div>
          );
        })}

        {/* 전체 삭제 버튼 */}
        {editingVisit && editingCustomer && (
          <div className="flex justify-center p-6 mt-5">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    '이 방문 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.'
                  )
                ) {
                  const customerId = editingCustomer.id;
                  const visitId = editingVisit.id;

                  // 상태 초기화 먼저 수행
                  setTempResultData(null);
                  setEditingVisit(null);
                  setEditingCustomer(null);
                  setEditingVisitTagIds([]);
                  
                  // visits 업데이트
                  setVisits(prev => {
                    const updated = {};
                    Object.keys(prev || {}).forEach(key => {
                      const list = prev[key];
                      if (!Array.isArray(list)) {
                        updated[key] = list;
                        return;
                      }
                      updated[key] = list.filter(v => v.id !== visitId);
                    });
                    return updated;
                  });

                  // 상태 초기화 후 화면 전환 (녹음 중 페이지가 보이지 않도록)
                  setTimeout(() => {
                    setSelectedCustomerId(customerId);
                    setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
                  }, 0);
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
          onChangeSelected={nextSelected => setEditingVisitTagIds(nextSelected)}
        />
      )}
    </div>
  );
}

export default EditScreen;
