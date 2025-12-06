// 특정 고객의 정보와 방문 히스토리를 보여주는 화면
import React, { useState, useMemo } from 'react';
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
  visitLogs = [], // Supabase visit_logs 추가
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
  reservations = [] // 예약 정보 (예약과 연결된 방문 기록의 날짜/시간 확인용)
}) {
  // 선택된 고객 찾기 (id 문자열/숫자 섞여도 대비)
  const rawCustomer = customers?.find(
    (c) =>
      c.id === selectedCustomerId ||
      String(c.id) === String(selectedCustomerId)
  );

  // visitLogs 에서 이 고객 id 로 연결된 방문 기록 하나 찾기
  const relatedVisit =
    (visitLogs || [])
      .find(
        (v) =>
          v.customerId === selectedCustomerId ||
          v.customer_id === selectedCustomerId
      ) || null;

  // visit_logs 안에 들어있는 summary_json / detail 안의 customer 정보 꺼내기
  const summary = relatedVisit?.summaryJson || relatedVisit?.detail || {};
  const summaryCustomer = summary.customer || summary.customerInfo || {};

  // 최종 customer 객체 (실제 customers 에 있으면 그걸 우선 사용,
  // 없으면 visit_logs 기반 임시 프로필로 생성)
  let customer = rawCustomer || {
    id: selectedCustomerId,
    name:
      summaryCustomer.name ||
      relatedVisit?.customerName ||
      '이름 미입력',
    phone:
      summaryCustomer.phone ||
      relatedVisit?.customerPhone ||
      '',
    visitCount: 0,
    lastVisit: relatedVisit?.serviceDate || relatedVisit?.date || null,
    customerTags: {
      caution: [],
      trait: [],
      payment: [],
      pattern: [],
    },
  };

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

  if (!rawCustomer) {
    console.warn(
      '[CustomerDetailScreen] customers 배열에서 고객을 찾지 못해서 visit_logs 기반 임시 프로필로 표시합니다.',
      { selectedCustomerId, relatedVisit }
    );
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
  
  // 예약과 연결된 방문 기록인지 확인하는 헬퍼 함수 (필터 함수보다 먼저 정의 필요)
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
  
  // 🔍 customerVisits 계산: customer_id 우선, 그다음 전화번호로 매칭
  // 이름은 매칭 기준에서 완전히 제외
  const normalizePhone = (raw) => {
    if (!raw) return '';
    // 숫자만 남기고, 한국 국제표기(82) -> 0 으로 정규화
    const digits = String(raw).replace(/[^0-9]/g, '');
    if (digits.startsWith('82') && digits.length > 2) {
      return '0' + digits.slice(2);
    }
    return digits;
  };

  console.log('[CustomerDetailScreen] 필터링 결과:');

  // 1) Supabase visit_logs 에서 선택된 고객의 방문 기록만 필터링
  const supabaseCustomerVisits = (visitLogs || []).filter((v) => {
    const vCustomerId = v.customerId ?? v.customer_id;
    return (
      vCustomerId &&
      String(vCustomerId) === String(selectedCustomerId)
    );
  });

  // 2) 기존 로컬 visits (localStorage 기반)에서 선택된 고객의 방문 기록만 가져오기
  let localCustomerVisits = [];
  if (visits && typeof visits === 'object') {
    const raw = visits[selectedCustomerId] || [];
    if (Array.isArray(raw)) {
      localCustomerVisits = raw;
    }
  }

  // 3) Supabase + 로컬 방문 기록 합치기
  const mergedVisits = [...supabaseCustomerVisits, ...localCustomerVisits];

  // 4) 시간 기준 정렬 (serviceTime -> time 순으로 사용)
  const sortedCustomerVisits = mergedVisits.sort((a, b) => {
    const tA = (a.serviceTime || a.time || '').toString();
    const tB = (b.serviceTime || b.time || '').toString();
    return tA.localeCompare(tB);
  });

  console.log(
    '[CustomerDetailScreen] 최종 방문 기록 개수:',
    sortedCustomerVisits.length
  );

  // ✅ 중복 제거: 같은 visit.id가 여러 번 들어와도 처음 것만 유지
  const uniqueSortedCustomerVisits = React.useMemo(() => {
    if (!sortedCustomerVisits) return [];

    const map = new Map();

    sortedCustomerVisits.forEach((visit) => {
      if (!visit || !visit.id) return;
      // 같은 id가 여러 번 들어와도 처음 것만 유지
      if (!map.has(visit.id)) {
        map.set(visit.id, visit);
      }
    });

    return Array.from(map.values());
  }, [sortedCustomerVisits]);

  console.log(
    '[CustomerDetailScreen] uniqueSortedCustomerVisits.length:',
    uniqueSortedCustomerVisits.length
  );
  
  // customers 배열에서 찾지 못했지만 방문 기록이 있는 경우
  // summary_json에서 고객 정보를 추출하여 임시 고객 객체 생성
  if (!customer && selectedCustomerId && uniqueSortedCustomerVisits.length > 0) {
    // 첫 번째 방문 기록의 summary_json에서 고객 정보 추출
    const firstVisit = uniqueSortedCustomerVisits[0];
    const summaryJson = firstVisit.summaryJson || firstVisit.detail || {};
    const customerInfo = summaryJson.customerInfo || summaryJson.customer || {};
    
    // sections에서도 고객 정보 추출 시도
    let extractedName = customerInfo.name?.trim();
    let extractedPhone = customerInfo.phone?.trim();
    
    if (!extractedName && summaryJson.sections) {
      for (const section of summaryJson.sections) {
        if (section.title && section.title.includes('고객 기본 정보') && section.content) {
          for (const contentItem of section.content) {
            if (typeof contentItem === 'string') {
              const nameMatch = contentItem.match(/이름[:\s]+([^\n/]+)/i);
              if (nameMatch && !extractedName) {
                extractedName = nameMatch[1].trim();
              }
              const phoneMatch = contentItem.match(/전화번호[:\s]+([^\n/]+)/i);
              if (phoneMatch && !extractedPhone) {
                extractedPhone = phoneMatch[1].trim();
              }
            }
          }
        }
      }
    }
    
    // 임시 고객 객체 생성
    if (extractedName) {
      customer = {
        id: selectedCustomerId,
        name: extractedName,
        phone: extractedPhone || '',
        customerTags: {
          caution: [],
          trait: [],
          payment: [],
          pattern: []
        },
        visitCount: uniqueSortedCustomerVisits.length,
        // 삭제된 고객임을 표시하는 플래그
        isDeleted: true
      };
      console.log('[CustomerDetailScreen] summary_json에서 고객 정보 추출:', customer);
    }
  }
  
  console.log('CustomerDetailScreen - 최종 찾은 고객:', customer);
  console.log('CustomerDetailScreen - customer.customerTags:', customer?.customerTags);
  
  // ✅ 선택된 고객의 방문 기록만 필터링해서 customerVisits로 사용
  const customerVisits = React.useMemo(() => {
    if (!visitLogs || !selectedCustomerId) return [];

    return visitLogs
      .filter((visit) => {
        const cid =
          visit.customer_id ??
          visit.customerId ??
          null;

        if (!cid) return false;
        return String(cid) === String(selectedCustomerId);
      })
      .sort((a, b) => {
        const timeA = (a.service_time || a.time || '').toString();
        const timeB = (b.service_time || b.time || '').toString();
        return timeA.localeCompare(timeB);
      });
  }, [visitLogs, selectedCustomerId]);

  console.log('[CustomerDetailScreen] 필터링된 방문 기록 개수:', customerVisits.length);
  console.log('[CustomerDetailScreen] customer:', customer);
  console.log('[CustomerDetailScreen] sortedCustomerVisits.length:', sortedCustomerVisits.length);
  console.log('[CustomerDetailScreen] uniqueSortedCustomerVisits.length:', uniqueSortedCustomerVisits.length);


  // 더 보기 함수
  const handleLoadMoreVisits = () => {
    setVisibleVisitCount((prev) => Math.min(prev + 10, uniqueSortedCustomerVisits.length));
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
    // customers 배열에서 최신 고객 정보를 다시 찾아서 사용
    const latestCustomer = customers.find(c => 
      c.id === customer.id || 
      String(c.id) === String(customer.id) ||
      (c.name?.trim() === customer.name?.trim() && 
       c.phone?.trim() === customer.phone?.trim())
    ) || customer;
    
    // 최신 고객 정보를 selectedCustomerForRecord에 저장
    setSelectedCustomerForRecord({
      id: latestCustomer.id,
      name: latestCustomer.name,
      phone: latestCustomer.phone,
    });
    
    console.log('[CustomerDetailScreen] 기록 남기기 - 최신 고객 정보:', {
      id: latestCustomer.id,
      name: latestCustomer.name,
      phone: latestCustomer.phone
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
                const visitDates = uniqueSortedCustomerVisits
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
          {uniqueSortedCustomerVisits.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>방문 기록이 없습니다</p>
            </div>
          ) : (
            uniqueSortedCustomerVisits.slice(0, visibleVisitCount).map((visit) => {
              // 날짜/시간 정보 준비 (예약과 연결된 경우 예약 날짜/시간 우선, 그 다음 텍스트/녹음에서 추출한 날짜/시간)
              let dateTimeDisplay = '';
              
              // 1순위: 예약과 연결된 경우 예약 날짜/시간 사용
              const connectedReservation = findConnectedReservation(visit);
              
              // 이름과 전화번호: 현재 고객의 정보를 무조건 사용 (예약 정보나 summary_json 무시)
              // normalizedVisit은 사용하지 않음 (예전 summary_json의 정보가 포함될 수 있음)
              let safeName = customer?.name?.trim() || '미기재';
              let safePhone = customer?.phone?.trim() || '미기재';
              
              // record + customer를 합쳐서 사용 (customerName, customerPhone 보정)
              // 하지만 safeName/safePhone은 현재 고객 정보만 사용하므로 normalizedVisit은 detail 등만 사용
              const normalizedVisit = normalizeRecordWithCustomer(visit, customer);
              
              // 예약과 연결된 경우에도 현재 고객의 정보를 우선 사용
              // (예약 정보에 잘못된 고객 정보가 들어가 있을 수 있음)
              if (connectedReservation) {
                // 예약과 연결된 경우: 예약의 고객 정보 확인 (디버깅용)
                const reservationCustomer = connectedReservation.customer_id 
                  ? customers.find(c => c.id === connectedReservation.customer_id)
                  : null;
                
                // 이름: 현재 고객의 이름만 사용 (예약 정보 무시)
                safeName = customer?.name?.trim() || '미기재';
                
                // 전화번호: 현재 고객의 전화번호만 사용 (예약 정보나 summary_json 무시)
                safePhone = customer?.phone?.trim() || '미기재';
                
                // 디버깅: 어떤 정보가 사용되는지 확인
                console.log(`📞 [방문 기록 헤더] visit.id: ${visit.id?.substring(0, 8)}...`);
                console.log(`   예약 연결됨: reservation.id=${connectedReservation.id?.substring(0, 8)}...`);
                console.log(`   예약 customer_id: "${connectedReservation.customer_id}"`);
                console.log(`   예약 고객 이름: "${reservationCustomer?.name}", 전화번호: "${reservationCustomer?.phone}"`);
                console.log(`   현재 고객 id: "${selectedCustomerId}"`);
                console.log(`   현재 고객 이름: "${customer?.name}", 전화번호: "${customer?.phone}"`);
                console.log(`   visit.customerPhone (무시됨): "${visit.customerPhone}"`);
                console.log(`   normalizedVisit.customerPhone (무시됨): "${normalizedVisit.customerPhone}"`);
                console.log(`   ✅ 최종 safeName: "${safeName}", safePhone: "${safePhone}" (현재 고객 정보만 사용)`);
                
                // normalizedVisit의 정보는 사용하지 않음 (예전 summary_json의 정보일 수 있음)
              } else {
                // 예약이 없으면 현재 고객의 정보 사용 (이미 위에서 설정됨)
                console.log(`📞 [방문 기록 헤더] visit.id: ${visit.id?.substring(0, 8)}..., 예약 없음`);
                console.log(`   현재 고객 이름: "${customer?.name}", 전화번호: "${customer?.phone}"`);
                console.log(`   visit.customerPhone (무시됨): "${visit.customerPhone}"`);
                console.log(`   normalizedVisit.customerPhone (무시됨): "${normalizedVisit.customerPhone}"`);
                console.log(`   ✅ 최종 safeName: "${safeName}", safePhone: "${safePhone}" (현재 고객 정보만 사용)`);
              }
              
              // 최종 확인: 현재 고객의 전화번호가 있으면 무조건 사용 (모든 경우에 적용)
              // 이 단계는 이미 위에서 customer.phone으로 설정했으므로 불필요하지만, 안전장치로 유지
              if (customer?.phone?.trim() && safePhone !== customer.phone.trim()) {
                console.warn(`⚠️ [전화번호 최종 교체] safePhone("${safePhone}")를 customer.phone("${customer.phone}")로 교체`);
                safePhone = customer.phone.trim();
              }
              
              // 최종 최종 확인: customer 객체가 있으면 무조건 customer.phone 사용
              if (customer && customer.phone && customer.phone.trim()) {
                safePhone = customer.phone.trim();
              }
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
          {(uniqueSortedCustomerVisits.length > visibleVisitCount || visibleVisitCount > 10) && (
            <div className="flex justify-center mt-4 mb-20 gap-3">
              {uniqueSortedCustomerVisits.length > visibleVisitCount && (
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


