// 특정 고객의 정보와 방문 히스토리를 보여주는 화면
import React, { useState } from 'react';
import { ArrowLeft, MoreHorizontal, Phone, Edit, Mic, ChevronUp, ChevronDown, Calendar, Repeat, Keyboard, ChevronLeft } from 'lucide-react';
import { formatRecordDateTime, formatServiceDateTimeLabel } from '../utils/date';
import { SCREENS } from '../constants/screens';
import {
  overrideCustomerInfoLine,
  cleanVisitTitle,
  formatVisitDateTime,
  formatCustomerTagsForDisplay,
  convertCustomerTagsToIds,
  convertVisitTagsToIds
} from '../utils/visitUtils';
import { extractServiceDateFromSummary } from '../utils/serviceUtils';

function CustomerDetailScreen({
  setCurrentScreen,
  previousScreen,
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
  setSelectedReservation,
  MOCK_CUSTOMERS,
  reservations = [] // 예약 정보 (예약과 연결된 방문 기록의 날짜/시간 확인용)
}) {
  // customers 배열에서 고객 찾기 (숫자와 문자열 ID 모두 처리)
  let customer = customers.find(c => {
    return c.id === selectedCustomerId || String(c.id) === String(selectedCustomerId);
  });
  
  // customers 배열에 없으면 MOCK_CUSTOMERS에서 직접 찾기
  if (!customer) {
    console.log('customers 배열에 고객이 없어서 MOCK_CUSTOMERS에서 찾는 중...');
    const mockCustomer = MOCK_CUSTOMERS.find(c => {
      return c.id === selectedCustomerId || String(c.id) === String(selectedCustomerId);
    });
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
  
  // ========================================
  // selectedCustomerId === null 방어
  // ========================================
  if (selectedCustomerId == null) {
    console.warn(
      '[CustomerDetailScreen] selectedCustomerId가 null입니다. 녹음/히스토리 저장 로직을 확인하세요.'
    );

    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p className="text-center text-sm mb-4" style={{ color: '#8A7A6A' }}>
          고객 정보가 제대로 연결되지 않았습니다.
        </p>
        <button
          className="px-6 py-2 rounded-xl font-medium text-white shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: '#C9A27A' }}
          onClick={() => setCurrentScreen(SCREENS.HISTORY)}
        >
          히스토리로 돌아가기
        </button>
      </div>
    );
  }
  
  // TODO: null customerId로 저장된 예전 방문 기록들을,
  //       전화번호/이름 기반으로 실제 고객에게 재할당하는 마이그레이션 도구가 필요하면 추후 추가.
  
  // customerId가 null인 방문 기록 필터링
  // visits 객체에서 고객의 방문 기록 가져오기 (숫자와 문자열 ID 모두 처리)
  const rawVisits = visits[selectedCustomerId] || visits[String(selectedCustomerId)] || [];
  const customerVisits = rawVisits.filter(visit => {
    if (!visit || !visit.id) {
      console.warn('[CustomerDetailScreen] 유효하지 않은 방문 기록:', visit);
      return false;
    }
    return true;
  });
  
  console.log('[CustomerDetailScreen] selectedCustomerId:', selectedCustomerId);
  console.log('[CustomerDetailScreen] customerVisits.length:', customerVisits.length);
  
  // 예약과 연결된 방문 기록인지 확인하는 헬퍼 함수
  const findConnectedReservation = (visit) => {
    if (!reservations || reservations.length === 0) return null;

    const visitCustomerId = visit.customerId ?? visit.customer_id;
    const customerIdFromProfile = customer?.id;

    // 1순위: reservationId로 찾기
    if (visit.reservationId) {
      const matchedReservation = reservations.find(r => r.id === visit.reservationId);
      if (matchedReservation) return matchedReservation;
    }

    // 2순위: customerId + 날짜로 찾기
    if ((visitCustomerId || customerIdFromProfile)) {
      const visitDate = visit.serviceDate || visit.date;
      const matchedReservation = reservations.find(r => {
        const reservationCustomerId = r.customer_id ?? r.customerId;

        const customerIdMatch =
          reservationCustomerId &&
          (
            (customerIdFromProfile &&
              (reservationCustomerId === customerIdFromProfile ||
               String(reservationCustomerId) === String(customerIdFromProfile)))
            ||
            (visitCustomerId &&
              (reservationCustomerId === visitCustomerId ||
               String(reservationCustomerId) === String(visitCustomerId)))
          );

        const dateMatch = visitDate && r.date && visitDate === r.date;

        return customerIdMatch && dateMatch;
      });

      if (matchedReservation) return matchedReservation;
    }

    return null;
  };

  // 시간 추출 헬퍼 함수 (예약과 연결된 경우 예약 시간 우선, 그 다음 텍스트/녹음에서 추출한 시간)
  const extractTimeFromVisit = (visit) => {
    // 1순위: 예약과 연결된 경우 예약 시간 사용
    const connectedReservation = findConnectedReservation(visit);
    if (connectedReservation && connectedReservation.time) {
      const timeStr = String(connectedReservation.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
      }
    }
    
    // 2순위: 텍스트/녹음에서 추출한 시간
    const serviceDateTimeLabel = extractServiceDateTimeLabel(visit);
    if (serviceDateTimeLabel) {
      // "2025-12-27 17:30 방문/예약" -> "17:30" 추출
      const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const [, hh, mm] = timeMatch;
        return `${hh}:${mm}`;
      }
    }
    
    // 3순위: visit.time 직접 사용 (저장된 시간)
    if (visit.time) {
      const timeStr = String(visit.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(parseInt(minute, 10)).padStart(2, '0')}`;
      }
    }
    
    // fallback: 빈 문자열
    return '';
  };

  // 방문 기록 정렬: 날짜 내림차순(최신 날짜가 위), 같은 날짜면 시간 내림차순(늦은 시간이 위)
  const sortedCustomerVisits = [...customerVisits].sort((a, b) => {
    // 날짜 추출: 예약과 연결된 경우 예약 날짜 우선, 그 다음 텍스트/녹음에서 추출한 날짜, 없으면 저장된 날짜 사용
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
    
    // 날짜 비교
    const dateA = new Date(baseDateA);
    const dateB = new Date(baseDateB);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime(); // 최신 날짜가 먼저
    }
    
    // 같은 날짜면 시간 내림차순으로 정렬 (늦은 시간이 위로)
    const timeA = extractTimeFromVisit(a);
    const timeB = extractTimeFromVisit(b);
    
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
  
  console.log('CustomerDetailScreen - 최종 찾은 고객:', customer);
  console.log('CustomerDetailScreen - customer.customerTags:', customer?.customerTags);
  console.log('CustomerDetailScreen - customerVisits:', customerVisits);
  console.log('[CustomerDetailScreen] customer:', customer);
  console.log('[CustomerDetailScreen] sortedCustomerVisits.length:', sortedCustomerVisits.length);

  // selectedCustomerId는 있지만 customers 배열에서 못 찾았을 때
  if (selectedCustomerId && !customer) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
        <p className="text-center text-sm mb-4" style={{ color: '#8A7A6A' }}>
          고객 정보를 찾을 수 없습니다.<br/>
          (ID: {selectedCustomerId})
        </p>
        <button 
          onClick={() => setCurrentScreen(SCREENS.HISTORY)} 
          className="px-6 py-2 rounded-xl font-medium text-white shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: '#C9A27A' }}
        >
          히스토리로 돌아가기
        </button>
      </div>
    );
  }

  // 더 보기 함수
  const handleLoadMoreVisits = () => {
    setVisibleVisitCount((prev) => Math.min(prev + 10, sortedCustomerVisits.length));
  };

  // 접기 함수
  const handleCollapseVisits = () => {
    setVisibleVisitCount(10);
  };


  // inputMode 가져오기 (localStorage에서)
  const [inputMode, setInputMode] = useState(() => {
    if (typeof window === 'undefined') return 'voice';
    const saved = window.localStorage.getItem('mallo_input_mode');
    return saved === 'voice' || saved === 'text' ? saved : 'voice';
  });
  const isVoiceMode = inputMode === 'voice';

  // 이 고객에 대한 새 기록 남기기 핸들러 (고객 상세 전용 화면으로 이동)
  const handleCreateRecordForCustomer = () => {
    // 고객 정보를 selectedCustomerForRecord에 저장
    setSelectedCustomerForRecord({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    });
    
    // 현재 모드에 따라 고객 상세 전용 화면으로 이동
    if (isVoiceMode) {
      // 음성 모드: 고객 상세 전용 녹음 화면으로 이동하고 녹음 시작
      setCurrentScreen(SCREENS.CUSTOMER_RECORD);
      // 화면 이동 후 녹음 시작 (약간의 지연을 두어 화면 전환이 완료된 후 녹음 시작)
      setTimeout(() => {
        startRecording();
      }, 100);
    } else {
      // 텍스트 모드: 고객 상세 전용 텍스트 기록 화면으로 이동
      setCurrentScreen(SCREENS.CUSTOMER_TEXT_RECORD);
    }
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    const targetScreen = previousScreen === SCREENS.HOME ? SCREENS.HOME : SCREENS.HISTORY;
    setCurrentScreen(targetScreen);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-[#F2F0E6] px-5 pt-4 pb-2 sticky top-0 z-20 flex items-center">
        {/* 뒤로가기 버튼 */}
        <button
          type="button"
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: '#232323' }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>

        {/* 가운데: 고객 이름만 표시 */}
        <h1 className="flex-1 text-center text-base font-bold text-[#232323]">
          {customer?.name || '고객'}
        </h1>

        {/* 오른쪽: 이 고객에 대한 새 기록 남기기 (녹음/텍스트 모드에 따라 아이콘 변경) */}
        <button
          type="button"
          onClick={handleCreateRecordForCustomer}
          className="ml-2 w-9 h-9 rounded-full shadow-sm flex items-center justify-center"
          style={{ backgroundColor: '#C9A27A' }}
        >
          {isVoiceMode ? (
            <Mic className="w-4 h-4 text-white" />
          ) : (
            <Keyboard className="w-4 h-4 text-white" />
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-40">
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
              const tagIds = convertCustomerTagsToIds(customer.customerTags || {}, allCustomerTags);
              setEditCustomerTagIds(tagIds);
              
              setCurrentScreen(SCREENS.EDIT_CUSTOMER);
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
              
              {/* 첫 방문일 및 평균 방문 주기 요약 박스 */}
              {(() => {
                // 방문 기록에서 날짜 추출
                const visitDates = sortedCustomerVisits
                  .map(visit => {
                    let baseDate = visit.serviceDate;
                    if (!baseDate && visit.detail && visit.detail.sections) {
                      const visitData = { sections: visit.detail.sections };
                      baseDate = extractServiceDateFromSummary(visitData);
                    }
                    return baseDate || visit.date;
                  })
                  .filter(date => date) // 유효한 날짜만
                  .map(date => new Date(date))
                  .filter(date => !isNaN(date.getTime())); // 유효한 Date 객체만
                
                if (visitDates.length === 0) {
                  return null; // 방문 기록 없음
                }
                
                // 날짜 정렬 (오름차순: 과거 -> 최근)
                visitDates.sort((a, b) => a.getTime() - b.getTime());
                
                // 첫 방문일
                const firstVisitDate = visitDates[0];
                const firstVisitYear = String(firstVisitDate.getFullYear()).slice(-2);
                const firstVisitMonth = String(firstVisitDate.getMonth() + 1).padStart(2, '0');
                const firstVisitDay = String(firstVisitDate.getDate()).padStart(2, '0');
                const firstVisitFormatted = `${firstVisitYear}.${firstVisitMonth}.${firstVisitDay}`;
                
                // 평균 방문 주기 계산
                let averageCycle = null;
                if (visitDates.length >= 2) {
                  const latestVisitDate = visitDates[visitDates.length - 1];
                  const daysDiff = Math.round(
                    (latestVisitDate.getTime() - firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  averageCycle = Math.round(daysDiff / (visitDates.length - 1));
                }
                
                return (
                  <div className="w-full bg-gray-50 rounded-xl py-3 px-4 my-4 grid grid-cols-2 divide-x divide-gray-200">
                    {/* 좌측 - 첫 방문 */}
                    <div className="flex flex-col items-center justify-center text-center px-2">
                      <span className="text-xs text-gray-400 mb-1">첫 방문</span>
                      <span className="text-sm text-gray-700 font-medium">
                        {firstVisitFormatted}
                      </span>
                    </div>
                    
                    {/* 우측 - 방문 주기 */}
                    <div className="flex flex-col items-center justify-center text-center px-2">
                      <span className="text-xs text-gray-400 mb-1">방문 주기</span>
                      {averageCycle === null ? (
                        <span className="text-sm text-gray-700 font-medium">신규 고객</span>
                      ) : (
                        <span className="text-sm text-[#C9A27A] font-bold">
                          평균 {averageCycle}일
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* customerTags 표시 (주의 태그가 맨 앞) */}
              {(() => {
                const allTags = formatCustomerTagsForDisplay(customer.customerTags || {}, customer.visitCount || 0);
                
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
        <div className="space-y-4 pb-32">
          <h3 className="text-base font-bold" style={{ color: '#232323' }}>방문 히스토리</h3>
          {sortedCustomerVisits.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>방문 기록이 없습니다</p>
            </div>
          ) : (
            sortedCustomerVisits.slice(0, visibleVisitCount).map((visit) => {
              // record + customer를 합쳐서 사용 (customerName, customerPhone 보정)
              const normalizedVisit = normalizeRecordWithCustomer(visit, customer);
              const safeName = normalizedVisit.customerName || '미기재';
              const safePhone = normalizedVisit.customerPhone || '미기재';

              // 날짜/시간 정보 준비 (예약과 연결된 경우 예약 날짜/시간 우선, 그 다음 텍스트/녹음에서 추출한 날짜/시간)
              let dateTimeDisplay = '';
              
              // 1순위: 예약과 연결된 경우 예약 날짜/시간 사용
              const connectedReservation = findConnectedReservation(visit);
              if (connectedReservation && connectedReservation.date && connectedReservation.time) {
                const dateObj = new Date(`${connectedReservation.date}T${connectedReservation.time}`);
                if (!isNaN(dateObj.getTime())) {
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  dateTimeDisplay = `${year}.${month}.${day} ${hours}:${minutes}`;
                }
              }
              
              // 2순위: 텍스트/녹음에서 추출한 날짜/시간
              if (!dateTimeDisplay) {
                const serviceDateTimeLabel = extractServiceDateTimeLabel(visit);
                if (serviceDateTimeLabel) {
                  // "2025-12-27 17:30 방문/예약" -> "2025.12.27 17:30" 변환
                  const dateTimeMatch = serviceDateTimeLabel.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
                  if (dateTimeMatch) {
                    const [, year, month, day, hour, minute] = dateTimeMatch;
                    dateTimeDisplay = `${year}.${month}.${day} ${hour}:${minute}`;
                  }
                }
              }
              
              // 3순위: 저장된 날짜/시간 사용
              if (!dateTimeDisplay && visit.serviceDate && visit.time) {
                const dateObj = new Date(`${visit.serviceDate}T${visit.time}`);
                if (!isNaN(dateObj.getTime())) {
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  dateTimeDisplay = `${year}.${month}.${day} ${hours}:${minutes}`;
                }
              }
              
              // 4순위: formatVisitDateTime 사용 (fallback)
              if (!dateTimeDisplay) {
                const serviceDateTimeLabel = extractServiceDateTimeLabel(visit);
                dateTimeDisplay = formatVisitDateTime(visit, serviceDateTimeLabel);
              }

              // 시술 내용 요약 (고객 이름 제거)
              const displayTitle = cleanVisitTitle(
                visit.title || visit.subject || visit.summary || '',
                safeName
              );

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
                          const visitTagIds = convertVisitTagsToIds(normalizedVisit.tags || [], allVisitTags);
                          setEditingVisitTagIds(visitTagIds);
                          
                          setCurrentScreen(SCREENS.EDIT);
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
                        
                        // section.title을 안전하게 문자열로 변환
                        const safeSectionTitle = typeof section.title === 'string' 
                          ? section.title 
                          : (typeof section.title === 'object' && section.title !== null 
                            ? JSON.stringify(section.title, null, 2) 
                            : String(section.title || ''));
                        
                        return (
                          <div key={idx}>
                            <h5 className="text-base font-bold mb-3" style={{ color: '#232323' }}>
                              {safeSectionTitle}
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
          {(sortedCustomerVisits.length > visibleVisitCount || visibleVisitCount > 10) && (
            <div className="flex justify-center mt-4 mb-20 gap-3">
              {sortedCustomerVisits.length > visibleVisitCount && (
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

    </div>
  );
}

export default CustomerDetailScreen;


