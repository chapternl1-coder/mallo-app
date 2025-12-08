// 특정 고객의 정보와 방문 히스토리를 보여주는 화면

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';

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

import { supabase } from '../lib/supabaseClient'; // ✅ Supabase 클라이언트 임포트 (경로는 프로젝트에 맞게 조정)



// 스켈레톤 로더 컴포넌트

const VisitHistorySkeleton = () => (

  <div className="bg-white rounded-xl shadow-sm overflow-hidden relative animate-pulse" style={{ padding: '12px 16px' }}>

    <div className="flex items-center justify-between mb-2">

      <div className="flex items-center gap-2">

        <div className="h-4 w-24 bg-gray-200 rounded"></div>

        <div className="h-5 w-12 bg-gray-200 rounded-full"></div>

      </div>

      <div className="flex items-center gap-2">

        <div className="h-5 w-5 bg-gray-200 rounded"></div>

        <div className="h-5 w-5 bg-gray-200 rounded"></div>

      </div>

    </div>

    <div className="h-4 w-3/4 bg-gray-200 rounded mt-2"></div>

  </div>

);



// 방문 기록 카드 컴포넌트 (React.memo로 최적화)

const VisitHistoryItem = React.memo(({

  visit,

  customer,

  visitOrder,

  connectedReservation,

  dateTimeDisplay,

  displayTitle,

  normalizedVisit,

  safeName,

  safePhone,

  expandedVisitId,

  setExpandedVisitId,

  setTempResultData,

  setEditingVisit,

  setEditingCustomer,

  setEditingVisitTagIds,

  setCurrentScreen,

  allVisitTags,

  convertVisitTagsToIds,

  extractServiceDateTimeLabel,

  overrideCustomerInfoLine,

  formatRecordDateTime,

  SCREENS

}) => {

  const handleToggleExpand = useCallback((e) => {

    e.stopPropagation();

    setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id);

  }, [visit.id, expandedVisitId, setExpandedVisitId]);



  const handleEdit = useCallback((e) => {

    e.stopPropagation();

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

    

    const visitTagIds = convertVisitTagsToIds(normalizedVisit.tags || [], allVisitTags);

    setEditingVisitTagIds(visitTagIds);

    

    setCurrentScreen(SCREENS.EDIT);

  }, [normalizedVisit, safeName, safePhone, customer, setTempResultData, setEditingVisit, setEditingCustomer, setEditingVisitTagIds, setCurrentScreen, allVisitTags, convertVisitTagsToIds, SCREENS]);



  const isExpanded = expandedVisitId === visit.id;



  return (

    <div className="bg-white rounded-xl shadow-sm overflow-hidden relative" style={{ padding: '12px 16px' }}>

      <div className="record-card-main flex flex-col relative">

        {/* 맨 위줄: 날짜/시간과 뱃지, 아이콘들 */}

        <div className="flex items-center justify-between mb-2">

          <div 

            className="flex items-center gap-2"

            onClick={handleToggleExpand}

            style={{ cursor: 'pointer' }}

          >

            {dateTimeDisplay && (

              <span className="text-xs font-bold text-[#C9A27A]">

                {dateTimeDisplay}

              </span>

            )}

            {/* 방문 회차 뱃지 (날짜 오른쪽) */}

            {visitOrder > 0 && (

              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600">

                {visitOrder}회차

              </span>

            )}

          </div>

          

          {/* 편집 버튼과 화살표 아이콘 (우측 상단) */}

          <div className="flex items-center gap-2">

            {/* 편집 버튼 */}

            <button

              type="button"

              onClick={handleEdit}

              className="p-1 hover:bg-gray-100 rounded transition-colors"

              style={{ color: '#C9A27A' }}

            >

              <Edit size={18} />

            </button>

            {/* 화살표 아이콘 */}

            <button 

              type="button"

              onClick={handleToggleExpand}

              className="p-1 hover:bg-gray-100 rounded transition-colors"

              style={{ color: '#C9A27A' }}

            >

              {isExpanded ? (

                <ChevronUp size={20} />

              ) : (

                <ChevronDown size={20} />

              )}

            </button>

          </div>

        </div>



        {/* 태그 리스트 */}

        {(() => {

          // normalizedVisit 또는 visit에서 태그를 최대한 많이 찾아오는 정규화 로직

          // normalizedVisit이 있으면 우선 사용 (태그가 보존되어 있음)

          const sourceVisit = normalizedVisit || visit;

          

          // ✅ 태그 소스: 정규화된 visit(sourceVisit)만 사용

          const allPossibleTags = [

            sourceVisit.tags,

            sourceVisit.visitTags,

            sourceVisit.summary_json?.tags,

            sourceVisit.summaryJson?.tags,

            sourceVisit.detail?.tags,

            sourceVisit.serviceTags,

            sourceVisit.summaryTags,

            sourceVisit.tagLabels,

            sourceVisit.autoTags,

          ].filter(tags => Array.isArray(tags) && tags.length > 0);

          

          const serviceTags = allPossibleTags.length > 0 ? allPossibleTags[0] : [];

          

          // 디버깅: 항상 로그 출력 (모바일에서도 확인 가능)

          console.log('[CustomerDetail] 태그 확인:', {

            visitId: visit.id,

            hasNormalizedVisit: !!normalizedVisit,

            normalizedVisitTags: normalizedVisit?.tags,

            visitTags: visit.tags,

            sourceVisitTags: sourceVisit.tags,

            sourceVisitVisitTags: sourceVisit.visitTags,

            detailTags: sourceVisit.detail?.tags,

            summaryJsonTags: sourceVisit.summaryJson?.tags,

            allPossibleTagsCount: allPossibleTags.length,

            finalServiceTags: serviceTags,

            serviceTagsLength: serviceTags.length

          });

          

          if (serviceTags.length === 0) {

            console.warn('[CustomerDetail] ⚠️ 태그 없음 - 모든 필드 확인:', {

              visitId: visit.id,

              visitKeys: Object.keys(visit).slice(0, 10),

              normalizedVisitKeys: normalizedVisit ? Object.keys(normalizedVisit).slice(0, 10) : null,

              visitTags: visit.tags,

              visitVisitTags: visit.visitTags,

              normalizedVisitTags: normalizedVisit?.tags,

              normalizedVisitVisitTags: normalizedVisit?.visitTags

            });

          }

          

          return serviceTags.length > 0 ? (

            <div 

              className="mb-2 flex flex-wrap gap-1.5" 

              style={{ 

                minHeight: '24px',

                width: '100%',

                visibility: 'visible',

                display: 'flex'

              }}

            >

              {serviceTags.map((tag, idx) => {

                const tagText = typeof tag === 'string' ? tag : (tag.label || String(tag));

                return (

                  <span 

                    key={idx}

                    className="text-[11px] px-2 py-1 rounded-md whitespace-nowrap"

                    style={{ 

                      backgroundColor: '#F2F0E6',

                      color: '#8C6D46',

                      display: 'inline-block',

                      visibility: 'visible',

                      opacity: 1,

                      flexShrink: 0

                    }}

                  >

                    {tagText}

                  </span>

                );

              })}

            </div>

          ) : null;

        })()}



        {/* 아랫줄: 시술 내용 */}

        <div 

          className="mt-1"

          onClick={handleToggleExpand}

          style={{ cursor: 'pointer' }}

        >

          <div className="text-sm text-[#232323]/80 font-medium truncate">

            {displayTitle}

          </div>

        </div>

      </div>

      

      {isExpanded && normalizedVisit.detail && (

        <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50">

          {normalizedVisit.detail.sections.map((section, idx) => {

            const safeSectionTitle = typeof section.title === 'string' 

              ? section.title 

              : (typeof section.title === 'object' && section.title !== null 

                ? JSON.stringify(section.title, null, 2) 

                : String(section.title || ''));

            

            const isCustomerInfoSection = safeSectionTitle.includes('고객 기본 정보') || 

                                         safeSectionTitle.includes('고객 정보') ||

                                         safeSectionTitle.toLowerCase().includes('customer');

            

            let formattedContent = section.content;

            if (isCustomerInfoSection) {

              const customerName = normalizedVisit.detail?.customerInfo?.name || 

                                  normalizedVisit.detail?.customer?.name ||

                                  customer?.name || 

                                  safeName || '';

              const customerPhone = normalizedVisit.detail?.customerInfo?.phone || 

                                   normalizedVisit.detail?.customer?.phone ||

                                  customer?.phone || 

                                  safePhone || '';

              

              formattedContent = [];

              if (customerName && customerName !== '이름 미입력') {

                formattedContent.push(`이름: ${customerName}`);

              }

              if (customerPhone && customerPhone !== '전화번호 미기재') {

                formattedContent.push(`전화번호: ${customerPhone}`);

              }

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

                <h5 className="text-base font-bold mb-3" style={{ color: '#232323' }}>

                  {safeSectionTitle}

                </h5>

                <ul className="space-y-2">

                  {formattedContent.map((item, i) => (

                    <li key={i} className="text-base leading-relaxed pl-4 font-light" style={{ color: '#232323', borderLeft: '2px solid #E5E7EB' }}>

                      {isCustomerInfoSection ? item : overrideCustomerInfoLine(item, customer)}

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

}, (prevProps, nextProps) => {

  // 커스텀 비교 함수: 중요한 props만 비교

  return (

    prevProps.visit.id === nextProps.visit.id &&

    prevProps.expandedVisitId === nextProps.expandedVisitId &&

    prevProps.visitOrder === nextProps.visitOrder &&

    prevProps.dateTimeDisplay === nextProps.dateTimeDisplay &&

    prevProps.displayTitle === nextProps.displayTitle

  );

});



VisitHistoryItem.displayName = 'VisitHistoryItem';



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

  reservations = [], // 예약 정보 (예약과 연결된 방문 기록의 날짜/시간 확인용)

  isVisitLogsLoading = false // Supabase visit_logs 로딩 상태

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

      feature: [],

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

        feature: [],

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

  

  // 예약과 연결된 방문 기록인지 확인하는 헬퍼 함수 (성능 최적화: useCallback으로 메모이제이션)

  const findConnectedReservation = useCallback((visit) => {

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

  }, [reservations, customer]);

  

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





  // 1) Supabase visit_logs 에서 선택된 고객의 방문 기록만 필터링

  const supabaseCustomerVisits = (visitLogs || []).filter((v) => {

    const vCustomerId = v.customerId ?? v.customer_id;

    return (

      vCustomerId &&

      String(vCustomerId) === String(selectedCustomerId)

    );

  });

  
  // 🔍 디버깅: visitLogs 변경 감지
  useEffect(() => {
    console.log('[CustomerDetail] visitLogs 변경됨:', {
      visitLogsLength: visitLogs?.length,
      supabaseCustomerVisitsLength: supabaseCustomerVisits.length,
      selectedCustomerId,
      timestamp: new Date().toISOString()
    });
  }, [visitLogs, selectedCustomerId, supabaseCustomerVisits.length]);



  // 2) 기존 로컬 visits (localStorage 기반)에서 선택된 고객의 방문 기록만 가져오기

  // 여러 키를 확인: selectedCustomerId (Supabase UUID), 그리고 다른 가능한 형식들

  let localCustomerVisits = [];

  

  // visits prop이 업데이트되었는지 확인

  console.log('[CustomerDetail] visits prop 확인:', {

    selectedCustomerId,

    visitsType: typeof visits,

    visitsIsObject: visits && typeof visits === 'object',

    visitsKeys: visits && typeof visits === 'object' ? Object.keys(visits).slice(0, 5) : [],

    hasDirectKey: visits && typeof visits === 'object' ? !!visits[selectedCustomerId] : false,

    directKeyCount: visits && typeof visits === 'object' && visits[selectedCustomerId] ? visits[selectedCustomerId].length : 0

  });

  

  if (visits && typeof visits === 'object') {

    // 1순위: Supabase UUID로 직접 찾기

    let raw = visits[selectedCustomerId];

    

    // 2순위: UUID가 없으면 모든 키를 순회하면서 visit의 customerId와 매칭

    if (!raw || !Array.isArray(raw) || raw.length === 0) {

      const allVisits = Object.values(visits).flat();

      raw = allVisits.filter((visit) => {

        const visitCustomerId = visit.customerId || visit.customer_id;

        return visitCustomerId && String(visitCustomerId) === String(selectedCustomerId);

      });

    }

    

    if (Array.isArray(raw)) {

      localCustomerVisits = raw;

    }

  }

  

  // localStorage에서 직접 확인 (디버깅용) - mallo_visits 키 사용

  try {

    const localStorageVisits = localStorage.getItem('mallo_visits');

    if (localStorageVisits) {

      const parsed = JSON.parse(localStorageVisits);

      const directVisit = parsed[selectedCustomerId];

      console.log('[CustomerDetail] localStorage 직접 확인 (mallo_visits):', {

        selectedCustomerId,

        hasDirectKey: !!directVisit,

        directVisitCount: directVisit?.length || 0,

        directVisitFirst: directVisit?.[0] ? {

          id: directVisit[0].id,

          customerId: directVisit[0].customerId || directVisit[0].customer_id,

          tags: directVisit[0].tags,

          visitTags: directVisit[0].visitTags,

          allKeys: Object.keys(directVisit[0] || {})

        } : null,

        allKeysInVisits: Object.keys(parsed || {}).slice(0, 10)

      });

    } else {

      console.warn('[CustomerDetail] mallo_visits가 localStorage에 없음');

    }

  } catch (e) {

    console.warn('[CustomerDetail] localStorage 확인 실패:', e);

  }

  

  console.log('[CustomerDetail] 로컬 visits 찾기:', {

    selectedCustomerId,

    visitsKeys: visits ? Object.keys(visits).slice(0, 5) : [],

    localCustomerVisitsCount: localCustomerVisits.length,

    localVisitIds: localCustomerVisits.map(v => ({ 

      id: v.id, 

      customerId: v.customerId || v.customer_id, 

      tags: v.tags,

      visitTags: v.visitTags,

      detailTags: v.detail?.tags,

      summaryJsonTags: v.summaryJson?.tags,

      summary_jsonTags: v.summary_json?.tags,

      serviceTags: v.serviceTags,

      summaryTags: v.summaryTags,

      tagLabels: v.tagLabels,

      autoTags: v.autoTags

    }))

  });



  console.log('[CustomerDetail] 데이터 소스 확인:', {

    selectedCustomerId,

    supabaseVisitsCount: supabaseCustomerVisits.length,

    localVisitsCount: localCustomerVisits.length,

    supabaseVisitIds: supabaseCustomerVisits.map(v => ({ id: v.id, tags: v.tags })),

    localVisitIds: localCustomerVisits.map(v => ({ id: v.id, tags: v.tags, visitTags: v.visitTags }))

  });



  // ✅ 태그를 Supabase에 한 번만 동기화하기 위한 ref

  const syncedVisitTagsRef = useRef(new Set());



  // 3) Supabase + 로컬 방문 기록 합치기 및 정렬 (성능 최적화: useMemo로 메모이제이션)

  const uniqueSortedCustomerVisits = React.useMemo(() => {

    // 로컬 visits를 Map으로 변환하여 빠른 조회 가능하도록 함

    const localVisitsMap = new Map();

    localCustomerVisits.forEach((visit) => {

      if (visit && visit.id) {

        localVisitsMap.set(visit.id, visit);

      }

    });



    console.log('[CustomerDetail] 병합 전:', {

      supabaseVisitsCount: supabaseCustomerVisits.length,

      localVisitsCount: localCustomerVisits.length,

      localVisitsMapSize: localVisitsMap.size,

      localVisitIds: Array.from(localVisitsMap.keys()).slice(0, 5),

      supabaseVisitIds: supabaseCustomerVisits.map(v => v.id).slice(0, 5)

    });



    // Supabase 방문 기록에 로컬 태그 정보 병합

    // ID로 직접 매칭이 안 될 경우를 대비해 날짜/시간/제목으로도 매칭 시도

    const mergedSupabaseVisits = supabaseCustomerVisits.map((supabaseVisit) => {

      // 1순위: ID로 직접 매칭

      let localVisit = localVisitsMap.get(supabaseVisit.id);

      

      // 2순위: ID 매칭 실패 시 날짜/시간/제목으로 매칭

      if (!localVisit) {

        const supabaseDate = supabaseVisit.serviceDate || supabaseVisit.date;

        const supabaseTime = supabaseVisit.serviceTime || supabaseVisit.time;

        const supabaseTitle = supabaseVisit.title || '';

        

        localVisit = localCustomerVisits.find((lv) => {

          const localDate = lv.serviceDate || lv.date;

          const localTime = lv.serviceTime || lv.time;

          const localTitle = lv.title || '';

          

          return (

            localDate === supabaseDate &&

            localTime === supabaseTime &&

            localTitle === supabaseTitle

          );

        });

      }

      

      if (!localVisit) {

        // 로컬에 없으면 Supabase 데이터 그대로 사용

        return supabaseVisit;

      }



      // ✅ Supabase를 단일 진실의 원천으로 사용
      // 로컬 태그는 완전히 무시하고 항상 Supabase 태그만 사용
      const normalizedTags = Array.isArray(supabaseVisit.tags)
        ? supabaseVisit.tags
        : [];

      return {
        ...supabaseVisit,
        tags: normalizedTags,
        visitTags: normalizedTags,
        detail: {
          ...supabaseVisit.detail,
          tags: normalizedTags,
        },
        summaryJson: {
          ...supabaseVisit.summaryJson,
          tags: normalizedTags,
        },
        summary_json: {
          ...supabaseVisit.summary_json,
          tags: normalizedTags,
        },
      };

    });



    // Supabase + 로컬 방문 기록 합치기 (로컬에만 있는 것들도 포함)

    const mergedVisits = [...mergedSupabaseVisits, ...localCustomerVisits];



    // 날짜와 시간 기준 내림차순 정렬 (최신 것이 위에 오도록)

    const sorted = [...mergedVisits].sort((a, b) => {

      // 날짜 비교 (serviceDate -> date 순으로 사용)

      const dateA = (a.serviceDate || a.date || '').toString();

      const dateB = (b.serviceDate || b.date || '').toString();

      

      // 날짜가 다르면 날짜 기준으로 내림차순 정렬

      if (dateA !== dateB) {

        return dateB.localeCompare(dateA); // 내림차순

      }

      

      // 날짜가 같으면 시간 기준으로 내림차순 정렬

      const tA = (a.serviceTime || a.time || '').toString();

      const tB = (b.serviceTime || b.time || '').toString();

      return tB.localeCompare(tA); // 내림차순

    });



    // 중복 제거: 같은 visit.id가 여러 번 들어와도 처음 것만 유지

    const map = new Map();

    sorted.forEach((visit) => {

      if (!visit || !visit.id) return;

      if (!map.has(visit.id)) {

        map.set(visit.id, visit);

      }

    });



    return Array.from(map.values());

  }, [supabaseCustomerVisits, localCustomerVisits]);



  // 방문 회차 계산: 오름차순 정렬된 리스트를 기준으로 회차 매핑 생성

  const visitOrderMap = React.useMemo(() => {

    // 오름차순 정렬 (가장 옛날 = 1번째, 최신 = N번째)

    const ascendingSorted = [...uniqueSortedCustomerVisits].sort((a, b) => {

      const dateA = (a.serviceDate || a.date || '').toString();

      const dateB = (b.serviceDate || b.date || '').toString();

      

      if (dateA !== dateB) {

        return dateA.localeCompare(dateB); // 오름차순

      }

      

      const tA = (a.serviceTime || a.time || '').toString();

      const tB = (b.serviceTime || b.time || '').toString();

      return tA.localeCompare(tB); // 오름차순

    });

    

    // 각 방문 기록에 회차 번호 매핑

    const orderMap = new Map();

    ascendingSorted.forEach((visit, index) => {

      if (visit && visit.id) {

        orderMap.set(visit.id, index + 1); // 1번째부터 시작

      }

    });

    

    return orderMap;

  }, [uniqueSortedCustomerVisits]);






  // 성능 최적화: visibleVisitCount만큼만 렌더링할 방문 기록 메모이제이션

  // 초기 로딩: 최근 15개만 먼저 표시 (페이지네이션)

  const initialLoadCount = 15;

  

  // 고객 변경 시 초기 로딩 개수로 리셋

  useEffect(() => {

    if (visibleVisitCount < initialLoadCount) {

      setVisibleVisitCount(initialLoadCount);

    }

  }, [selectedCustomerId]); // 고객이 변경될 때만 리셋

  

  const visibleVisits = React.useMemo(() => {

    // visibleVisitCount가 initialLoadCount보다 작으면 initialLoadCount 사용

    const count = Math.max(visibleVisitCount, initialLoadCount);

    return uniqueSortedCustomerVisits.slice(0, count);

  }, [uniqueSortedCustomerVisits, visibleVisitCount]);



  // 방문 기록의 날짜/시간 및 제목 계산을 useMemo로 최적화

  const processedVisits = React.useMemo(() => {

    return visibleVisits.map((visit) => {

      // 날짜/시간 정보 준비

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

      const safeName = customer?.name?.trim() || '미기재';

      const displayTitle = cleanVisitTitle(

        visit.title || visit.subject || visit.summary || '',

        safeName

      );



      // 방문 회차 계산

      const visitOrder = visitOrderMap.get(visit.id) || 0;



      // normalizedVisit 계산

      const normalizedVisit = normalizeRecordWithCustomer(visit, customer);



      // visit에도 태그가 포함되도록 보장 (VisitHistoryItem에서 visit prop도 사용할 수 있음)

      const visitWithTags = {

        ...visit,

        // normalizedVisit의 태그를 visit에도 포함

        tags: normalizedVisit?.tags || visit.tags || [],

        visitTags: normalizedVisit?.visitTags || visit.visitTags || normalizedVisit?.tags || visit.tags || [],

        detail: {

          ...visit.detail,

          tags: normalizedVisit?.detail?.tags || visit.detail?.tags || normalizedVisit?.tags || visit.tags || []

        },

        summaryJson: {

          ...visit.summaryJson,

          tags: normalizedVisit?.summaryJson?.tags || visit.summaryJson?.tags || normalizedVisit?.tags || visit.tags || []

        },

        summary_json: {

          ...visit.summary_json,

          tags: normalizedVisit?.summary_json?.tags || visit.summary_json?.tags || normalizedVisit?.tags || visit.tags || []

        }

      };



      return {

        visit: visitWithTags,

        connectedReservation,

        dateTimeDisplay,

        displayTitle,

        visitOrder,

        normalizedVisit,

        safeName,

        safePhone: customer?.phone?.trim() || '미기재'

      };

    });

  }, [visibleVisits, findConnectedReservation, extractServiceDateTimeLabel, formatVisitDateTime, customer, visitOrderMap, normalizeRecordWithCustomer, cleanVisitTitle]);



  // 로딩 상태: 초기 데이터 로딩 중인지 확인 (짧은 시간만 표시)

  const isLoading = React.useMemo(() => {

    // visitLogs가 아직 로드되지 않았거나, 데이터가 없고 고객도 없는 경우에만 로딩 표시

    return !visitLogs || (visitLogs.length === 0 && !customer && uniqueSortedCustomerVisits.length === 0);

  }, [visitLogs, customer, uniqueSortedCustomerVisits.length]);

  

  // 고객별 방문 기록 개수 (Supabase visit_logs 기준)

  const visitCountFromLogs = Array.isArray(uniqueSortedCustomerVisits)

    ? uniqueSortedCustomerVisits.length

    : 0;

  

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

          feature: [],

          caution: [],

          trait: [],

          payment: [],

          pattern: []

        },

        visitCount: uniqueSortedCustomerVisits.length,

        // 삭제된 고객임을 표시하는 플래그

        isDeleted: true

      };

    }

  }

  

  

  // ✅ 고객 태그를 화면용 칩 배열로 변환

  const customerTagChips = useMemo(() => {

    if (!customer) return [];



    const chips = [];



    // 1) customer.customerTags 구조에서 태그 꺼내기

    if (customer.customerTags && typeof customer.customerTags === 'object') {

      Object.entries(customer.customerTags).forEach(([category, list]) => {

        if (!Array.isArray(list)) return;



        list.forEach((tag) => {

          // tag가 문자열이거나, { label: '...' } 형태거나 둘 다 안전하게 처리

          const label =

            typeof tag === 'string'

              ? tag

              : (tag && (tag.label || tag.name)) || String(tag || '');



          if (!label || label.trim() === '') return;



          // 중복 제거 (같은 라벨은 한 번만)

          const exists = chips.some((c) => c.label === label);

          if (!exists) {

            chips.push({

              category,

              label,

            });

          }

        });

      });

    }





    return chips;

  }, [customer]);

  

  // ✅ 선택된 고객의 방문 기록만 필터링해서 customerVisits로 사용 (내림차순 정렬)

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

        // 날짜 비교 (serviceDate -> date 순으로 사용)

        const dateA = (a.service_date || a.serviceDate || a.date || '').toString();

        const dateB = (b.service_date || b.serviceDate || b.date || '').toString();

        

        // 날짜가 다르면 날짜 기준으로 내림차순 정렬

        if (dateA !== dateB) {

          return dateB.localeCompare(dateA); // 내림차순

        }

        

        // 날짜가 같으면 시간 기준으로 내림차순 정렬

        const timeA = (a.service_time || a.serviceTime || a.time || '').toString();

        const timeB = (b.service_time || b.serviceTime || b.time || '').toString();

        return timeB.localeCompare(timeA); // 내림차순

      });

  }, [visitLogs, selectedCustomerId]);

  // 🔹 방문 히스토리 스켈레톤이 "처음 로딩 1번만" 뜨도록 하는 상태
  const [hasShownInitialCustomerVisitsLoading, setHasShownInitialCustomerVisitsLoading] = useState(false);

  // 🔹 방문 히스토리가 한 번이라도 로딩되면 플래그를 true로 고정
  useEffect(() => {
    if (!hasShownInitialCustomerVisitsLoading
        && Array.isArray(customerVisits)
        && customerVisits.length > 0) {
      setHasShownInitialCustomerVisitsLoading(true);
    }
  }, [hasShownInitialCustomerVisitsLoading, customerVisits]);

  // 🔹 스켈레톤을 보여줄지 여부 (처음 1회만 true가 될 수 있게)
  const shouldShowCustomerVisitsLoading =
    isVisitLogsLoading &&                      // 원래 쓰던 로딩 플래그
    !hasShownInitialCustomerVisitsLoading &&   // 아직 처음 로딩 전이고
    (!customerVisits || customerVisits.length === 0); // 데이터도 없는 경우에만






  // 더 보기 함수 (15개씩 추가 로드)

  const handleLoadMoreVisits = () => {

    setVisibleVisitCount((prev) => Math.min(prev + 15, uniqueSortedCustomerVisits.length));

  };



  // 접기 함수 (초기 개수로 리셋)

  const handleCollapseVisits = () => {

    setVisibleVisitCount(initialLoadCount);

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



      <main className="flex-1 overflow-y-auto px-5 pt-5 space-y-4 pb-40">

        {/* 고객 정보 카드 */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative" style={{ padding: '12px 16px' }}>

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

            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors"

            style={{ color: '#C9A27A' }}

            title="편집"

          >

            <Edit size={20} />

          </button>

          <div className="flex items-center gap-6 mb-4">

            <div className="flex-1">

              <div className="flex items-center gap-2 mb-2">

                <h3 className="font-bold text-2xl" style={{ color: '#232323' }}>{customer.name}</h3>

                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100" style={{ color: '#232323' }}>

                  {visitCountFromLogs}회방문

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

                const allTags = formatCustomerTagsForDisplay(customer.customerTags || {}, visitCountFromLogs);

                

                if (allTags.length === 0) return null;

                

                return (

                  <div className="flex flex-wrap gap-2 mt-2">

                    {allTags.map((item, idx) => {

                      const isCaution = item.type === 'caution';

                      const isFeature = item.type === 'feature';

                      return (

                        <span

                          key={idx}

                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${

                            isCaution 

                              ? 'bg-red-50 text-red-600 border border-red-100' 

                              : isFeature

                              ? 'bg-blue-50 text-blue-700 border border-blue-200'

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

          {shouldShowCustomerVisitsLoading ? (

            // 스켈레톤 UI: 로딩 중

            <div className="space-y-3">

              {[...Array(3)].map((_, idx) => (

                <VisitHistorySkeleton key={idx} />

              ))}

            </div>

          ) : uniqueSortedCustomerVisits.length === 0 ? (

            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">

              <p className="font-light text-base" style={{ color: '#232323', opacity: 0.6 }}>방문 기록이 없습니다</p>

            </div>

          ) : (

            processedVisits.map((processed) => (

              <VisitHistoryItem

                key={processed.visit.id}

                visit={processed.visit}

                customer={customer}

                visitOrder={processed.visitOrder}

                connectedReservation={processed.connectedReservation}

                dateTimeDisplay={processed.dateTimeDisplay}

                displayTitle={processed.displayTitle}

                normalizedVisit={processed.normalizedVisit}

                safeName={processed.safeName}

                safePhone={processed.safePhone}

                expandedVisitId={expandedVisitId}

                setExpandedVisitId={setExpandedVisitId}

                setTempResultData={setTempResultData}

                setEditingVisit={setEditingVisit}

                setEditingCustomer={setEditingCustomer}

                setEditingVisitTagIds={setEditingVisitTagIds}

                setCurrentScreen={setCurrentScreen}

                allVisitTags={allVisitTags}

                convertVisitTagsToIds={convertVisitTagsToIds}

                extractServiceDateTimeLabel={extractServiceDateTimeLabel}

                overrideCustomerInfoLine={overrideCustomerInfoLine}

                formatRecordDateTime={formatRecordDateTime}

                SCREENS={SCREENS}

              />

            ))

          )}

          

          {/* 이전 기록 더 보기 / 접기 버튼 */}

          {(uniqueSortedCustomerVisits.length > visibleVisitCount || visibleVisitCount > initialLoadCount) && (

            <div className="flex justify-center mt-4 mb-20 gap-3">

              {uniqueSortedCustomerVisits.length > visibleVisitCount && (

                <button

                  onClick={handleLoadMoreVisits}

                  className="px-4 py-2 text-sm rounded-full border border-[#C9A27A] text-[#C9A27A] bg-white/90 shadow-sm hover:bg-[#C9A27A] hover:text-white transition-colors min-w-[180px]"

                >

                  이전 기록 15건 더 보기

                </button>

              )}

              {visibleVisitCount > initialLoadCount && (

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
