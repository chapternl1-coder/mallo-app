// src/screens/EditScreen.jsx
import React from 'react';
import { ArrowLeft, X, Minus } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { supabase } from '../lib/supabaseClient'; // 🔥 새로 추가
// ⛔ runAutoTagMatchingForVisit는 더 이상 사용하지 않으니까 삭제

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
  refetchVisitLogs  // ✅ Supabase 데이터 새로고침용
}) {
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

  // 섹션 내용 업데이트 함수 (인덱스 안전 체크 포함)
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
      if (
        updated.sections[sectionIndex] &&
        Array.isArray(updated.sections[sectionIndex].content)
      ) {
      updated.sections[sectionIndex].content.push('');
      }
      return updated;
    });
  };

  // 섹션 항목 삭제 (고객 기본 정보 섹션 보정 포함)
  const removeSectionItem = (sectionIndex, displayContentIndex, isCustomerInfoSection) => {
    setTempResultData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));

      if (!updated.sections[sectionIndex]) return updated;
      const section = updated.sections[sectionIndex];

      if (!Array.isArray(section.content)) {
        section.content = [];
      }

      if (isCustomerInfoSection) {
        // 고객 기본 정보 섹션: displayContentIndex >= 2 일 때만 실제 content 삭제
        if (displayContentIndex >= 2) {
          const originalIndex = displayContentIndex - 2;
          if (
            originalIndex >= 0 &&
            originalIndex < section.content.length
          ) {
            section.content.splice(originalIndex, 1);
          }
        }
      } else {
        // 일반 섹션
        if (
          displayContentIndex >= 0 &&
          displayContentIndex < section.content.length
        ) {
          section.content.splice(displayContentIndex, 1);
        }
      }

      return updated;
    });
  };

  // 제목에서 고객 이름과 신규/기존 정보 제거
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

  // 제목 업데이트
  const updateTitle = newTitle => {
    const cleaned = cleanTitle(newTitle);
    setTempResultData(prev => ({
      ...prev,
      title: cleaned
    }));
  };

  // 완료 버튼 클릭 핸들러
  const handleComplete = async () => {
    if (!tempResultData) {
      // 편집 데이터 없으면 그냥 원래 화면으로
      if (editingVisit) {
        setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
      } else {
        setCurrentScreen(SCREENS.RECORD);
      }
      return;
    }

    // 1) 섹션 내용에서 빈 줄 정리
    const cleanedSections = tempResultData.sections.map((section) => ({
      ...section,
      content: Array.isArray(section.content)
        ? section.content
            .map((item) => (item == null ? '' : String(item)))
            .filter((item) => item.trim() !== '')
        : [],
    }));

    const cleanedData = {
      ...tempResultData,
      // 제목은 이미 textarea에서 cleanTitle을 거쳐서 들어오고 있음
      sections: cleanedSections,
    };

    // RecordScreen 쪽 resultData 업데이트
    setResultData(cleanedData);

    // 2) 편집 중인 방문 + 고객이 있을 때만 visits 상태 업데이트
    const currentNormalizedVisit =
      editingVisit && editingCustomer
        ? normalizeRecordWithCustomer(editingVisit, editingCustomer)
        : null;

    if (editingVisit && editingCustomer && currentNormalizedVisit) {
      // customerId 우선순위: editingVisit.customerId (Supabase UUID) > editingCustomer.id
      // Supabase UUID를 우선 사용하여 CustomerDetailScreen과 일치시킴
      const customerId = editingVisit.customerId || editingVisit.customer_id || editingCustomer.id;

      console.log('[편집 저장] customerId 확인:', {
        editingVisitCustomerId: editingVisit.customerId || editingVisit.customer_id,
        editingCustomerId: editingCustomer.id,
        finalCustomerId: customerId
      });

      // 🔥 1) 자동 태그 재매칭 ❌
      //    → 편집 화면에서는 "사용자가 선택한 태그(editingVisitTagIds)"만 진실로 사용
      const finalVisitTagIds = [...new Set(editingVisitTagIds)];

      // 2) ID → 라벨 배열로 변환 (빈 값 제거)
      const finalTagLabels = finalVisitTagIds
        .map((id) => {
          const tag = allVisitTags.find((t) => t.id === id);
          return tag ? tag.label : null;
        })
        .filter((label) => label !== null);

      console.log('[편집 저장] 태그 정보(자동매칭 없음):', {
        editingVisitTagIds,
        finalVisitTagIds,
        finalTagLabels,
        allVisitTagsCount: allVisitTags.length
      });

      // 방문 리스트에 요약 + 태그 반영
      setVisits((prev) => {
        const updated = { ...prev };

        // 1) 모든 customerId를 순회하면서 editingVisit.id로 방문 기록 찾기
        let foundCustomerId = null;
        let foundVisitIndex = -1;
        
        for (const key of Object.keys(updated)) {
          const visitIndex = updated[key].findIndex((v) => v.id === editingVisit.id);
          if (visitIndex !== -1) {
            foundCustomerId = key;
            foundVisitIndex = visitIndex;
            break;
          }
        }
        
        // 2) customerId가 없으면 초기화
        if (!updated[customerId]) {
          updated[customerId] = [];
        }
        
        // 3) 방문 기록을 찾았는지 확인
        if (foundCustomerId && foundVisitIndex !== -1) {
          // 기존 방문 기록을 찾았으면 해당 위치에서 업데이트
          if (foundCustomerId !== customerId) {
            // 다른 customerId에 있으면 제거하고 새 customerId에 추가
            const existingVisit = updated[foundCustomerId][foundVisitIndex];
            updated[foundCustomerId] = updated[foundCustomerId].filter((v, idx) => idx !== foundVisitIndex);
            
            // 새 customerId에 업데이트된 방문 기록 추가
            const updatedVisit = {
              ...existingVisit,
              customerId: customerId,
              customer_id: customerId,
              tags: finalTagLabels,
              tagLabels: finalTagLabels,
              autoTags: finalTagLabels,
              serviceTags: finalTagLabels,
              summaryTags: finalTagLabels,
              visitTags: finalTagLabels,
              visitTagIds: finalVisitTagIds,
              tagIds: finalVisitTagIds,
              detail: {
                ...(existingVisit.detail || {}),
                sections: cleanedSections,
                tags: finalTagLabels,
                tagIds: finalVisitTagIds,
              },
              summaryJson: {
                ...(existingVisit.summaryJson || {}),
                tags: finalTagLabels,
                tagIds: finalVisitTagIds,
              },
              summary_json: {
                ...(existingVisit.summary_json || {}),
                tags: finalTagLabels,
                tagIds: finalVisitTagIds,
              },
              title: cleanedData.title || existingVisit.title,
              customerName: currentNormalizedVisit.customerName,
              customerPhone: currentNormalizedVisit.customerPhone,
            };
            updated[customerId].push(updatedVisit);
          } else {
            // 같은 customerId에 있으면 그 자리에서 업데이트
            updated[customerId] = updated[customerId].map((v, idx) => {
              if (idx !== foundVisitIndex) return v;
              
              const base = {
                ...v,
                customerName: currentNormalizedVisit.customerName,
                customerPhone: currentNormalizedVisit.customerPhone,
              detail: {
                  ...(v.detail || {}),
                sections: cleanedSections,
                },
                title: cleanedData.title || v.title,
              };

              return {
                ...base,
                customerId: customerId,
                customer_id: customerId,
                tags: finalTagLabels,
                tagLabels: finalTagLabels,
                autoTags: finalTagLabels,
                serviceTags: finalTagLabels,
                summaryTags: finalTagLabels,
                visitTags: finalTagLabels,
                visitTagIds: finalVisitTagIds,
                tagIds: finalVisitTagIds,
                detail: {
                  ...base.detail,
                  tags: finalTagLabels,
                  tagIds: finalVisitTagIds,
              },
                summaryJson: {
                  ...(v.summaryJson || {}),
                  tags: finalTagLabels,
                  tagIds: finalVisitTagIds,
                },
                summary_json: {
                  ...(v.summary_json || {}),
                  tags: finalTagLabels,
                  tagIds: finalVisitTagIds,
                },
            };
          });
          }
        } else {
          // 방문 기록을 찾지 못했으면 새로 추가
          console.log('[편집 저장] 방문 기록을 찾지 못해 새로 추가:', editingVisit.id);
          const updatedVisit = {
            ...editingVisit,
            customerId: customerId,
            customer_id: customerId,
            tags: finalTagLabels,
            tagLabels: finalTagLabels,
            autoTags: finalTagLabels,
            serviceTags: finalTagLabels,
            summaryTags: finalTagLabels,
            visitTags: finalTagLabels,
            visitTagIds: finalVisitTagIds,
            tagIds: finalVisitTagIds,
            detail: {
              ...(editingVisit.detail || {}),
              sections: cleanedSections,
              tags: finalTagLabels,
              tagIds: finalVisitTagIds,
            },
            summaryJson: {
              ...(editingVisit.summaryJson || {}),
              tags: finalTagLabels,
              tagIds: finalVisitTagIds,
            },
            summary_json: {
              ...(editingVisit.summary_json || {}),
              tags: finalTagLabels,
              tagIds: finalVisitTagIds,
            },
            title: cleanedData.title || editingVisit.title,
            customerName: currentNormalizedVisit.customerName,
            customerPhone: currentNormalizedVisit.customerPhone,
          };
          updated[customerId].push(updatedVisit);
        }

        // localStorage 저장
        try {
          localStorage.setItem('mallo_visits', JSON.stringify(updated));
          console.log('[편집 저장] localStorage 저장 완료 (mallo_visits)');
        } catch (e) {
          console.warn('[편집 저장] localStorage(mallo_visits) 저장 실패:', e);
        }

        return updated;
      });

      // 🔥 Supabase visit_logs.tags도 동시에 업데이트 (있으면)
      // UUID 검증: Supabase에 저장된 방문 기록만 업데이트
      const isValidUuid = (value) => {
        if (typeof value !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      };

      // 🔥 Supabase visit_logs.tags 업데이트 및 로컬 저장소 동기화
      // ⚠️ 중요: await로 기다려서 업데이트가 완료된 후 화면 전환
      if (editingVisit.id && isValidUuid(editingVisit.id)) {
        try {
          console.log('[편집 저장] Supabase 태그 업데이트 시작:', {
            visitId: editingVisit.id,
            tags: finalTagLabels,
          });

          const { error, data } = await supabase
            .from('visit_logs')
            .update({ tags: finalTagLabels })
            .eq('id', editingVisit.id)
            .select();

          if (error) {
            console.error('[편집 저장] Supabase visit_logs.tags 업데이트 실패:', {
              visitId: editingVisit.id,
              error,
              tags: finalTagLabels,
            });
          } else {
            console.log('[편집 저장] Supabase visit_logs.tags 업데이트 완료:', {
              visitId: editingVisit.id,
              tags: finalTagLabels,
              supabaseResponse: data,
            });

            // ✅ Supabase 업데이트 성공 후, 로컬 저장소도 Supabase 태그로 동기화
            const supabaseTags = data && data[0]?.tags ? data[0].tags : finalTagLabels;
            
            console.log('[편집 저장] 로컬 저장소 동기화 시작:', {
              visitId: editingVisit.id,
              supabaseTags,
            });

            setVisits((prev) => {
              const updated = { ...prev };
              
              // 모든 customerId를 순회하면서 해당 방문 기록 찾기
              let found = false;
              for (const key of Object.keys(updated)) {
                const visitIndex = updated[key].findIndex((v) => v.id === editingVisit.id);
                if (visitIndex !== -1) {
                  found = true;
                  
                  updated[key] = updated[key].map((v, idx) => {
                    if (idx !== visitIndex) return v;
                    
                    const updatedVisit = {
                      ...v,
                      tags: supabaseTags,
                      tagLabels: supabaseTags,
                      autoTags: supabaseTags,
                      serviceTags: supabaseTags,
                      summaryTags: supabaseTags,
                      visitTags: supabaseTags,
                      detail: {
                        ...(v.detail || {}),
                        tags: supabaseTags,
                      },
                      summaryJson: {
                        ...(v.summaryJson || {}),
                        tags: supabaseTags,
                      },
                      summary_json: {
                        ...(v.summary_json || {}),
                        tags: supabaseTags,
                      },
                    };
                    
                    console.log('[편집 저장] 방문 기록 업데이트:', {
                      visitId: updatedVisit.id,
                      customerId: key,
                      tags: updatedVisit.tags,
                    });
                    
                    return updatedVisit;
                  });
                  
                  // localStorage에도 즉시 저장
                  try {
                    localStorage.setItem('mallo_visits', JSON.stringify(updated));
                    console.log('[편집 저장] localStorage 저장 완료');
                  } catch (e) {
                    console.error('[편집 저장] localStorage 저장 실패:', e);
                  }
                  
                  break;
                }
              }
              
              if (!found) {
                console.warn('[편집 저장] 방문 기록을 찾지 못함:', editingVisit.id);
              }
              
              return updated;
            });

            // 🔄 Supabase에서 최신 데이터 가져오기 (화면에 즉시 반영)
            // ⚠️ await로 기다려서 최신 데이터를 가져온 후 화면 전환
            if (refetchVisitLogs) {
              console.log('[편집 저장] Supabase 데이터 새로고침 시작');
              try {
                await refetchVisitLogs();
                console.log('[편집 저장] Supabase 데이터 새로고침 완료');
                
                // 추가 지연: React state 업데이트가 완료될 시간 확보
                await new Promise(resolve => setTimeout(resolve, 300));
                console.log('[편집 저장] state 업데이트 대기 완료');
        } catch (e) {
                console.error('[편집 저장] Supabase 데이터 새로고침 실패:', e);
              }
            }
          }
        } catch (e) {
          console.error('[편집 저장] Supabase visit_logs.tags 업데이트 예외:', e);
        }
      } else if (editingVisit.id) {
        console.log('[편집 저장] 로컬 방문 기록이므로 Supabase 업데이트 생략:', editingVisit.id);
    }

      // (5) 편집용 editingVisit / editingVisitTagIds 도 동일하게 맞춰두기
      setEditingVisit((prev) => {
        if (!prev || prev.id !== editingVisit.id) return prev;

        const prevSummaryJson = prev.summaryJson || prev.summary_json || {};
        const updatedSummaryJson = {
          ...prevSummaryJson,
          tags: finalTagLabels,
          tagIds: finalVisitTagIds,
        };

        return {
          ...prev,
          title: cleanedData.title || prev.title,
          customerName:
            currentNormalizedVisit.customerName ||
            editingCustomer.name ||
            prev.customerName,
          customerPhone:
            currentNormalizedVisit.customerPhone ||
            editingCustomer.phone ||
            prev.customerPhone,

          tags: finalTagLabels,
          serviceTags: finalTagLabels,
          summaryTags: finalTagLabels,
          visitTags: finalTagLabels,

          tagIds: finalVisitTagIds,
          visitTagIds: finalVisitTagIds,
          summaryTagIds: finalVisitTagIds,

          detail: {
            ...(prev.detail || {}),
            sections: cleanedSections,
            tags: finalTagLabels,
            tagIds: finalVisitTagIds,
          },
          summaryJson: updatedSummaryJson,
          summary_json: updatedSummaryJson,
        };
      });

      setEditingVisitTagIds(finalVisitTagIds);
    }

    // 3) 편집용 상태 리셋 + 화면 이동
    setTempResultData(null);
    setEditingVisit(null);
    setEditingCustomer(null);
    setEditingVisitTagIds([]);

    if (editingVisit) {
      // 고객 상세에서 온 경우 → 바로 고객 상세로 복귀 (중간 화면 없이)
      const currentCustomerId = editingCustomer?.id || editingVisit.customerId || editingVisit.customer_id;
      setSelectedCustomerId(currentCustomerId);
      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
    } else {
      // 녹음/키보드 요약에서 온 경우 → 다시 요약 결과
      console.log('[편집 저장] 기록 화면으로 이동');
      setCurrentScreen(SCREENS.RECORD);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#F2F0E6' }}
    >
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
            if (editingVisit) {
              setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
            } else {
              setCurrentScreen(SCREENS.RECORD);
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: '#232323' }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>

        {/* 가운데 타이틀 */}
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>
          기록 편집
        </h2>

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
            value={cleanTitle(tempResultData.title || '')}
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

        {/* 시술 태그 편집 섹션 */}
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

            {/* 태그 칩들 */}
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
                      onClick={() => {
                        setEditingVisitTagIds(prev =>
                          prev.filter(id => id !== tag.id)
                        );
                      }}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-transform duration-150 bg-[#C9A27A] text-white shadow-sm hover:opacity-90 active:scale-95 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#C9A27A]"
                      aria-label={`${tag.label} 태그 삭제`}
                      title="태그 삭제"
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

          let displayContent = section.content;
          if (isCustomerInfoSection && editingCustomer) {
            const customerName = editingCustomer.name || '';
            const customerPhone = editingCustomer.phone || '';

            displayContent = [];
            if (customerName && customerName !== '이름 미입력') {
              displayContent.push(`이름: ${customerName}`);
            }
            if (customerPhone && customerPhone !== '전화번호 미기재') {
              displayContent.push(`전화번호: ${customerPhone}`);
            }
            (section.content || []).forEach(item => {
              const itemStr =
                typeof item === 'string' ? item : String(item || '');
              if (
                itemStr &&
                !itemStr.includes('이름:') &&
                !itemStr.includes('전화번호:') &&
                !itemStr.includes('name:') &&
                !itemStr.includes('phone:')
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
                {(displayContent || []).map((item, contentIndex) => {
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
                  const isProtectedSection =
                    isCustomerBasicInfo || isVisitInfo;

                  let showDeleteButton = false;
                  if (isProtectedSection) {
                    if (isCustomerBasicInfo) {
                      showDeleteButton = contentIndex >= 2;
                    } else if (isVisitInfo) {
                      showDeleteButton = contentIndex >= 1;
                    }
                  } else {
                    showDeleteButton =
                      Array.isArray(displayContent) &&
                      displayContent.length > 1;
                  }

                  const isReadOnly =
                    isCustomerBasicInfo &&
                    (contentIndex === 0 || contentIndex === 1);

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
                          if (isReadOnly) return;

                          if (isCustomerInfoSection) {
                            if (contentIndex >= 2) {
                              const originalIndex = contentIndex - 2;
                              if (
                                originalIndex <
                                (section.content || []).length
                              ) {
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
                                  if (
                                    !Array.isArray(
                                      updated.sections[sectionIndex].content
                                    )
                                  ) {
                                    updated.sections[sectionIndex].content = [];
                                  }
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
                          e.target.style.height =
                            e.target.scrollHeight + 'px';
                        }}
                        onInput={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height =
                            e.target.scrollHeight + 'px';
                        }}
                        onFocus={e => {
                          e.target.style.height = 'auto';
                          e.target.style.height =
                            e.target.scrollHeight + 'px';
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

                  setVisits(prev => {
                    const updated = { ...prev };
                    if (updated[customerId]) {
                      const remainingVisits = updated[customerId].filter(
                        v => v.id !== visitId
                      );
                      updated[customerId] =
                        remainingVisits.length > 0 ? remainingVisits : [];

                      setCustomers(prevCustomers =>
                        prevCustomers.map(c => {
                          if (c.id === customerId) {
                            return {
                              ...c,
                              visitCount: remainingVisits.length,
                              lastVisit:
                                remainingVisits.length > 0
                                  ? remainingVisits[0].date
                                  : null
                            };
                          }
                          return c;
                        })
                      );
                    }
                    try {
                      localStorage.setItem(
                        'visits',
                        JSON.stringify(updated)
                      );
                    } catch (e) {
                      console.warn(
                        '[전체 삭제] localStorage(visits) 저장 실패:',
                        e
                      );
                    }
                    return updated;
                  });

                  setTempResultData(null);
                  setEditingVisit(null);
                  setEditingCustomer(null);
                  setEditingVisitTagIds([]);

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
          onChangeSelected={nextSelected =>
            setEditingVisitTagIds(nextSelected)
          }
        />
      )}
    </div>
  );
}

export default EditScreen;
