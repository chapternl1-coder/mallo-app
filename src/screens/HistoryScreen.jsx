import React from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRecordDateTime } from '../utils/date';
import { SCREENS } from '../constants/screens';

function HistoryScreen({
  allRecords,
  selectedDate,
  setSelectedDate,
  currentTheme,
  setCurrentScreen,
  setSelectedCustomerId,
  setEditingVisit,
  setEditingCustomer,
  // 추가로 필요한 props들
  customers,
  getTodayDateString,
  extractServiceDateFromSummary,
  extractServiceDateTimeLabel,
  formatRecordDateTime,
  setActiveTab,
  expandedHistoryIds,
  setExpandedHistoryIds
}) {
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

  // 오늘 날짜 구하기
  const todayStr = getTodayDateString();

  // 날짜 필터링 (serviceDate 우선, 없으면 detail.sections에서 파싱, 그래도 없으면 date 사용)
  const filteredRecords = selectedDate 
    ? allRecords.filter(record => {
        let baseDate = record.serviceDate;
        if (!baseDate && record.detail && record.detail.sections) {
          const visitData = { sections: record.detail.sections };
          baseDate = extractServiceDateFromSummary(visitData);
        }
        baseDate = baseDate || record.date;
        return baseDate === selectedDate;
      })
    : allRecords;

  // 날짜와 시간순 정렬 (serviceDate 우선, 없으면 detail.sections에서 파싱, 그래도 없으면 date 사용)
  filteredRecords.sort((a, b) => {
    let baseDateA = a.serviceDate;
    if (!baseDateA && a.detail && a.detail.sections) {
      const visitDataA = { sections: a.detail.sections };
      baseDateA = extractServiceDateFromSummary(visitDataA);
    }
    baseDateA = baseDateA || a.date;
    
    let baseDateB = b.serviceDate;
    if (!baseDateB && b.detail && b.detail.sections) {
      const visitDataB = { sections: b.detail.sections };
      baseDateB = extractServiceDateFromSummary(visitDataB);
    }
    baseDateB = baseDateB || b.date;
    
    const isAToday = baseDateA === todayStr;
    const isBToday = baseDateB === todayStr;
    
    // 오늘 날짜가 항상 맨 위
    if (isAToday && !isBToday) return -1;
    if (!isAToday && isBToday) return 1;
    
    // 날짜 비교
    const dateA = new Date(baseDateA);
    const dateB = new Date(baseDateB);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime(); // 최신 날짜가 먼저
    }
    // 같은 날짜면 시간 비교
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    if (timeA[0] !== timeB[0]) return timeB[0] - timeA[0];
    return timeB[1] - timeA[1];
  });

  // 날짜 포맷팅 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  };

  // 테마 색상 사용 (currentTheme이 없으면 기본값 사용)
  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  return (
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm h-[100px]">
        <button 
          onClick={() => {
            setActiveTab('Home');
            setCurrentScreen(SCREENS.HOME);
          }}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: textColor }}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold" style={{ color: textColor }}>전체 기록</h2>
          {selectedDate && (
            <p className="text-xs font-light mt-1" style={{ color: textColor, opacity: 0.6 }}>
              {formatDate(selectedDate)} 기록
            </p>
          )}
        </div>
        <div className="w-10"></div> {/* 공간 맞추기용 */}
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-4 pb-8" style={{ backgroundColor: bgColor }}>
        {/* 날짜 필터 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} style={{ color: accentColor }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:ring-1 focus:ring-[#C9A27A] outline-none transition-all text-sm"
              style={{ color: textColor, backgroundColor: '#FFFFFF' }}
            />
            {selectedDate && (
              <button
                onClick={() => {
                  setSelectedDate(getTodayDateString()); // 전체가 아닌 오늘 날짜로 초기화
                }}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ color: textColor }}
              >
                오늘
              </button>
            )}
          </div>
        </div>

        {/* 전체 시술 기록 */}
        <div className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: textColor }}>
            <span>📅</span>
            <span>{selectedDate ? formatDate(selectedDate) + ' 기록' : '전체 시술 기록'}</span>
          </h3>
          
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="font-light text-base" style={{ color: textColor, opacity: 0.6 }}>
                {selectedDate ? '해당 날짜의 시술 기록이 없습니다' : '시술 기록이 없습니다'}
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              // summary 텍스트에서 고객 정보 추출하는 helper 함수
              const extractCustomerInfoFromSummary = (summary) => {
                if (!summary) return { name: undefined, phone: undefined };

                let name;
                let phone;

                // "이름: ○○○" 패턴 찾기 (뒤에 "/" 또는 줄끝까지)
                const nameMatch = summary.match(/이름:\s*([^\/\n]+?)(?:\s*\/|$|\n)/);
                if (nameMatch && nameMatch[1]) {
                  name = nameMatch[1].trim();
                  // "미기재", "null" 제거
                  if (name === '미기재' || name === 'null' || name.toLowerCase() === 'null' || !name) {
                    name = undefined;
                  }
                }

                // "전화번호: 010-0000-0000" 또는 "전화번호: null" 패턴 찾기
                // 더 유연한 패턴: 전화번호 뒤에 "/", 줄바꿈, 또는 다른 필드가 올 수 있음
                const phoneMatch = summary.match(/전화번호:\s*([^\n\/]+?)(?:\s*\/|\s*$|\s*\n|\s*구분)/);
                if (phoneMatch && phoneMatch[1]) {
                  const phoneValue = phoneMatch[1].trim();
                  // "미기재", "null"이 아니고 숫자가 포함된 경우만 사용
                  if (phoneValue && 
                      phoneValue !== '미기재' && 
                      phoneValue !== 'null' && 
                      phoneValue.toLowerCase() !== 'null' &&
                      /[0-9]/.test(phoneValue)) {
                    phone = phoneValue;
                  }
                }

                return { name, phone };
              };

              // 고객 정보 찾기
              const customer = customers.find(c => c.id === record.customerId);
              const visitCount = customer?.visitCount || 0;
              
              // 신규/기존 구분 (방문 횟수가 1이면 신규, 아니면 기존)
              const status = visitCount === 1 ? '신규' : null;
              
              // summary 텍스트 수집 (record.detail.sections에서 "고객 기본 정보" 섹션 찾기)
              let summaryText = '';
              if (record.detail && record.detail.sections) {
                const customerInfoSection = record.detail.sections.find(
                  section => section.title === '고객 기본 정보' || section.title?.includes('고객 기본')
                );
                if (customerInfoSection && customerInfoSection.content) {
                  // content 배열의 각 항목을 하나의 문자열로 합치기
                  summaryText = customerInfoSection.content.join(' ');
                }
              }
              // fallback: record.summary나 record.title 사용
              if (!summaryText) {
                summaryText = record.summary || record.title || '';
              }

              // summary에서 고객 정보 추출
              const { name: extractedName, phone: extractedPhone } = 
                extractCustomerInfoFromSummary(summaryText);

              // displayName 계산 (우선순위: record.customerName > customer.name > extractedName > '이름 미기재')
              const displayName = 
                record.customerName || 
                customer?.name || 
                extractedName || 
                '이름 미기재';

              // displayPhone 계산 (우선순위: customer.phone > extractedPhone > 가짜 번호)
              let displayPhone = null;
              if (customer?.phone && customer.phone !== 'null' && customer.phone.toLowerCase() !== 'null') {
                displayPhone = customer.phone;
              } else if (extractedPhone && extractedPhone !== 'null' && extractedPhone.toLowerCase() !== 'null') {
                displayPhone = extractedPhone;
              } else {
                // 가짜 번호 생성 (010-xxxx-xxxx 형식)
                const fakePhone = `010-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                displayPhone = fakePhone;
              }

              // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
              const formatDateShort = (dateStr) => {
                if (!dateStr) return '';
                const [year, month, day] = dateStr.split('-');
                return `${year}.${month}.${day}`;
              };
              
              // 시간 포맷팅 (HH:mm -> 오전/오후 HH:mm)
              const formatTimeDisplay = (timeStr) => {
                if (!timeStr) return '';
                // HH:mm:ss 또는 HH:mm 형식 모두 처리
                const parts = timeStr.split(':');
                const hour = parts[0];
                const minute = parts[1] || '00';
                const second = parts[2] || '00'; // 초 포함
                const hourNum = parseInt(hour);
                const period = hourNum >= 12 ? '오후' : '오전';
                const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
                // HH:mm:ss 형식이면 초도 표시, 아니면 HH:mm만 표시
                if (parts.length >= 3 && second !== '00') {
                  return `${period} ${displayHour}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
                }
                return `${period} ${displayHour}:${minute.padStart(2, '0')}`;
              };

              // 날짜/시간 통합 포맷팅
              const formatDateTime = (dateStr, timeStr) => {
                const date = formatDateShort(dateStr);
                const time = formatTimeDisplay(timeStr);
                return `${date} · ${time}`;
              };

              // serviceDate 우선 사용, 없으면 date 사용 (날짜 표시용)
              let baseDate = record.serviceDate;
              if (!baseDate && record.detail && record.detail.sections) {
                const visitData = {
                  sections: record.detail.sections
                };
                baseDate = extractServiceDateFromSummary(visitData);
              }
              baseDate = baseDate || record.date;
              
              // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
              const displayDate = formatDateShort(baseDate);
              
              // serviceDateTimeLabel 생성
              const serviceDateTimeLabel = extractServiceDateTimeLabel(record);
              
              // 전체 기록 화면에서는 시간 부분만 잘라서 사용 (HH:MM 예약)
              const reservationTimeLabel = serviceDateTimeLabel 
                ? (() => {
                    // "2025-12-27 17:30 방문/예약" -> "17:30 예약"
                    const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
                    if (timeMatch) {
                      const [, hh, mm] = timeMatch;
                      return `${hh}:${mm} 예약`;
                    }
                    return '';
                  })()
                : '';
              
              // 고객 상세 페이지로 이동 핸들러
              const handleCustomerClick = (record) => {
                if (!record || !record.customerId) return;
                setSelectedCustomerId(record.customerId);
                setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
              };

              // 기록 상세 펼치기/접기 핸들러
              const handleRecordClick = (record) => {
                const newExpanded = new Set(expandedHistoryIds);
                if (newExpanded.has(record.id)) {
                  newExpanded.delete(record.id);
                } else {
                  newExpanded.add(record.id);
                }
                setExpandedHistoryIds(newExpanded);
              };

              return (
                <div key={record.id} className="record-card bg-white rounded-xl shadow-sm">
                  <div className="record-card-main flex flex-col relative">
                    {/* 상단 정보: 시간과 고객 정보 */}
                    <div 
                      className="flex flex-col items-start relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordClick(record);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 윗줄: 시간 */}
                      {reservationTimeLabel && (
                        <div className="mb-1">
                          <span className="text-xs font-bold" style={{ color: accentColor }}>
                            {reservationTimeLabel}
                          </span>
                        </div>
                      )}
                      {/* 아랫줄: 이름과 전화번호 */}
                      {displayName && displayName !== '이름 미기재' && (
                        <div className="flex flex-row items-center">
                          <button
                            type="button"
                            style={{ padding: 0, margin: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(record);
                            }}
                          >
                            <span className="text-lg font-bold" style={{ color: textColor }}>{displayName}</span>
                          </button>
                          {/* 번호 */}
                          {displayPhone && displayPhone !== '전화번호 미기재' && (
                            <span className="ml-2 text-xs text-gray-400">
                              / {displayPhone}
                            </span>
                          )}
                        </div>
                      )}
                      {/* 화살표 아이콘 (우측 끝) */}
                      <button 
                        className="absolute right-0 top-0" 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordClick(record);
                        }}
                      >
                        {expandedHistoryIds.has(record.id) ? (
                          <ChevronUp size={20} style={{ color: accentColor }} />
                        ) : (
                          <ChevronDown size={20} style={{ color: accentColor }} />
                        )}
                      </button>
                    </div>

                    {/* 태그 리스트: 이름/번호 아래, 시술 내용 위 */}
                    {record.tags && record.tags.length > 0 && (
                      <div className="mt-1.5 mb-1.5 max-h-[70px] overflow-hidden flex flex-wrap gap-1.5">
                        {record.tags.map((tag, idx) => (
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
                        handleRecordClick(record);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="text-sm font-medium truncate" style={{ color: textColor, opacity: 0.8 }}>
                        {(() => {
                          // title에서 고객 이름과 '기존 고객', '신규 고객' 텍스트 제거
                          let cleanedTitle = record.title || '';
                          if (cleanedTitle) {
                            // 고객 이름 제거
                            if (displayName && displayName !== '이름 미기재') {
                              cleanedTitle = cleanedTitle.replace(new RegExp(displayName, 'g'), '').trim();
                            }
                            // '기존 고객', '신규 고객' 등 제거
                            cleanedTitle = cleanedTitle.replace(/기존\s*고객/gi, '').trim();
                            cleanedTitle = cleanedTitle.replace(/신규\s*고객/gi, '').trim();
                            // 연속된 공백 정리
                            cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();
                          }
                          return cleanedTitle || record.title || '';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Accordion 상세 내용 */}
                  {expandedHistoryIds.has(record.id) && record.detail && (
                    <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50" style={{ marginTop: '16px' }}>
                      {record.detail.sections.map((section, idx) => {
                        // 고객 정보 준비 (record.customer 또는 customer 객체 사용)
                        const customerInfoForOverride = record.customer || customer || {
                          name: displayName !== '이름 미기재' ? displayName : undefined,
                          phone: displayPhone !== '전화번호 미기재' ? displayPhone : undefined
                        };
                        
                        return (
                          <div key={idx}>
                            <h5 className="text-base font-bold mb-3" style={{ color: textColor }}>
                              {section.title}
                            </h5>
                            <ul className="space-y-2">
                              {section.content.map((item, i) => (
                                <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: textColor, borderLeft: '2px solid #E5E7EB' }}>
                                  {overrideCustomerInfoLine(item, customerInfoForOverride)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      
                      {/* 기록 일시 (카드 하단) */}
                      {(() => {
                        const recordedAt = record.recordedAt || record.createdAt || (record.date && record.time ? `${record.date}T${record.time}:00` : null);
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
        </div>
      </main>
    </div>
  );
}

export default HistoryScreen;
