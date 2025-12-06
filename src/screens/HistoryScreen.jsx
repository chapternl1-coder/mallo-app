import React, { useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { SCREENS } from '../constants/screens';

// UUID 검증 헬퍼 함수
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

function HistoryScreen({
  allRecords,
  visitLogs = [],   // Supabase visit_logs
  selectedDate,
  setSelectedDate,
  currentTheme,
  setCurrentScreen,
  setSelectedCustomerId,
  setEditingVisit,
  setEditingCustomer,
  customers,
  getTodayDateString,
  extractServiceDateFromSummary,
  extractServiceDateTimeLabel,
  formatRecordDateTime,
  setActiveTab,
  expandedHistoryIds,
  setExpandedHistoryIds,
  reservations,
  visits  // 기존 로컬 visits (객체 or 배열)
}) {
  // "미기재"와 "null"을 실제 고객 정보로 치환
  const overrideCustomerInfoLine = (line, customerInfo) => {
    if (!line) return line;
    let updated = line;

    if (customerInfo?.name) {
      updated = updated.replace(/이름:\s*미기재/g, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름\s*:\s*미기재/g, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름:\s*null/gi, `이름: ${customerInfo.name}`);
      updated = updated.replace(/이름\s*:\s*null/gi, `이름: ${customerInfo.name}`);
    }

    if (customerInfo?.phone) {
      updated = updated.replace(
        /전화번호:\s*미기재/g,
        `전화번호: ${customerInfo.phone}`
      );
      updated = updated.replace(
        /전화번호\s*:\s*미기재/g,
        `전화번호: ${customerInfo.phone}`
      );
      updated = updated.replace(
        /전화번호:\s*null/gi,
        `전화번호: ${customerInfo.phone}`
      );
      updated = updated.replace(
        /전화번호\s*:\s*null/gi,
        `전화번호: ${customerInfo.phone}`
      );
    }

    return updated;
  };

  const todayStr = getTodayDateString();

  const findConnectedReservation = (record) => {
    if (!reservations || reservations.length === 0) return null;

    const recordCustomerId = record.customerId ?? record.customer_id;

    // 1순위: reservationId
    if (record.reservationId) {
      const matchedReservation = reservations.find(
        (r) => r.id === record.reservationId
      );
      if (matchedReservation) return matchedReservation;
    }

    // 2순위: customerId + 날짜
    if (recordCustomerId) {
      const recordDate = record.serviceDate || record.date;
      const matchedReservation = reservations.find((r) => {
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

  const selectedDateKey = selectedDate || getTodayDateString();

  // 선택된 날짜의 방문 기록 가져오기 (Supabase visit_logs + 로컬 visits 모두 사용)
  const recordsForSelectedDate = useMemo(() => {
    const dateKey = selectedDateKey; // 'YYYY-MM-DD'

    // 1) 로컬 visits를 평탄화
    const localVisitsArray = visits
      ? Object.values(visits).flat()
      : [];

    // 2) Supabase visit_logs 배열
    const supabaseVisitsArray = visitLogs || [];

    // 3) 두 소스를 id 기준으로 머지 (Supabase 우선, 로컬은 없는 id만 추가)
    const merged = [...supabaseVisitsArray];
    if (localVisitsArray.length > 0) {
      const existingIds = new Set(
        merged
          .filter(v => v && v.id != null)
          .map(v => String(v.id))
      );

      localVisitsArray.forEach(v => {
        if (!v || v.id == null) return;
        const vid = String(v.id);
        if (!existingIds.has(vid)) {
          merged.push(v);
        }
      });
    }

    const source = merged;

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
        // 우선순위: customer 프로필 (customerId로 찾은 것) > summary_json으로 customers 배열에서 찾기 > v.customerName > summary_json에서 추출
        // customerId가 있으면 무조건 customers 배열의 정보를 사용 (summary_json의 예전 정보 무시)
        let customerName = null;
        let customerPhone = null;
        
        if (customer) {
          // customerId로 찾은 고객이 있으면 무조건 그 정보 사용
          customerName = customer.name?.trim() || null;
          customerPhone = customer.phone?.trim() || null;
        } else {
          // customerId가 없거나 찾지 못한 경우
          // summary_json의 고객 정보로 customers 배열에서 다시 찾기 시도
          const summaryJson = v.summaryJson || v.detail || {};
          const summaryCustomerInfo = summaryJson?.customerInfo || summaryJson?.customer || {};
          
          if (summaryCustomerInfo?.name && customers && customers.length > 0) {
            // 이름으로 customers 배열에서 찾기
            let matchedCustomer = customers.find(c => {
              return c.name?.trim() === summaryCustomerInfo.name?.trim();
            });
            
            // 이름으로 찾지 못하면 전화번호로 찾기 시도
            if (!matchedCustomer && summaryCustomerInfo?.phone) {
              const summaryPhone = String(summaryCustomerInfo.phone).replace(/[^0-9]/g, '');
              matchedCustomer = customers.find(c => {
                const customerPhone = String(c.phone || '').replace(/[^0-9]/g, '');
                return customerPhone === summaryPhone && customerPhone.length > 0;
              });
            }
            
            if (matchedCustomer) {
              // customers 배열에서 찾은 최신 정보 사용
              customerName = matchedCustomer.name?.trim() || null;
              customerPhone = matchedCustomer.phone?.trim() || null;
            } else {
              // customers 배열에서 찾지 못하면 summary_json의 정보 사용
              customerName = summaryCustomerInfo?.name?.trim() || v.customerName?.trim() || null;
              customerPhone = summaryCustomerInfo?.phone?.trim() || v.customerPhone?.trim() || null;
            }
          } else {
            // summary_json에 고객 정보가 없으면 v.customerName 사용
            customerName = v.customerName?.trim() || null;
            customerPhone = v.customerPhone?.trim() || null;
          }
        }

        return {
          id: v.id,
          type: 'visit',
          timeLabel: v.serviceTime || v.time || '--:--',
          customerName: customerName,
          customerPhone: customerPhone,
          title: v.title || '',
          summaryJson: v.summaryJson || v.detail || null,
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

  const filteredRecords = recordsForSelectedDate;

  const extractTimeFromRecord = (record) => {
    const connectedReservation = findConnectedReservation(record);
    if (connectedReservation && connectedReservation.time) {
      const timeStr = String(connectedReservation.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(
          parseInt(minute, 10)
        ).padStart(2, '0')}`;
      }
    }

    const serviceDateTimeLabel = extractServiceDateTimeLabel(record);
    if (serviceDateTimeLabel) {
      const timeMatch = serviceDateTimeLabel.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const [, hh, mm] = timeMatch;
        return `${hh}:${mm}`;
      }
    }

    if (record.time) {
      const timeStr = String(record.time).trim();
      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
        const [hour, minute] = timeStr.split(':');
        return `${String(parseInt(hour, 10)).padStart(2, '0')}:${String(
          parseInt(minute, 10)
        ).padStart(2, '0')}`;
      }
    }

    return '';
  };

  if (filteredRecords.length > 0 && selectedDate) {
    console.log(
      '[HistoryScreen 정렬 전] 날짜:',
      selectedDate,
      '필터링된 기록 수:',
      filteredRecords.length
    );
    filteredRecords.forEach((record, idx) => {
      const time = extractTimeFromRecord(record);
      const dateTimeLabel = extractServiceDateTimeLabel(record);
      console.log(
        `[HistoryScreen 정렬 전] ${idx + 1}번째: 시간=${time}, dateTimeLabel="${dateTimeLabel}", record.time="${
          record.time
        }", 제목="${record.title || record.id}"`
      );
    });
  }

  const sortedRecords = recordsForSelectedDate;

  if (sortedRecords.length > 0 && selectedDate) {
    console.log(
      '[HistoryScreen 정렬] 날짜:',
      selectedDate,
      '총 기록 수:',
      sortedRecords.length
    );
    sortedRecords.forEach((record, idx) => {
      const time = extractTimeFromRecord(record);
      const dateTimeLabel = extractServiceDateTimeLabel(record);
      console.log(
        `[HistoryScreen 정렬] ${idx + 1}번째: 시간=${time}, dateTimeLabel="${dateTimeLabel}", 제목="${
          record.title || record.id
        }"`
      );
    });
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
  };

  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  const handleGoToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const selectedDateLabel = selectedDate
    ? formatDate(selectedDate)
    : '날짜 선택';

  const mainRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
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

      {/* 메인 내용 */}
      <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 pt-5 pb-28">
          {/* 날짜 필터 */}
          <div className="bg-white rounded-2xl border border-[#E2D7C7] shadow-sm px-4 py-3 mb-4 relative">
            <div className="flex items-center mb-2">
              <span className="text-[11px] text-[#A59B90]">기록 날짜</span>
            </div>

            <div className="relative w-full">
              <input
                type="date"
                value={selectedDate || ''}
                onChange={handleDateChange}
                className="absolute inset-0 w-full h-full opacity-0 z-0"
              />

              <div className="w-full flex items-center justify-between rounded-xl bg-[#F7F2EA] px-3 py-2 pointer-events-none relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-[#E2D7C7]">
                    <Calendar
                      className="w-3.5 h-3.5 text-[#C9A27A]"
                      strokeWidth={1.7}
                    />
                  </div>
                  <span className="text-[13px] font-medium text-[#3E2D20]">
                    {selectedDateLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoToday();
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-[#E2D7C7] text-[#3E2E20] bg-white/80 pointer-events-auto"
                  >
                    오늘
                  </button>
                  <ChevronDown
                    className="w-4 h-4 text-[#B7A595]"
                    strokeWidth={1.7}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 전체 시술 기록 */}
          <div className="space-y-4">
            <h3
              className="text-base font-bold flex items-center gap-2"
              style={{ color: textColor }}
            >
              <span>
                {selectedDate
                  ? `${formatDate(selectedDate)} 기록`
                  : '전체 시술 기록'}
              </span>
            </h3>

            {recordsForSelectedDate.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-[#E8DFD3] shadow-sm">
                <p
                  className="font-light text-base"
                  style={{ color: textColor, opacity: 0.6 }}
                >
                  {selectedDate
                    ? '해당 날짜의 시술 기록이 없습니다'
                    : '시술 기록이 없습니다'}
                </p>
              </div>
            ) : (
              <>
                {recordsForSelectedDate.map((record) => {
                  // --- 고객 찾기 로직 (ID → 예약 → 요약 순서로 최대한 연결) ---
                  const recordCustomerId =
                    record.customerId ?? record.customer_id ?? null;

                  let customer = null;
                  if (recordCustomerId && customers?.length) {
                    customer =
                      customers.find(
                        (c) => {
                          const cId = c.id;
                          const rId = recordCustomerId;
                          // 정확히 일치하는 경우
                          if (cId === rId) return true;
                          // 문자열로 변환해서 비교
                          if (String(cId) === String(rId)) return true;
                          // 소문자로 변환해서 비교 (UUID 대소문자 차이)
                          if (String(cId).toLowerCase() === String(rId).toLowerCase()) return true;
                          return false;
                        }
                      ) || null;
                    
                    // 디버깅: 고객을 찾지 못한 경우
                    if (!customer && recordCustomerId) {
                      console.warn(`[HistoryScreen] customerId로 고객을 찾지 못함. record.id: ${record.id?.substring(0, 8)}..., customerId: ${recordCustomerId}`);
                      console.log('   customers 배열 길이:', customers.length);
                      console.log('   customers 배열의 ID들:');
                      customers.forEach((c, idx) => {
                        console.log(`     [${idx}] id: ${c.id} (타입: ${typeof c.id}), name: ${c.name}`);
                      });
                    }
                  }

                  const connectedReservation =
                    findConnectedReservation(record);

                  if (!customer && connectedReservation && customers?.length) {
                    const resCustomerId =
                      connectedReservation.customerId ??
                      connectedReservation.customer_id;
                    if (resCustomerId) {
                      customer =
                        customers.find(
                          (c) => String(c.id) === String(resCustomerId)
                        ) || null;
                    }
                    if (
                      !customer &&
                      connectedReservation.phone &&
                      customers?.length
                    ) {
                      const phone = String(
                        connectedReservation.phone
                      ).replace(/[^0-9]/g, '');
                      customer =
                        customers.find(
                          (c) =>
                            String(c.phone || '')
                              .replace(/[^0-9]/g, '') === phone
                        ) || null;
                    }
                  }

                  const summaryCustomer =
                    record.summaryJson?.customer ||
                    record.detail?.customer ||
                    {};

                  if (!customer && customers?.length) {
                    if (summaryCustomer.phone) {
                      const phone = String(summaryCustomer.phone).replace(
                        /[^0-9]/g,
                        ''
                      );
                      customer =
                        customers.find(
                          (c) =>
                            String(c.phone || '')
                              .replace(/[^0-9]/g, '') === phone
                        ) || null;
                    }
                  }

                  if (!customer && customers?.length) {
                    if (summaryCustomer.name) {
                      const name = summaryCustomer.name.trim();
                      customer =
                        customers.find((c) => (c.name || '').trim() === name) ||
                        null;
                    }
                  }

                  // --- 표시용 이름/전화 fallback ---
                  // customerId로 찾은 고객이 있으면 무조건 그 정보 사용 (summary_json의 예전 정보 무시)
                  let displayName = null;
                  let displayPhone = null;
                  
                  if (customer) {
                    // customerId로 찾은 고객이 있으면 무조건 그 정보 사용
                    displayName = customer.name?.trim() || null;
                    displayPhone = customer.phone?.trim() || null;
                  } else {
                    // customerId가 없거나 찾지 못한 경우
                    // summary_json에서 고객 정보 추출 (customerInfo + sections 모두 확인)
                    const summaryJson = record.summaryJson || record.detail || {};
                    let summaryCustomerInfo = summaryJson?.customerInfo || summaryJson?.customer || {};
                    
                    // summary_json.customerInfo가 없으면 sections에서 추출 시도
                    if (!summaryCustomerInfo?.name && summaryJson?.sections) {
                      for (const section of summaryJson.sections) {
                        if (section.title && section.title.includes('고객 기본 정보') && section.content) {
                          for (const contentItem of section.content) {
                            if (typeof contentItem === 'string') {
                              const nameMatch = contentItem.match(/이름[:\s]+([^\n/]+)/i);
                              if (nameMatch && !summaryCustomerInfo.name) {
                                summaryCustomerInfo.name = nameMatch[1].trim();
                              }
                              const phoneMatch = contentItem.match(/전화번호[:\s]+([^\n/]+)/i);
                              if (phoneMatch && !summaryCustomerInfo.phone) {
                                summaryCustomerInfo.phone = phoneMatch[1].trim();
                              }
                            }
                          }
                        }
                      }
                    }
                    
                    if (summaryCustomerInfo?.name && customers?.length) {
                      // 이름으로 customers 배열에서 찾기
                      let matchedCustomer = customers.find(c => {
                        return c.name?.trim() === summaryCustomerInfo.name?.trim();
                      });
                      
                      // 이름으로 찾지 못하면 전화번호로 찾기 시도
                      if (!matchedCustomer && summaryCustomerInfo?.phone) {
                        const summaryPhone = String(summaryCustomerInfo.phone).replace(/[^0-9]/g, '');
                        matchedCustomer = customers.find(c => {
                          const customerPhone = String(c.phone || '').replace(/[^0-9]/g, '');
                          return customerPhone === summaryPhone && customerPhone.length > 0;
                        });
                      }
                      
                      if (matchedCustomer) {
                        // customers 배열에서 찾은 최신 정보 사용
                        displayName = matchedCustomer.name?.trim() || null;
                        displayPhone = matchedCustomer.phone?.trim() || null;
                        console.log(`[HistoryScreen] summary_json으로 고객 찾기 성공: ${displayName} (${displayPhone})`);
                      } else {
                        // customers 배열에서 찾지 못하면 summary_json의 정보 사용
                        displayName =
                          (summaryCustomerInfo?.name &&
                          summaryCustomerInfo.name.trim() !== '' &&
                          summaryCustomerInfo.name.trim() !== '미기재'
                            ? summaryCustomerInfo.name.trim()
                            : null) ||
                          (record.customerName &&
                          record.customerName.trim() !== '' &&
                          record.customerName.trim() !== '이름 미입력'
                            ? record.customerName.trim()
                            : null) ||
                          null;

                        displayPhone =
                          (summaryCustomerInfo?.phone &&
                          String(summaryCustomerInfo.phone).trim() !== ''
                            ? String(summaryCustomerInfo.phone).trim()
                            : null) ||
                          (record.customerPhone &&
                          record.customerPhone.trim() !== ''
                            ? record.customerPhone.trim()
                            : null) ||
                          null;
                        console.log(`[HistoryScreen] summary_json에서 고객 정보 추출: ${displayName} (${displayPhone})`);
                      }
                    } else if (summaryCustomerInfo?.name) {
                      // summary_json에 고객 정보가 있지만 customers 배열이 없는 경우
                      displayName = summaryCustomerInfo.name.trim() !== '' && summaryCustomerInfo.name.trim() !== '미기재'
                        ? summaryCustomerInfo.name.trim()
                        : null;
                      displayPhone = summaryCustomerInfo.phone && String(summaryCustomerInfo.phone).trim() !== ''
                        ? String(summaryCustomerInfo.phone).trim()
                        : null;
                      console.log(`[HistoryScreen] summary_json에서 고객 정보 직접 사용: ${displayName} (${displayPhone})`);
                    } else {
                      // summary_json에 고객 정보가 없으면 기존 로직 사용
                      displayName =
                        (record.customerName &&
                        record.customerName.trim() !== '' &&
                        record.customerName.trim() !== '이름 미입력'
                          ? record.customerName.trim()
                          : null) ||
                        (summaryCustomer.name &&
                        summaryCustomer.name.trim() !== '' &&
                        summaryCustomer.name.trim() !== '미기재'
                          ? summaryCustomer.name.trim()
                          : null) ||
                        null;

                      displayPhone =
                        (record.customerPhone &&
                        record.customerPhone.trim() !== ''
                          ? record.customerPhone.trim()
                          : null) ||
                        (summaryCustomer.phone &&
                        String(summaryCustomer.phone).trim() !== ''
                          ? String(summaryCustomer.phone).trim()
                          : null) ||
                        null;
                    }
                  }
                  
                  // 디버깅: 고객 연결 상태 확인
                  if (!customer && recordCustomerId) {
                    console.log(`[HistoryScreen] customerId가 있지만 고객을 찾지 못함. record.id: ${record.id?.substring(0, 8)}..., customerId: ${recordCustomerId}`);
                  }
                  if (!customer && !recordCustomerId) {
                    console.log(`[HistoryScreen] customerId가 null. record.id: ${record.id?.substring(0, 8)}..., displayName: ${displayName}, displayPhone: ${displayPhone}`);
                  }

                  const summaryTitle =
                    record.summaryJson?.title || record.title || '';
                  const displayTitle = summaryTitle;

                  const reservationTime = connectedReservation
                    ? connectedReservation.time
                    : null;

                  const reservationTimeLabel = (() => {
                    if (reservationTime) {
                      const timeStr = String(reservationTime).trim();
                      if (/^\d{1,2}:\d{2}/.test(timeStr)) {
                        const [hour, minute] = timeStr.split(':');
                        const hh = String(parseInt(hour, 10)).padStart(
                          2,
                          '0'
                        );
                        const mm = String(parseInt(minute, 10)).padStart(
                          2,
                          '0'
                        );
                        return `${hh}:${mm} 예약`;
                      }
                      return `${reservationTime} 예약`;
                    }
                    return record.timeLabel || '';
                  })();

                  const handleCustomerClick = (record) => {
                    if (!record) return;

                    const recordCustomerId = record.customerId ?? record.customer_id;
                    const targetCustomerId = recordCustomerId || record.customer?.id;

                    // 1단계: UUID 형식인지 확인
                    if (!targetCustomerId || !isValidUuid(targetCustomerId)) {
                      alert('이 방문 기록은 아직 고객 프로필과 연결되지 않았어요.\n고객 페이지에서 먼저 프로필을 만들어 주세요.');
                      return;
                    }

                    // 2단계: 실제 customers 배열에 존재하는지 확인
                    const exists = customers?.some(
                      (c) => c.id && String(c.id) === String(targetCustomerId)
                    );

                    if (!exists) {
                      alert('이 ID로 된 고객 프로필이 없습니다.\n(예전 테스트 데이터일 수 있어요)');
                      return;
                    }

                    // ✅ 여기까지 통과하면 안전하게 고객 상세로 이동
                    setSelectedCustomerId(targetCustomerId);
                    setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
                  };

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
                    <div
                      key={record.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden relative"
                      style={{ padding: '12px 16px' }}
                    >
                      <div className="record-card-main flex flex-col relative">
                        {/* 맨 위줄: 시간 */}
                        {reservationTimeLabel && (
                          <div
                            className="mb-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecordClick(record);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <span
                              className="text-xs font-bold"
                              style={{ color: accentColor }}
                            >
                              {reservationTimeLabel}
                            </span>
                          </div>
                        )}

                        {/* 두 번째 줄: 이름/번호 */}
                        <div
                          className="flex flex-row items-center justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecordClick(record);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {displayName ? (
                            <>
                              <button
                                type="button"
                                style={{
                                  padding: 0,
                                  margin: 0,
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCustomerClick(record);
                                }}
                              >
                                <span
                                  className="text-base font-bold"
                                  style={{ color: textColor }}
                                >
                                  {displayName}
                                </span>
                              </button>
                              {displayPhone && (
                                <span className="ml-2 text-xs text-gray-400">
                                  / {displayPhone}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">
                              이름 미입력
                            </span>
                          )}

                          <button
                            className="absolute right-0 top-0"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecordClick(record);
                            }}
                          >
                            {expandedHistoryIds.has(record.id) ? (
                              <ChevronUp
                                size={20}
                                style={{ color: accentColor }}
                              />
                            ) : (
                              <ChevronDown
                                size={20}
                                style={{ color: accentColor }}
                              />
                            )}
                          </button>
                        </div>

                        {/* 태그 */}
                        {record.tags && record.tags.length > 0 && (
                          <div className="mt-1.5 mb-1.5 max-h-[70px] overflow-hidden flex flex-wrap gap-1.5">
                            {record.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-1 rounded-md"
                                style={{
                                  backgroundColor: '#F2F0E6',
                                  color: '#8C6D46',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 시술 제목 */}
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
                                if (
                                  displayName &&
                                  displayName !== '이름 미입력'
                                ) {
                                  cleanedTitle = cleanedTitle
                                    .replace(
                                      new RegExp(displayName, 'g'),
                                      ''
                                    )
                                    .trim();
                                }
                                cleanedTitle = cleanedTitle
                                  .replace(/기존\s*고객/gi, '')
                                  .trim();
                                cleanedTitle = cleanedTitle
                                  .replace(/신규\s*고객/gi, '')
                                  .trim();
                                cleanedTitle = cleanedTitle
                                  .replace(/\s+/g, ' ')
                                  .trim();
                              }
                              return cleanedTitle || displayTitle || '';
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* 펼친 상세 내용 */}
                      {expandedHistoryIds.has(record.id) &&
                        (record.detail || record.summaryJson) && (
                          <div className="px-5 pb-5 space-y-5 border-t border-gray-200 pt-5 bg-gray-50">
                            {(
                              record.detail?.sections ||
                              record.summaryJson?.sections ||
                              []
                            ).map((section, idx) => {
                              const customerInfoForOverride =
                                record.customer ||
                                customer || {
                                  name:
                                    displayName !== '이름 미입력'
                                      ? displayName
                                      : undefined,
                                  phone:
                                    displayPhone !== '전화번호 미기재'
                                      ? displayPhone
                                      : undefined,
                                };

                              const safeSectionTitle =
                                typeof section.title === 'string'
                                  ? section.title
                                  : typeof section.title === 'object' &&
                                    section.title !== null
                                  ? JSON.stringify(section.title, null, 2)
                                  : String(section.title || '');

                              return (
                                <div key={idx}>
                                  <h5
                                    className="text-base font-bold mb-3"
                                    style={{ color: textColor }}
                                  >
                                    {safeSectionTitle}
                                  </h5>
                                  <ul className="space-y-2">
                                    {section.content.map((item, i) => (
                                      <li
                                        key={i}
                                        className="text-base leading-relaxed pl-4 font-light"
                                        style={{
                                          color: textColor,
                                          borderLeft:
                                            '2px solid #E5E7EB',
                                        }}
                                      >
                                        {overrideCustomerInfoLine(
                                          item,
                                          customerInfoForOverride
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}

                            {(() => {
                              const recordedAt =
                                record.recordedAt ||
                                record.createdAt ||
                                (record.date && record.time
                                  ? `${record.date}T${record.time}:00`
                                  : null);
                              return recordedAt ? (
                                <div className="visit-detail-footer">
                                  기록 일시:{' '}
                                  {formatRecordDateTime(recordedAt)}
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