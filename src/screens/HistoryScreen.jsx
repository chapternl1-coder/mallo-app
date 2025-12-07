// src/screens/HistoryScreen.jsx
import React, { useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRecordDateTime } from '../utils/date';
import { SCREENS } from '../constants/screens';

// UUID 검증 헬퍼 함수
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

// Supabase visit_logs row를 카드용 데이터로 변환하는 함수
function buildVisitCardFromSupabaseRow(row, customers, reservations) {
  // normalized 형태 (useVisitLogs에서 변환된 형태) 또는 원본 Supabase row 형태 모두 처리
  const customerId = row.customer_id ?? row.customerId ?? null;
  const reservationId = row.reservation_id ?? row.reservationId ?? null;
  
  const customer =
    customerId ? customers.find((c) => c.id === customerId) || null : null;
  const reservation =
    reservationId ? reservations.find((r) => r.id === reservationId) || null : null;

  // 날짜 키 (YYYY-MM-DD) – service_date 또는 serviceDate 모두 처리
  const dateKey = row.service_date || row.serviceDate || '';

  // 시간 라벨 – service_time 또는 time 모두 처리
  const timeLabel =
    row.service_time || row.time || reservation?.time || '';

  // 이름/전화번호 – customer → reservation → summary_json 순으로 채우기
  const summaryJson = row.summary_json || row.detail || {};
  const customerName =
    customer?.name ||
    reservation?.name ||
    summaryJson?.customer?.name ||
    '이름 미입력';

  const customerPhone =
    customer?.phone ||
    reservation?.phone ||
    summaryJson?.customer?.phone ||
    '';

  return {
    id: row.id,
    dateKey: String(dateKey),
    timeLabel: String(timeLabel),
    customerId,
    reservationId,
    customerName,
    customerPhone,
    title: row.title || '',
    summarySections: summaryJson?.sections || summaryJson?.content || [],
    // 기존 필드들도 유지 (하위 호환성)
    detail: summaryJson,
    serviceDate: dateKey,
    time: timeLabel,
  };
}

function HistoryScreen({
  allRecords,
  visitLogs = [],   // ← Supabase에서 온 visit_logs
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
  setExpandedHistoryIds,
  reservations,
  visits  // 기존 로컬 visits (하위 호환성)
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

  // 예약과 연결된 방문 기록인지 확인하는 헬퍼 함수
  const findConnectedReservation = (record) => {
    if (!reservations || reservations.length === 0) return null;

    // Supabase + 기존 양쪽 다 대응
    const recordCustomerId = record.customerId ?? record.customer_id;

    // 1순위: reservationId로 찾기
    if (record.reservationId) {
      const matchedReservation = reservations.find(r => r.id === record.reservationId);
      if (matchedReservation) return matchedReservation;
    }

    // 2순위: customerId + 날짜로 찾기
    if (recordCustomerId) {
      const recordDate = record.serviceDate || record.date;
      const matchedReservation = reservations.find(r => {
        const reservationCustomerId = r.customer_id ?? r.customerId;
        const customerIdMatch =
          reservationCustomerId &&
          (reservationCustomerId === recordCustomerId ||
           String(reservationCustomerId) === String(recordCustomerId));
        const dateMatch = recordDate && r.date && recordDate === r.date;
        return customerIdMatch && dateMatch;
      });
      if (matchedReservation) return matchedReservation;
    }

    return null;
  };

  // 선택된 날짜의 방문 기록 가져오기 (Supabase visit_logs 기준)
  const selectedDateKey = selectedDate || getTodayDateString();
  
  const recordsForSelectedDate = useMemo(() => {
    const dateKey = selectedDateKey; // 'YYYY-MM-DD'

    // Supabase 데이터가 있으면 그걸 우선 사용, 없으면 예전 로컬 visits 사용
    const source = (visitLogs && visitLogs.length > 0)
      ? visitLogs
      : (visits ? Object.values(visits).flat() : []);  // 기존 로컬 상태가 있다면 유지

    return source
      .filter(v => {
        // serviceDate 필드로 필터링
        const vDate = v.serviceDate || v.date || '';
        return vDate === dateKey;
      })
      .map(v => {
        // 고객 정보 매칭 (customerId로 customers 배열에서 찾기)
        const vCustomerId = v.customerId || v.customer_id;
        let customer = null;
        
        if (vCustomerId && customers && customers.length > 0) {
          customer = customers.find(c => {
            const cId = c.id;
            const vId = vCustomerId;
            // UUID 비교 (문자열로 변환해서 비교)
            return String(cId) === String(vId) || cId === vId;
          });
        }
        
        // customerName과 customerPhone 설정
        let customerName = customer?.name || v.customerName || null;
        let customerPhone = customer?.phone || v.customerPhone || null;
        
        // ✅ summary_json 기반으로 한 번 더 보정
        const summaryJson = v.summaryJson || v.detail || {};
        const summaryCustomer = summaryJson.customer || summaryJson.customerInfo || null;
        if (summaryCustomer) {
          const nameFromSummary = (summaryCustomer.name || '').trim();
          const phoneFromSummary = (summaryCustomer.phone || '').trim();

          if ((!customerName || customerName === '이름 미입력') && nameFromSummary && nameFromSummary !== '이름 미입력') {
            customerName = nameFromSummary;
          }

          if ((!customerPhone || customerPhone === '전화번호 미기재') && phoneFromSummary) {
            customerPhone = phoneFromSummary;
          }
        }
        
        return {
          id: v.id,
          type: 'visit',
          timeLabel: v.serviceTime || v.time || '--:--',
          customerName: customerName,
          customerPhone: customerPhone,
          title: v.title || '',
          summaryJson: summaryJson,
          reservationId: v.reservationId || v.reservation_id || null,
          customerId: vCustomerId || null,
          // 하위 호환성을 위한 필드들
          ...v,
        };
      })
      .sort((a, b) => {
        const ta = a.timeLabel || '';
        const tb = b.timeLabel || '';
        return ta.localeCompare(tb);
      });
  }, [visitLogs, visits, selectedDateKey, customers]);

  // 날짜 필터링 (예약과 연결된 경우 예약 날짜 우선, 그 다음 텍스트/녹음에서 추출한 날짜, 없으면 저장된 날짜 사용)
  const filteredRecords = recordsForSelectedDate;

  // 시간 추출 헬퍼 함수 (예약과 연결된 경우 예약 시간 우선, 그 다음 텍스트/녹음에서 추출한 시간)
  const extractTimeFromRecord = (record) => {
    // 1순위: 예약과 연결된 경우 예약 시간 사용
    const connectedReservation = findConnectedReservation(record);
    if (connectedReservation && connectedReservation.time) {
      const timeStr = String(connectedReservation.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
      }
    }
    
    // 2순위: 텍스트/녹음에서 추출한 시간
    const serviceDateTimeLabel = extractServiceDateTimeLabel(record);
    if (serviceDateTimeLabel) {
      // "2025-12-27 17:30 방문/예약" -> "17:30" 추출
      const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const [, hh, mm] = timeMatch;
        return `${hh}:${mm}`;
      }
    }
    
    // 3순위: record.time 직접 사용 (저장된 시간)
    if (record.time) {
      const timeStr = String(record.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
      }
    }
    
    // fallback: 빈 문자열
    return '';
  };

  // 디버깅: 정렬 전 모든 기록의 시간 추출 확인
  if (filteredRecords.length > 0 && selectedDate) {
    console.log('[HistoryScreen 정렬 전] 날짜:', selectedDate, '필터링된 기록 수:', filteredRecords.length);
    filteredRecords.forEach((record, idx) => {
      const time = extractTimeFromRecord(record);
      const dateTimeLabel = extractServiceDateTimeLabel(record);
      console.log(`[HistoryScreen 정렬 전] ${idx + 1}번째: 시간=${time}, dateTimeLabel="${dateTimeLabel}", record.time="${record.time}", 제목="${record.title || record.id}"`);
    });
  }

  // recordsForSelectedDate는 이미 시간순으로 정렬되어 있으므로 그대로 사용
  const sortedRecords = recordsForSelectedDate;
  
  // 디버깅: 정렬 결과 확인
  if (sortedRecords.length > 0 && selectedDate) {
    console.log('[HistoryScreen 정렬] 날짜:', selectedDate, '총 기록 수:', sortedRecords.length);
    sortedRecords.forEach((record, idx) => {
      const time = extractTimeFromRecord(record);
      const dateTimeLabel = extractServiceDateTimeLabel(record);
      console.log(`[HistoryScreen 정렬] ${idx + 1}번째: 시간=${time}, dateTimeLabel="${dateTimeLabel}", 제목="${record.title || record.id}"`);
    });
  }

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

  const handleGoToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // 이전날로 이동
  const handlePreviousDay = () => {
    if (!selectedDate) {
      setSelectedDate(getTodayDateString());
      return;
    }
    const currentDate = new Date(selectedDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() - 1);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // 다음날로 이동
  const handleNextDay = () => {
    if (!selectedDate) {
      setSelectedDate(getTodayDateString());
      return;
    }
    const currentDate = new Date(selectedDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + 1);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // 날짜 라벨 포맷팅
  const selectedDateLabel = selectedDate ? formatDate(selectedDate) : '날짜 선택';

  // 페이지 진입 시 최상단으로 스크롤
  const mainRef = useRef(null);
  useEffect(() => {
    // window 스크롤 초기화
    window.scrollTo(0, 0);
    // main 요소 스크롤 초기화
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <div
      className="flex flex-col h-dvh bg-[#F2F0E6] font-sans"
      style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
    >
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 메인 내용 영역 */}
      <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 pt-5 pb-28">
          {/* 날짜 필터 */}
          <div className="bg-white rounded-2xl border border-[#E2D7C7] shadow-sm px-4 py-3 mb-4 relative">
            {/* 상단: 라벨 */}
            <div className="flex items-center mb-2">
              <span className="text-[11px] text-[#A59B90]">
                기록 날짜
              </span>
            </div>

            {/* 하단: 실제로는 input 이지만, 위에 UI만 얹어서 보이게 함 */}
            <div className="relative w-full">
              {/* 진짜 date input: 전체 영역을 덮고, 터치 이벤트를 받는 부분 */}
              <input
                type="date"
                value={selectedDate || ''}
                onChange={handleDateChange}
                className="absolute inset-0 w-full h-full opacity-0 z-0"
              />

              {/* 시각적인 UI: 기본은 pointer-events-none → 터치가 input 으로 통과됨 */}
              <div className="w-full flex items-center justify-between rounded-xl bg-[#F7F2EA] px-3 py-2 pointer-events-none relative z-10">
                {/* 왼쪽: 캘린더 아이콘 + 날짜 텍스트 양옆에 화살표 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-[#E2D7C7]">
                    <Calendar className="w-3.5 h-3.5 text-[#C9A27A]" strokeWidth={1.7} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviousDay();
                    }}
                    className="p-1 hover:bg-white/50 rounded-full transition-colors pointer-events-auto"
                    title="이전날"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#C9A27A]" strokeWidth={2} />
                  </button>
                  <span className="text-[13px] font-medium text-[#3E2E20]">
                    {selectedDateLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextDay();
                    }}
                    className="p-1 hover:bg-white/50 rounded-full transition-colors pointer-events-auto"
                    title="다음날"
                  >
                    <ChevronRight className="w-4 h-4 text-[#C9A27A]" strokeWidth={2} />
                  </button>
                </div>

                {/* 오른쪽: 오늘 버튼 + 화살표 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // 달력 안 뜨게 막기
                      handleGoToday();     // 기존 오늘로 이동 함수
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-[#E2D7C7] text-[#3E2E20] bg-white/80 pointer-events-auto"
                  >
                    오늘
                  </button>
                  <ChevronDown className="w-4 h-4 text-[#B7A595]" strokeWidth={1.7} />
                </div>
              </div>
            </div>
          </div>

          {/* 전체 시술 기록 */}
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: textColor }}>
              <span>{selectedDate ? formatDate(selectedDate) + ' 기록' : '전체 시술 기록'}</span>
            </h3>
            
            {recordsForSelectedDate.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-[#E8DFD3] shadow-sm">
                <p className="font-light text-base" style={{ color: textColor, opacity: 0.6 }}>
                  {selectedDate ? '해당 날짜의 시술 기록이 없습니다' : '시술 기록이 없습니다'}
                </p>
              </div>
            ) : (
              <>
                {recordsForSelectedDate.map((record) => {
                  // 고객 정보 찾기
                  const recordCustomerId = record.customerId ?? record.customer_id;
                  let customer = customers.find(c => {
                    if (!recordCustomerId) return false;
                    return c.id === recordCustomerId || String(c.id) === String(recordCustomerId);
                  });
                  
                  // displayName 계산 (summary.title 제외)
                  let displayName = 
                    customer?.name?.trim() || 
                    (record.customerName && record.customerName.trim() !== '' && record.customerName.trim() !== '이름 미입력' ? record.customerName.trim() : null) ||
                    null;
                  
                  // displayPhone 계산
                  let displayPhone = customer?.phone || (record.customerPhone && record.customerPhone.trim() !== '' ? record.customerPhone.trim() : null) || null;

                  // ✅ summary_json 기반으로 한 번 더 보정
                  const summaryCustomer = record.summaryJson?.customer || record.detail?.customer;
                  if (summaryCustomer) {
                    const nameFromSummary = (summaryCustomer.name || '').trim();
                    const phoneFromSummary = (summaryCustomer.phone || '').trim();

                    if ((!displayName || displayName === '이름 미입력') && nameFromSummary && nameFromSummary !== '이름 미입력') {
                      displayName = nameFromSummary;
                    }

                    if ((!displayPhone || displayPhone === '전화번호 미기재') && phoneFromSummary) {
                      displayPhone = phoneFromSummary;
                    }
                  }
                  
                  // displayTitle 계산 (제목만 사용, 이름 fallback 없음)
                  const summaryTitle = record.summaryJson?.title || record.title || '';
                  const displayTitle = summaryTitle;
                  
                  // 예약 시간 찾기
                  const connectedReservation = findConnectedReservation(record);
                  const reservationTime = connectedReservation ? connectedReservation.time : null;
                  
                  // 시간 표시 레이블 생성 (시간만 추출)
                  const reservationTimeDisplay = (() => {
                    if (reservationTime) {
                      const timeStr = String(reservationTime).trim();
                      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                        const [hour, minute] = timeStr.split(':');
                        const hh = String(parseInt(hour, 10)).padStart(2, '0');
                        const mm = String(parseInt(minute, 10)).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }
                      return timeStr;
                    }
                    // record.timeLabel에서 시간만 추출
                    if (record.timeLabel) {
                      const timeMatch = record.timeLabel.match(/(\d{1,2}:\d{2})/);
                      return timeMatch ? timeMatch[1] : record.timeLabel;
                    }
                    return null;
                  })();
                  
                  // 고객 상세 페이지로 이동 핸들러
                  const handleCustomerClick = (record) => {
                    if (!record) return;
                    const recordCustomerId = record.customerId ?? record.customer_id;
                    const targetCustomerId = recordCustomerId || customer?.id;
                    
                    if (!targetCustomerId || !isValidUuid(targetCustomerId)) {
                      alert('이 방문 기록은 아직 고객 프로필과 연결되지 않았어요.');
                      return;
                    }
                    
                    setSelectedCustomerId(targetCustomerId);
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
                    <div key={record.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative" style={{ padding: '12px 16px' }}>
                      <div className="record-card-main flex flex-col relative">
                        {/* 맨 위줄: 날짜/시간 */}
                        {reservationTimeDisplay && (
                          <div 
                            className="mb-1 flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecordClick(record);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <Clock size={12} style={{ color: accentColor }} />
                            <span className="text-xs font-bold" style={{ color: accentColor }}>
                              {reservationTimeDisplay}
                            </span>
                          </div>
                        )}
                        
                        {/* 두 번째 줄: 이름, 번호 */}
                        <div 
                          className="flex flex-row items-center justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecordClick(record);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* 이름 */}
                          {displayName ? (
                            <>
                              <button
                                type="button"
                                style={{ padding: 0, margin: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCustomerClick(record);
                                }}
                              >
                                <span className="text-base font-bold" style={{ color: textColor }}>{displayName}</span>
                              </button>
                              {/* 번호 */}
                              {displayPhone && (
                                <span className="ml-2 text-xs text-gray-400">
                                  / {displayPhone}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">이름 미입력</span>
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
                          <div className="text-sm text-[#232323]/80 font-medium truncate">
                            {(() => {
                              let cleanedTitle = displayTitle || '';
                              if (cleanedTitle) {
                                if (displayName && displayName !== '이름 미입력') {
                                  cleanedTitle = cleanedTitle.replace(new RegExp(displayName, 'g'), '').trim();
                                }
                                cleanedTitle = cleanedTitle.replace(/기존\s*고객/gi, '').trim();
                                cleanedTitle = cleanedTitle.replace(/신규\s*고객/gi, '').trim();
                                cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();
                              }
                              return cleanedTitle || displayTitle || '';
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Accordion 상세 내용 */}
                      {expandedHistoryIds.has(record.id) && (record.detail || record.summaryJson) && (
                        <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50">
                          {(record.detail?.sections || record.summaryJson?.sections || []).map((section, idx) => {
                            const customerInfoForOverride = record.customer || customer || {
                              name: displayName !== '이름 미입력' ? displayName : undefined,
                              phone: displayPhone !== '전화번호 미기재' ? displayPhone : undefined
                            };
                            
                            const safeSectionTitle = typeof section.title === 'string' 
                              ? section.title 
                              : (typeof section.title === 'object' && section.title !== null 
                                ? JSON.stringify(section.title, null, 2) 
                                : String(section.title || ''));
                            
                            // [고객 기본 정보] 섹션인지 확인
                            const isCustomerInfoSection = safeSectionTitle.includes('고객 기본 정보') || 
                                                         safeSectionTitle.includes('고객 정보') ||
                                                         safeSectionTitle.toLowerCase().includes('customer');
                            
                            // 고객 기본 정보 섹션인 경우 content를 특정 형식으로 변환
                            let formattedContent = section.content;
                            if (isCustomerInfoSection) {
                              const customerName = record.summaryJson?.customerInfo?.name || 
                                                  record.detail?.customerInfo?.name ||
                                                  customerInfoForOverride?.name || 
                                                  displayName || '';
                              const customerPhone = record.summaryJson?.customerInfo?.phone || 
                                                   record.detail?.customerInfo?.phone ||
                                                   customerInfoForOverride?.phone || 
                                                   displayPhone || '';
                              
                              formattedContent = [];
                              if (customerName && customerName !== '이름 미입력') {
                                formattedContent.push(`이름: ${customerName}`);
                              }
                              if (customerPhone && customerPhone !== '전화번호 미기재') {
                                formattedContent.push(`전화번호: ${customerPhone}`);
                              }
                              // 기존 content가 있으면 추가 (이름/전화번호가 아닌 다른 정보)
                              section.content.forEach(item => {
                                const itemStr = typeof item === 'string' ? item : String(item || '');
                                if (itemStr && 
                                    !itemStr.includes('이름:') && 
                                    !itemStr.includes('전화번호:') &&
                                    !itemStr.includes('name:') &&
                                    !itemStr.includes('phone:')) {
                                  formattedContent.push(itemStr);
                                }
                              });
                            }
                            
                            return (
                              <div key={idx}>
                                <h5 className="text-base font-bold mb-3" style={{ color: textColor }}>
                                  {safeSectionTitle}
                                </h5>
                                <ul className="space-y-2">
                                  {formattedContent.map((item, i) => (
                                    <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: textColor, borderLeft: '2px solid #E5E7EB' }}>
                                      {isCustomerInfoSection ? item : overrideCustomerInfoLine(item, customerInfoForOverride)}
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
                })}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Safe Area Bottom */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

export default HistoryScreen;
