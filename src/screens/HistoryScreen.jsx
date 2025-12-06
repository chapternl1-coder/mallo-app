import React, { useEffect, useRef } from 'react';
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
  setExpandedHistoryIds,
  reservations
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

  // 날짜 필터링 (예약과 연결된 경우 예약 날짜 우선, 그 다음 텍스트/녹음에서 추출한 날짜, 없으면 저장된 날짜 사용)
  const filteredRecords = selectedDate 
    ? allRecords.filter(record => {
        // 1순위: 예약과 연결된 경우 예약 날짜 사용
        const connectedReservation = findConnectedReservation(record);
        if (connectedReservation && connectedReservation.date) {
          return connectedReservation.date === selectedDate;
        }
        
        // 2순위: 텍스트/녹음에서 추출한 날짜
        let baseDate = null;
        if (record.detail && record.detail.sections) {
          const visitData = { sections: record.detail.sections };
          baseDate = extractServiceDateFromSummary(visitData);
        }
        // 3순위: 저장된 날짜 (serviceDate 우선, 없으면 date)
        if (!baseDate) {
          baseDate = record.serviceDate || record.date;
        }
        return baseDate === selectedDate;
      })
    : allRecords;

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

  // 날짜와 시간순 정렬 (예약과 연결된 경우 예약 날짜 우선, 그 다음 텍스트/녹음에서 추출한 날짜, 없으면 저장된 날짜 사용)
  // 같은 날짜 내에서는 시간 내림차순 (늦은 시간이 위로)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    // 날짜 추출: 예약과 연결된 경우 예약 날짜 우선
    let baseDateA = null;
    const connectedReservationA = findConnectedReservation(a);
    if (connectedReservationA && connectedReservationA.date) {
      baseDateA = connectedReservationA.date;
    } else {
      // 텍스트/녹음에서 추출한 날짜
      if (a.detail && a.detail.sections) {
        const visitDataA = { sections: a.detail.sections };
        baseDateA = extractServiceDateFromSummary(visitDataA);
      }
      // 저장된 날짜 사용
      if (!baseDateA) {
        baseDateA = a.serviceDate || a.date;
      }
    }
    
    let baseDateB = null;
    const connectedReservationB = findConnectedReservation(b);
    if (connectedReservationB && connectedReservationB.date) {
      baseDateB = connectedReservationB.date;
    } else {
      // 텍스트/녹음에서 추출한 날짜
      if (b.detail && b.detail.sections) {
        const visitDataB = { sections: b.detail.sections };
        baseDateB = extractServiceDateFromSummary(visitDataB);
      }
      // 저장된 날짜 사용
      if (!baseDateB) {
        baseDateB = b.serviceDate || b.date;
      }
    }
    
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
    
    // 같은 날짜면 시간 내림차순으로 정렬 (늦은 시간이 위로)
    const timeA = extractTimeFromRecord(a);
    const timeB = extractTimeFromRecord(b);
    
    // "HH:mm" 형식의 시간을 비교
    const timePartsA = timeA.split(':').map(Number);
    const timePartsB = timeB.split(':').map(Number);
    
    // 시간 파싱 검증
    if (timePartsA.length !== 2 || timePartsB.length !== 2 || 
        isNaN(timePartsA[0]) || isNaN(timePartsA[1]) || 
        isNaN(timePartsB[0]) || isNaN(timePartsB[1])) {
      // 시간 파싱 실패 시 순서 유지
      return 0;
    }
    
    const [hourA, minuteA] = timePartsA;
    const [hourB, minuteB] = timePartsB;
    
    // 시간 비교: 시간 * 60 + 분으로 변환해서 비교 (늦은 시간이 위로)
    const totalMinutesA = hourA * 60 + minuteA;
    const totalMinutesB = hourB * 60 + minuteB;
    
    // 내림차순: 큰 값(늦은 시간)이 앞으로
    return totalMinutesB - totalMinutesA;
  });

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
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: bgColor }}>
      <main ref={mainRef} className="flex-1 overflow-y-auto px-5 pt-5 space-y-4 pb-8" style={{ backgroundColor: bgColor }}>
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
              {/* 왼쪽: 캘린더 아이콘 + 날짜 텍스트 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-[#E2D7C7]">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A27A]" strokeWidth={1.7} />
                </div>
                <span className="text-[13px] font-medium text-[#3E2E20]">
                  {selectedDateLabel}
                </span>
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
          
          {sortedRecords.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#E8DFD3] shadow-sm">
              <p className="font-light text-base" style={{ color: textColor, opacity: 0.6 }}>
                {selectedDate ? '해당 날짜의 시술 기록이 없습니다' : '시술 기록이 없습니다'}
              </p>
            </div>
          ) : (
            sortedRecords.map((record) => {
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
              const recordCustomerId = record.customerId ?? record.customer_id;
              const customer = customers.find(c => {
                if (!recordCustomerId) return false;
                return c.id === recordCustomerId || String(c.id) === String(recordCustomerId);
              });
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

              // displayName 계산 (우선순위: customer.name > record.customerName > extractedName > '이름 오류')
              let displayName = 
                customer?.name?.trim() || 
                record.customerName?.trim() || 
                extractedName?.trim();
              
              // 논리상 이름은 반드시 존재하지만, 혹시 몰라 방어 코드
              if (!displayName) {
                console.warn('[HistoryScreen] 이름이 비어 있는 방문 기록입니다.', record);
                displayName = '이름 오류';
              }

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

              // 날짜 표시용: 예약과 연결된 경우 예약 날짜 우선, 그 다음 텍스트/녹음에서 추출한 날짜, 없으면 저장된 날짜 사용
              let baseDate = null;
              const connectedReservation = findConnectedReservation(record);
              if (connectedReservation && connectedReservation.date) {
                baseDate = connectedReservation.date;
              } else {
                // 텍스트/녹음에서 추출한 날짜
                if (record.detail && record.detail.sections) {
                  const visitData = {
                    sections: record.detail.sections
                  };
                  baseDate = extractServiceDateFromSummary(visitData);
                }
                // 저장된 날짜 사용
                if (!baseDate) {
                  baseDate = record.serviceDate || record.date;
                }
              }
              
              // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
              const displayDate = formatDateShort(baseDate);
              
              // 예약 시간 찾기 (예약과 연결된 경우) - 위에서 이미 connectedReservation 선언됨
              const reservationTime = connectedReservation ? connectedReservation.time : null;
              
              // 시간 표시 레이블 생성 (예약과 연결된 경우 예약 시간 우선, 그 다음 텍스트/녹음에서 추출한 시간)
              const reservationTimeLabel = (() => {
                // 1순위: 연결된 예약의 시간 (예약 추가로 만든 경우)
                if (reservationTime) {
                  const timeStr = String(reservationTime).trim();
                  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                    const [hour, minute] = timeStr.split(':');
                    const hh = String(parseInt(hour, 10)).padStart(2, '0');
                    const mm = String(parseInt(minute, 10)).padStart(2, '0');
                    return `${hh}:${mm} 예약`;
                  }
                  return `${reservationTime} 예약`;
                }
                
                // 2순위: 텍스트/녹음에서 추출한 시간
                const serviceDateTimeLabel = extractServiceDateTimeLabel(record);
                if (serviceDateTimeLabel) {
                  const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
                  if (timeMatch) {
                    const [, hh, mm] = timeMatch;
                    return `${hh}:${mm} 예약`;
                  }
                }
                
                // 3순위: record.time 직접 사용 (저장된 시간)
                if (record.time) {
                  const timeStr = String(record.time).trim();
                  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                    const [hour, minute] = timeStr.split(':');
                    const hh = String(parseInt(hour, 10)).padStart(2, '0');
                    const mm = String(parseInt(minute, 10)).padStart(2, '0');
                    return `${hh}:${mm} 예약`;
                  }
                }
                
                return '';
              })();
              
              // 고객 상세 페이지로 이동 핸들러
              const handleCustomerClick = (record) => {
                if (!record) return;

                const recordCustomerId = record.customerId ?? record.customer_id;
                // customerId 우선, 없으면 customer 객체에서 가져오기
                const targetCustomerId = recordCustomerId || customer?.id;
                
                if (!targetCustomerId) {
                  console.warn('[HistoryScreen] 고객 ID를 찾을 수 없습니다.', record);
                  return;
                }
                
                console.log('[HistoryScreen] 고객 상세 페이지로 이동:', targetCustomerId);
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
                <div key={record.id} className="record-card bg-white rounded-xl shadow-sm border border-[#E8DFD3]">
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
                      {displayName && displayName !== '이름 오류' && (
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
                            if (displayName && displayName !== '이름 오류') {
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
                          name: displayName !== '이름 오류' ? displayName : undefined,
                          phone: displayPhone !== '전화번호 미기재' ? displayPhone : undefined
                        };
                        
                        // section.title을 안전하게 문자열로 변환
                        const safeSectionTitle = typeof section.title === 'string' 
                          ? section.title 
                          : (typeof section.title === 'object' && section.title !== null 
                            ? JSON.stringify(section.title, null, 2) 
                            : String(section.title || ''));
                        
                        return (
                          <div key={idx}>
                            <h5 className="text-base font-bold mb-3" style={{ color: textColor }}>
                              {safeSectionTitle}
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
