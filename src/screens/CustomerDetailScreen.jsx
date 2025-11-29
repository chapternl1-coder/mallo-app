import React from 'react';
import { ArrowLeft, MoreHorizontal, Phone, Edit, Mic, ChevronUp, ChevronDown } from 'lucide-react';
import { formatRecordDateTime, formatServiceDateTimeLabel } from '../utils/date';

function CustomerDetailScreen({
  currentScreen,
  setCurrentScreen,
  selectedCustomerId,
  customers,
  setCustomers,
  visits,
  visibleVisitCount,
  setVisibleVisitCount,
  expandedVisitId,
  setExpandedVisitId,
  setEditCustomerName,
  setEditCustomerPhone,
  setEditCustomerTags,
  setEditCustomerMemo,
  setNewTag,
  setEditCustomerTagIds,
  allCustomerTags,
  allVisitTags,
  extractServiceDateTimeLabel,
  normalizeRecordWithCustomer,
  setTempResultData,
  setEditingVisit,
  setEditingCustomer,
  setEditingVisitTagIds,
  setSelectedCustomerForRecord,
  startRecording,
  MOCK_CUSTOMERS
}) {
  // customers 배열에서 고객 찾기
  let customer = customers.find(c => c.id === selectedCustomerId);
  
  // customers 배열에 없으면 MOCK_CUSTOMERS에서 직접 찾기
  if (!customer) {
    console.log('customers 배열에 고객이 없어서 MOCK_CUSTOMERS에서 찾는 중...');
    const mockCustomer = MOCK_CUSTOMERS.find(c => c.id === selectedCustomerId);
    if (mockCustomer) {
      console.log('MOCK_CUSTOMERS에서 찾은 고객:', mockCustomer);
      customer = { 
        ...mockCustomer, 
        tags: (mockCustomer.tags || []).filter(tag => tag !== '#신규'),
        customerTags: mockCustomer.customerTags || {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        }
      };
      // customers 배열에 추가 (useEffect로 처리)
      setTimeout(() => {
        setCustomers(prev => {
          if (!prev.find(c => c.id === selectedCustomerId)) {
            return [...prev, customer];
          }
          return prev;
        });
      }, 0);
    }
  }
  
  // customerTags가 없으면 기본 구조 추가
  if (customer && !customer.customerTags) {
    customer = {
      ...customer,
      customerTags: {
        caution: [],
        trait: [],
        payment: [],
        pattern: []
      }
    };
  }
  
  const customerVisits = visits[selectedCustomerId] || [];
  
  console.log('CustomerDetailScreen - 최종 찾은 고객:', customer);
  console.log('CustomerDetailScreen - customer.customerTags:', customer?.customerTags);
  console.log('CustomerDetailScreen - customerVisits:', customerVisits);
  console.log('CustomerDetailScreen - 첫 번째 방문 tags:', customerVisits[0]?.tags);

  if (!customer) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p style={{ color: '#232323' }}>고객 정보를 찾을 수 없습니다.</p>
        <button onClick={() => setCurrentScreen('History')} className="mt-4 font-medium" style={{ color: '#232323' }}>히스토리로 돌아가기</button>
      </div>
    );
  }

  // 더 보기 함수
  const handleLoadMoreVisits = () => {
    setVisibleVisitCount((prev) => Math.min(prev + 10, customerVisits.length));
  };

  // 접기 함수
  const handleCollapseVisits = () => {
    setVisibleVisitCount(10);
  };

  // "미기재"와 "null"을 실제 고객 정보로 치환하는 helper 함수
  const overrideCustomerInfoLine = (line, customerInfo) => {
    if (!line) return line;
    
    let updated = line;

    // 이름이 미기재나 null로 되어있으면 실제 이름으로 교체
    if (customerInfo?.name) {
      updated = updated.replace(/이름:\s*미기재/g, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름\s*:\s*미기재/g, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름:\s*null/gi, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름\s*:\s*null/gi, `이름: ${customerInfo.name}`);
    }

    // 전화번호가 미기재나 null로 되어있으면 실제 전화번호로 교체
    if (customerInfo?.phone) {
      updated = updated.replace(/전화번호:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
      updated = updated.replace(/전화번호\s*:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
      updated = updated.replace(/전화번호:\s*null/gi, `전화번호: ${customerInfo.phone}`);
      updated = updated.replace(/전화번호\s*:\s*null/gi, `전화번호: ${customerInfo.phone}`);
    }

    return updated;
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button onClick={() => setCurrentScreen('History')} className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" style={{ color: '#232323' }}>
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <span className="text-xs font-medium" style={{ color: '#232323', opacity: 0.7 }}>고객 상세</span>
          <h2 className="font-bold text-base mt-1" style={{ color: '#232323' }}>{customer.name}</h2>
        </div>
        <button className="p-2" style={{ color: '#232323', opacity: 0.5 }}>
          <MoreHorizontal size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-32">
        {/* 고객 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative">
          {/* 편집 버튼 */}
          <button
            onClick={() => {
              setEditCustomerName(customer.name || '');
              setEditCustomerPhone(customer.phone || '');
              setEditCustomerTags([...(customer.tags || [])]);
              setEditCustomerMemo(customer.memo || '');
              setNewTag('');
              
              // 고객 특징 태그를 ID 배열로 변환하여 로드
              const customerTags = customer.customerTags || {};
              const tagLabels = [];
              Object.values(customerTags).forEach(categoryTags => {
                if (Array.isArray(categoryTags)) {
                  categoryTags.forEach(tag => {
                    const label = typeof tag === 'string' ? tag : tag.label || tag;
                    tagLabels.push(label);
                  });
                }
              });
              const tagIds = tagLabels
                .map(label => {
                  const tag = allCustomerTags.find(t => t.label === label);
                  return tag ? tag.id : null;
                })
                .filter(id => id !== null);
              setEditCustomerTagIds(tagIds);
              
              setCurrentScreen('EditCustomer');
            }}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: '#C9A27A' }}
            title="편집"
          >
            <Edit size={20} />
          </button>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-2xl" style={{ color: '#232323' }}>{customer.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100" style={{ color: '#232323' }}>
                  {customer.visitCount}회방문
                </span>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 font-light" style={{ color: '#232323' }}>
                  <Phone size={18} style={{ color: '#C9A27A' }} />
                  <span>{customer.phone}</span>
                </div>
              </div>
              {/* customerTags 표시 (주의 태그가 맨 앞) */}
              {(() => {
                const customerTags = customer.customerTags || {};
                console.log('CustomerDetailScreen - customerTags:', customerTags);
                const allTags = [];
                
                // 방문 횟수 확인 (2 이상이면 "신규" 제거하고 "기존" 추가)
                const visitCount = customer.visitCount || 0;
                const shouldReplaceNewWithExisting = visitCount >= 2;
                
                // 주의 태그 먼저 추가
                if (customerTags.caution && customerTags.caution.length > 0) {
                  customerTags.caution.forEach(tag => {
                    allTags.push({ tag, type: 'caution' });
                  });
                }
                
                // 나머지 태그 추가
                if (customerTags.trait && customerTags.trait.length > 0) {
                  customerTags.trait.forEach(tag => {
                    allTags.push({ tag, type: 'trait' });
                  });
                }
                if (customerTags.payment && customerTags.payment.length > 0) {
                  customerTags.payment.forEach(tag => {
                    allTags.push({ tag, type: 'payment' });
                  });
                }
                if (customerTags.pattern && customerTags.pattern.length > 0) {
                  customerTags.pattern.forEach(tag => {
                    // 방문 횟수가 2 이상이면 "신규" 태그는 제외하고 "기존" 태그 추가
                    if (shouldReplaceNewWithExisting && tag === '신규') {
                      // "신규" 태그는 건너뛰고 "기존" 태그가 없으면 추가
                      if (!customerTags.pattern.includes('기존')) {
                        allTags.push({ tag: '기존', type: 'pattern' });
                      }
                    } else {
                      allTags.push({ tag, type: 'pattern' });
                    }
                  });
                }
                
                // 방문 횟수가 2 이상이고 "기존" 태그가 없으면 추가
                if (shouldReplaceNewWithExisting && (!customerTags.pattern || !customerTags.pattern.includes('기존'))) {
                  // "신규" 태그가 이미 필터링되었는지 확인
                  const hasNewTag = customerTags.pattern && customerTags.pattern.includes('신규');
                  if (!hasNewTag || allTags.find(t => t.tag === '기존')) {
                    // 이미 "기존" 태그가 추가되었거나 "신규" 태그가 없으면 추가하지 않음
                  } else {
                    allTags.push({ tag: '기존', type: 'pattern' });
                  }
                }
                
                console.log('CustomerDetailScreen - allTags:', allTags);
                
                if (allTags.length === 0) return null;
                
                return (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allTags.map((item, idx) => {
                      const isCaution = item.type === 'caution';
                      return (
                        <span
                          key={idx}
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            isCaution 
                              ? 'bg-red-50 text-red-600 border border-red-100' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isCaution && <span>⚠️</span>}
                          {item.tag}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
              {/* 메모 */}
              {customer.memo && customer.memo.trim() && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium mb-2" style={{ color: '#232323', opacity: 0.7 }}>메모</p>
                  <p className="text-sm font-light leading-relaxed" style={{ color: '#232323' }}>{customer.memo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 방문 히스토리 */}
        <div className="space-y-4 pb-24">
          <h3 className="text-base font-bold" style={{ color: '#232323' }}>방문 히스토리</h3>
          {customerVisits.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>방문 기록이 없습니다</p>
            </div>
          ) : (
            customerVisits.slice(0, visibleVisitCount).map((visit) => {
              // record + customer를 합쳐서 사용 (customerName, customerPhone 보정)
              const normalizedVisit = normalizeRecordWithCustomer(visit, customer);
              const safeName = normalizedVisit.customerName || '미기재';
              const safePhone = normalizedVisit.customerPhone || '미기재';

              // 날짜/시간 정보 준비
              const serviceDateTimeLabel = extractServiceDateTimeLabel(visit);
              let dateTimeDisplay = '';
              if (serviceDateTimeLabel) {
                // "2025-12-27 17:30 방문/예약" -> "2025.12.27 17:30"
                const dateTimeMatch = serviceDateTimeLabel.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
                if (dateTimeMatch) {
                  const [, year, month, day, hour, minute] = dateTimeMatch;
                  dateTimeDisplay = `${year}.${month}.${day} ${hour}:${minute}`;
                } else {
                  // fallback: recordedAt 사용
                  const recordedAt = visit.recordedAt || visit.createdAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
                  if (recordedAt) {
                    dateTimeDisplay = formatRecordDateTime(recordedAt);
                  }
                }
              } else {
                // serviceDateTimeLabel이 없으면 recordedAt 사용
                const recordedAt = visit.recordedAt || visit.createdAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
                if (recordedAt) {
                  dateTimeDisplay = formatRecordDateTime(recordedAt);
                }
              }

              // 시술 내용 요약 (고객 이름 제거)
              const cleanTitle = (title) => {
                if (!title) return title;
                let cleaned = title;
                // 고객 이름 제거
                if (safeName && safeName !== '미기재') {
                  cleaned = cleaned.replace(new RegExp(safeName, 'g'), '').trim();
                }
                // '기존 고객', '신규 고객' 등 제거
                cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
                cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
                // 연속된 공백 정리
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                return cleaned || title || '';
              };

              const displayTitle = cleanTitle(visit.title || visit.subject || visit.summary || '');

              return (
                <div key={visit.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative" style={{ padding: '12px 16px' }}>
                  <div className="record-card-main flex flex-col relative">
                    {/* 맨 위줄: 날짜/시간 */}
                    {dateTimeDisplay && (
                      <div 
                        className="mb-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="text-xs font-bold text-[#C9A27A]">
                          {dateTimeDisplay}
                        </span>
                      </div>
                    )}
                    
                    {/* 두 번째 줄: 이름, 번호 */}
                    <div 
                      className="flex flex-row items-center justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 이름 */}
                      {safeName && safeName !== '미기재' && (
                        <>
                          <span className="text-base font-bold text-[#232323]">{safeName}</span>
                          {/* 번호 */}
                          {safePhone && safePhone !== '미기재' && (
                            <span className="ml-2 text-xs text-gray-400">
                              / {safePhone}
                            </span>
                          )}
                        </>
                      )}
                      {/* 편집 버튼 */}
                      <button
                        type="button"
                        className="absolute right-8 top-0 visit-summary-edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 편집 화면으로 이동 (visit과 customer 함께 전달)
                          // "고객 기본 정보" 섹션의 첫 번째 줄을 보정된 값으로 업데이트
                          const sections = normalizedVisit.detail?.sections || [];
                          const basicInfoSectionIndex = sections.findIndex(
                            section => section.title && section.title.includes('고객 기본 정보')
                          );
                          
                          if (basicInfoSectionIndex !== -1 && sections[basicInfoSectionIndex].content.length > 0) {
                            const firstLine = `이름: ${safeName} / 전화번호: ${safePhone}`;
                            sections[basicInfoSectionIndex] = {
                              ...sections[basicInfoSectionIndex],
                              content: [
                                firstLine,
                                ...sections[basicInfoSectionIndex].content.slice(1)
                              ]
                            };
                          }
                          
                          const editData = {
                            title: normalizedVisit.title,
                            sections: sections
                          };
                          setTempResultData(editData);
                          setEditingVisit(normalizedVisit);
                          setEditingCustomer(customer);
                          
                          // 편집 중인 방문의 태그를 ID 배열로 변환
                          const visitTagLabels = normalizedVisit.tags || [];
                          const visitTagIds = visitTagLabels
                            .map(label => {
                              const tag = allVisitTags.find(t => t.label === label);
                              return tag ? tag.id : null;
                            })
                            .filter(id => id !== null);
                          setEditingVisitTagIds(visitTagIds);
                          
                          setCurrentScreen('Edit');
                        }}
                      >
                        <Edit size={18} />
                      </button>
                      {/* 화살표 아이콘 (우측 끝) */}
                      <button 
                        className="absolute right-0 top-0" 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                        }}
                      >
                        {expandedVisitId === visit.id ? (
                          <ChevronUp size={20} style={{ color: '#C9A27A' }} />
                        ) : (
                          <ChevronDown size={20} style={{ color: '#C9A27A' }} />
                        )}
                      </button>
                    </div>

                    {/* 태그 리스트: 이름/번호 아래, 시술 내용 위 */}
                    {visit.tags && visit.tags.length > 0 && (
                      <div className="mt-1.5 mb-1.5 max-h-[70px] overflow-hidden flex flex-wrap gap-1.5">
                        {visit.tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="text-[11px] px-2 py-1 rounded-md"
                            style={{ 
                              backgroundColor: '#F2F0E6',
                              color: '#8C6D46'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 아랫줄: 시술 내용 */}
                    <div 
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="text-sm text-[#232323]/80 font-medium truncate">
                        {displayTitle}
                      </div>
                    </div>
                  </div>
                  
                  {expandedVisitId === visit.id && normalizedVisit.detail && (
                    <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50">
                      {normalizedVisit.detail.sections.map((section, idx) => {
                        // "고객 기본 정보" 섹션의 첫 번째 줄을 보정된 값으로 표시
                        let displayContent = section.content;
                        if (section.title && section.title.includes('고객 기본 정보') && section.content.length > 0) {
                          const firstLine = section.content[0];
                          if (firstLine && firstLine.includes('이름:')) {
                            displayContent = [
                              `이름: ${safeName} / 전화번호: ${safePhone}`,
                              ...section.content.slice(1)
                            ];
                          }
                        }
                        
                        return (
                          <div key={idx}>
                            <h5 className="text-base font-bold mb-3" style={{ color: '#232323' }}>
                              {section.title}
                            </h5>
                            <ul className="space-y-2">
                              {displayContent.map((item, i) => (
                                <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>
                                  {overrideCustomerInfoLine(item, customer)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      
                      {/* 기록 일시 (카드 하단) */}
                      {(() => {
                        const recordedAt = visit.recordedAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
                        return recordedAt ? (
                          <div className="visit-detail-footer">
                            기록 일시: {formatRecordDateTime(recordedAt)}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
          
          {/* 이전 기록 더 보기 / 접기 버튼 */}
          {(customerVisits.length > visibleVisitCount || visibleVisitCount > 10) && (
            <div className="flex justify-center mt-4 mb-20 gap-3">
              {customerVisits.length > visibleVisitCount && (
                <button
                  onClick={handleLoadMoreVisits}
                  className="px-4 py-2 text-sm rounded-full border border-[#C9A27A] text-[#C9A27A] bg-white/90 shadow-sm hover:bg-[#C9A27A] hover:text-white transition-colors min-w-[180px]"
                >
                  이전 기록 10건 더 보기
                </button>
              )}
              {visibleVisitCount > 10 && (
                <button
                  onClick={handleCollapseVisits}
                  className="px-4 py-2 text-sm rounded-full border border-[#C9A27A] text-[#C9A27A] bg-white/90 shadow-sm hover:bg-[#C9A27A] hover:text-white transition-colors min-w-[180px]"
                >
                  접기
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 하단 고정 버튼: 새 기록 남기기 */}
      <div className="absolute bottom-8 left-8 right-8 z-30">
        <button 
          onClick={() => {
            setSelectedCustomerForRecord(customer);
            startRecording();
          }}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-medium text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#C9A27A' }}
        >
          <Mic size={20} />
          <span>이 고객에 대해 새 기록 남기기</span>
        </button>
      </div>
    </div>
  );
}

export default CustomerDetailScreen;

