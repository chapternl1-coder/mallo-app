import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, X, Clock } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { formatPhoneNumber } from '../utils/formatters';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import ExpandableCalendar from '../components/ExpandableCalendar';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// 간단한 UUID 형식 검사 (Supabase row 삭제 시 사용)
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

function ReservationScreen({
  reservations,
  addReservation,
  deleteReservation,
  customers,
  setCustomers,
  visits,
  setVisits,
  setCurrentScreen,
  setSelectedCustomerId,
  getTodayDateString,
  autoOpenForm = false, // 홈에서 + 버튼으로 진입 시 자동으로 폼 열기
  setShouldOpenReservationForm, // 플래그 리셋용
  refreshCustomers,
  refreshReservations,
  visitLogs = [],   // ✅ 추가
  refetchVisitLogs,  // ✅ Supabase visit_logs 새로고침용
}) {
  const [showForm, setShowForm] = useState(true); // 항상 예약 추가창 열어놓기
  const [timeInput, setTimeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedExistingCustomerId, setSelectedExistingCustomerId] =
    useState(null);
  const [showMatchingCustomers, setShowMatchingCustomers] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { user } = useAuth();

  // 페이지 진입 시 스크롤을 최상단으로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  // 페이지 진입 시 항상 폼 열기
  useEffect(() => {
    setShowForm(true);
    // 플래그 리셋 (있는 경우)
    if (setShouldOpenReservationForm) {
      setShouldOpenReservationForm(false);
    }
  }, [setShouldOpenReservationForm]);

  // 15초마다 예약/고객 데이터를 다시 가져와 예약 화면을 최신 상태로 유지
  useEffect(() => {
    if (typeof refreshReservations !== 'function') return undefined;
    const id = setInterval(() => {
      refreshReservations();
      // 고객 목록도 최신화가 필요하면 함께 호출
      if (typeof refreshCustomers === 'function') {
        refreshCustomers();
      }
    }, 15000);
    return () => clearInterval(id);
  }, [refreshReservations, refreshCustomers]);

  // 선택된 날짜 문자열 (YYYY-MM-DD 형식)
  const selectedDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  // 오늘 날짜 문자열
  const todayDateStr = useMemo(() => {
    if (getTodayDateString) return getTodayDateString();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [getTodayDateString]);

  // 선택된 날짜의 예약만 필터링하고 시간순 오름차순 정렬
  const filteredReservations = useMemo(() => {
    const filtered = (reservations || []).filter(
      (res) => res && res.date === selectedDateStr
    );
    
    // 시간순 오름차순 정렬 (시간이 없는 것은 맨 아래)
    return filtered.sort((a, b) => {
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      return timeA.localeCompare(timeB); // 오름차순
    });
  }, [reservations, selectedDateStr]);

  const todayLabel = useMemo(() => {
    const now = new Date();
    return `${now.getMonth() + 1}월 ${now.getDate()}일`;
  }, []);

  // 이름 입력으로 기존 고객 자동완성 (최소 2글자, 최대 8개, 정확 일치 우선 정렬)
  const matchingCustomers = useMemo(() => {
    const q = nameInput.trim();
    // 최소 2글자 제한
    if (q.length < 2) return [];
    if (!customers || customers.length === 0) return [];
    return filterCustomersBySearch(customers, q, 8);
  }, [nameInput, customers]);

  const handleSelectExistingCustomer = (customer) => {
    setNameInput(customer.name || '');
    setPhoneInput(customer.phone || '');
    setSelectedExistingCustomerId(customer.id);
    setShowMatchingCustomers(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setTimeInput('');
    setNameInput('');
    setPhoneInput('');
    setSelectedExistingCustomerId(null);
    setShowMatchingCustomers(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedPhone = phoneInput.trim();

    // 1) 기본 입력값 검증 (시간/이름/전화)
    if (!timeInput || !trimmedName || !trimmedPhone) {
      alert('시간, 이름, 전화번호를 모두 입력해 주세요.');
      return;
    }

    const time = timeInput;
    const name = trimmedName;
    const phone = trimmedPhone;
    const selectedDateKey = selectedDateStr;
    const memo = ''; // 메모는 현재 폼에 없으므로 빈 문자열

    // Supabase에 연결할 수 없는 경우: 기존 로컬 로직만 실행해서 앱이 깨지지 않도록
    const isSupabaseReady = !!user;

    let customerId = null;

    // 2) 중복 전화번호 확인 - 같은 번호가 이미 있으면 예약 추가 막기
    if (isSupabaseReady) {
      try {
        // 기존 고객 조회 (전화번호로)
        const { data: existing, error: selectError } = await supabase
          .from('customers')
          .select('*')
          .eq('owner_id', user.id)
          .eq('phone', phone)
          .limit(1);

        if (selectError) {
          console.error('[Supabase] customers 조회 에러:', selectError);
        }

        const existingCustomer = existing?.[0];

        // ✅ 전화번호가 이미 등록된 고객이 있고, 자동완성으로 선택하지 않은 경우 예약 추가 막기
        if (existingCustomer && !selectedExistingCustomerId) {
          alert(`이미 등록된 전화번호입니다.\n기존 고객: ${existingCustomer.name}\n이름 입력란에서 기존 고객을 선택해 주세요.`);
          return;
        }

        let customerRow = existingCustomer ?? null;

        // 없으면 새로 insert
        if (!customerRow) {
          const { data: inserted, error: insertError } = await supabase
            .from('customers')
            .insert({
              owner_id: user.id,
              name,
              phone,
              memo: '', // 필요하면 나중에 메모도 넣자
            })
            .select()
            .single();

          if (insertError) {
            console.error('[Supabase] customers insert 에러:', insertError);
          } else {
            customerRow = inserted;

            // ✅ 로컬 customers 상태에도 즉시 추가 (검색용)
            if (typeof setCustomers === 'function') {
              setCustomers((prev) => [...prev, inserted]);
            }
            // ✅ Supabase 최신 고객 목록 다시 가져오기 (홈 검색에 즉시 반영)
            if (typeof refreshCustomers === 'function') {
              console.log('[ReservationScreen] 새 고객 추가 후 Supabase 데이터 새로고침');
              refreshCustomers();
            }
          }
        }

        customerId = customerRow?.id ?? null;
      } catch (e) {
        console.error('[Supabase] customers 처리 중 예외:', e);
      }
    }

    // 자동완성에서 직접 선택한 고객 ID가 있으면 우선 사용
    const customerIdToUse = selectedExistingCustomerId || customerId || null;

    // 3) reservations 테이블에 예약 row insert
    let supabaseReservationId = null;

    if (isSupabaseReady) {
      try {
        // selectedDateKey 예: '2025-12-06'
        const dateKey = selectedDateKey;

        // time 예: '11:11'
        const [hh, mm] =
          typeof time === 'string' && time.includes(':')
            ? time.split(':')
            : ['00', '00'];

        const reservedAt = new Date(`${dateKey}T${hh}:${mm}:00+09:00`).toISOString();

        const { data: reservationRow, error: reservationError } = await supabase
          .from('reservations')
          .insert({
            owner_id: user.id,         // RLS를 위해 꼭 필요
            customer_id: customerIdToUse,   // 위에서 구한 고객 id (없으면 null 허용)
            reserved_at: reservedAt,   // 예약 날짜/시간
            status: 'scheduled',
            memo: memo || '',
          })
          .select()
          .single();

        if (reservationError) {
          console.error('[Supabase] reservations insert 에러:', reservationError);
        } else {
          supabaseReservationId = reservationRow.id;
          console.log('[Supabase] reservations insert 성공:', reservationRow);
          // Supabase 최신 상태를 즉시 반영 (다른 기기/화면에서도 새로고침 없이 보이도록)
          if (typeof refreshReservations === 'function') {
            refreshReservations();
          }
        }
      } catch (e) {
        console.error('[Supabase] reservations 처리 중 예외:', e);
      }
    }

    // 4) 기존 앱 내부 상태(로컬)에도 동일한 예약 추가
    //    - id는 Supabase에서 넘어온 id가 있으면 그걸 쓰고, 아니면 기존 방식(Date.now 등)을 그대로 써줘.
    
    // isNew 플래그 계산
    let isFirstReservationForCustomer = true;
    if (customerIdToUse) {
      isFirstReservationForCustomer = !(reservations || []).some(
        (res) => res.customerId === customerIdToUse
      );
    }
    const isNewFlag = !customerIdToUse || isFirstReservationForCustomer;
    
    const localReservation = {
      id: supabaseReservationId || Date.now().toString(),
      date: selectedDateKey,
      time,
      name,
      phone,
      memo,
      customerId: customerIdToUse || null,
      phoneLast4: phone.slice(-4),
      isCompleted: false,
      isNew: isNewFlag, // 👈 추가
    };

    console.log('[예약 추가 로컬]', localReservation);

    // 기존에 사용하던 addReservation / addReservationForDate 등의 함수 그대로 사용
    if (addReservation) {
      const result = addReservation(localReservation);
      console.log('[예약 추가 결과]', result);
      alert('예약을 추가했습니다.');
    } else {
      console.error('[예약 추가 실패] addReservation 함수가 없습니다.');
    }

    // 로컬 추가 이후에도 Supabase 최신 데이터를 한 번 더 가져와 동기화
    if (typeof refreshReservations === 'function') {
      refreshReservations();
    }

    // 5) 폼 리셋 (예약 화면에 그대로 머무름)
    // ✅ 이제는 예약 화면에 그대로 남기고, 폼만 초기화
    setTimeInput('');
    setNameInput('');
    setPhoneInput('');
    setSelectedExistingCustomerId(null);
    setShowMatchingCustomers(false);
    // 폼은 열어둠 (setShowForm(false) 호출하지 않음)
    
    // 예약 추가 후 자동으로 홈으로 이동하는 동작 제거
    // if (setCurrentScreen) {
    //   setCurrentScreen(SCREENS.HOME);
    // }
  };

  // 예약 삭제
  const handleRemoveReservation = async (id) => {
    const ok = window.confirm('이 예약을 삭제하시겠습니까?');
    if (!ok) return;
    
    // 삭제 대상 예약 정보 찾기
    const target = reservations.find((r) => r.id === id);
    const targetCustomerId = target?.customerId ?? target?.customer_id ?? null;
    const targetDate = target?.date; // 예약 날짜

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[예약 삭제 디버그] 시작');
    console.log('예약 ID:', id);
    console.log('고객 ID:', targetCustomerId);
    console.log('예약 날짜:', targetDate);

    // ✅ 1) 삭제 전에 먼저 신규 고객인지 확인 (다른 예약/방문 기록이 있는지)
    const hasOtherReservations = (reservations || []).some(
      (r) =>
        r.id !== id &&
        (r.customerId === targetCustomerId || r.customer_id === targetCustomerId)
    );
    console.log('다른 예약이 있나?', hasOtherReservations);

    // 이 예약과 연결된 방문 기록 외에 다른 방문 기록이 있는지 확인
    const customerVisits = visits && targetCustomerId ? (visits[targetCustomerId] || []) : [];
    console.log('고객의 로컬 방문 기록:', customerVisits.length, '개');
    customerVisits.forEach((v, idx) => {
      console.log(`  [${idx}] id: ${v.id}, reservationId: ${v.reservationId}, reservation_id: ${v.reservation_id}, date: ${v.date}`);
      console.log(`      → 삭제할 예약 ID와 같나? reservationId=${v.reservationId === id}, reservation_id=${v.reservation_id === id}`);
      console.log(`      → 예약과 같은 날짜인가? ${v.date === targetDate}`);
    });
    // 이 예약과 연결된 방문 기록 제외:
    // 1) reservation_id가 예약 ID와 같거나
    // 2) reservation_id가 없고(undefined) 날짜가 예약 날짜와 같은 경우
    const otherVisitsCount = customerVisits.filter((v) => {
      const isLinkedById = v.reservationId === id || v.reservation_id === id;
      const isLinkedByDate = !v.reservationId && !v.reservation_id && v.date === targetDate;
      return !isLinkedById && !isLinkedByDate;
    }).length;
    const hasOtherLocalVisits = otherVisitsCount > 0;
    console.log('다른 로컬 방문 기록이 있나?', hasOtherLocalVisits, `(${otherVisitsCount}개)`);
    
    const allSupabaseVisitLogsForCustomer = (visitLogs || []).filter(
      (v) =>
        v &&
        (v.customerId === targetCustomerId || v.customer_id === targetCustomerId)
    );
    console.log('Supabase 방문 기록 전체:', allSupabaseVisitLogsForCustomer.length, '개');
    allSupabaseVisitLogsForCustomer.forEach((v, idx) => {
      const vDate = v.serviceDate || v.date || v.visit_date;
      console.log(`  [${idx}] id: ${v.id}, reservation_id: ${v.reservation_id || v.reservationId}, serviceDate: ${v.serviceDate}`);
      console.log(`      → 삭제할 예약 ID와 같나? ${v.reservation_id === id || v.reservationId === id}`);
      console.log(`      → 예약과 같은 날짜인가? ${vDate === targetDate}`);
    });
    // 이 예약과 연결된 방문 기록 제외:
    // 1) reservation_id가 예약 ID와 같거나
    // 2) reservation_id가 없고(undefined) 날짜가 예약 날짜와 같은 경우
    const otherSupabaseVisitLogs = allSupabaseVisitLogsForCustomer.filter((v) => {
      const isLinkedById = v.reservation_id === id || v.reservationId === id;
      const vDate = v.serviceDate || v.date || v.visit_date;
      const isLinkedByDate = (!v.reservation_id && !v.reservationId) && vDate === targetDate;
      return !isLinkedById && !isLinkedByDate;
    });
    const hasOtherSupabaseVisitLogs = otherSupabaseVisitLogs.length > 0;
    console.log('다른 Supabase 방문 기록이 있나?', hasOtherSupabaseVisitLogs, `(${otherSupabaseVisitLogs.length}개)`);

    // 신규 고객 판단: 다른 예약도 없고, 다른 방문 기록도 없는 경우
    const isNewCustomer = !hasOtherReservations && !hasOtherLocalVisits && !hasOtherSupabaseVisitLogs;
    console.log('🔍 신규 고객인가?', isNewCustomer);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ 2) 예약 삭제
    if (deleteReservation) {
      deleteReservation(id);
    }

    // ✅ 3) 해당 예약과 연결된 방문 기록 삭제 (로컬 visits)
    if (targetCustomerId && typeof setVisits === 'function' && visits) {
      setVisits((prev) => {
        const updated = { ...(prev || {}) };
        if (updated[targetCustomerId]) {
          // 이 예약과 연결된 방문 기록만 삭제:
          // 1) reservation_id가 예약 ID와 같거나
          // 2) reservation_id가 없고 날짜가 예약 날짜와 같은 경우
          updated[targetCustomerId] = updated[targetCustomerId].filter((v) => {
            const isLinkedById = v.reservationId === id || v.reservation_id === id;
            const isLinkedByDate = !v.reservationId && !v.reservation_id && v.date === targetDate;
            return !isLinkedById && !isLinkedByDate;
          });
          // 남은 방문 기록이 없으면 해당 고객의 키를 visits 객체에서 제거
          if (updated[targetCustomerId].length === 0) {
            delete updated[targetCustomerId];
          }
        }
        // localStorage 업데이트
        try {
          localStorage.setItem('mallo_visits', JSON.stringify(updated));
        } catch (e) {
          console.warn('[ReservationScreen] localStorage(visits) 저장 실패:', e);
        }
        return updated;
      });
    }

    // ✅ 4) Supabase visit_logs에서도 해당 예약과 연결된 방문 기록 삭제
    if (user && isValidUuid(id)) {
      try {
        const { error: deleteVisitError } = await supabase
          .from('visit_logs')
          .delete()
          .eq('reservation_id', id)
          .eq('owner_id', user.id);
        
        if (deleteVisitError) {
          console.warn('[ReservationScreen] visit_logs 삭제 실패:', deleteVisitError.message);
        }
      } catch (e) {
        console.warn('[ReservationScreen] visit_logs 삭제 예외:', e);
      }
    }

    // ✅ 5) Supabase visit_logs 새로고침
    if (refetchVisitLogs) {
      refetchVisitLogs();
    }

    // ✅ 6) 신규 고객이면 프로필까지 완전히 삭제
    if (isNewCustomer && targetCustomerId) {
      console.log('[ReservationScreen] 🔥 신규 고객 프로필 삭제 시작:', targetCustomerId);
      
      // 로컬 고객 목록에서 제거
      if (typeof setCustomers === 'function') {
        setCustomers((prev) =>
          prev.filter((c) => String(c.id) !== String(targetCustomerId))
        );
      }

      // Supabase에서도 고객 삭제 (UUID인 경우만 시도)
      if (user && isValidUuid(targetCustomerId)) {
        try {
          const { error: deleteCustomerError } = await supabase
            .from('customers')
            .delete()
            .eq('id', targetCustomerId)
            .eq('owner_id', user.id);
          
          if (deleteCustomerError) {
            console.warn('[ReservationScreen] 고객 삭제 실패:', deleteCustomerError.message);
          } else {
            console.log('[ReservationScreen] ✅ 고객 삭제 성공:', targetCustomerId);
          }
        } catch (e) {
          console.warn('[ReservationScreen] 고객 삭제 예외:', e);
        }
      }

      // ✅ Supabase customers 새로고침 (삭제된 고객이 목록에서 사라지도록)
      if (typeof refreshCustomers === 'function') {
        refreshCustomers();
      }
    }

    alert('예약을 삭제했습니다.');
  };

  return (
    <div
      className="flex flex-col h-dvh bg-[#F2F0E6] font-sans"
      style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
    >
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 전체 컨텐츠 영역 - 스크롤 가능 */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 pt-5 pb-28">
          {/* 캘린더 */}
          <div className="mb-2">
            <ExpandableCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              reservations={reservations}
            />
          </div>

          {/* 예약 추가 버튼 / 폼 */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-[#E1D7C6] bg-[#F8F5EE] text-sm font-medium text-[#A07B4F]"
            >
              + 예약 추가
            </button>
          )}

          {showForm && (
                <div
                  className="mb-4 rounded-2xl bg-[#F8F5EE] px-4 py-3 shadow-sm relative"
              >
                  {/* 시간과 이름 입력 (한 줄) */}
                  <div className="mb-3 grid grid-cols-2 gap-3 relative">
                    {/* 시간 입력 */}
                    <div>
                      <label className="mb-1 block text-[11px] text-[#9C8D7C]">
                        시간
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          className="h-[36px] w-full rounded-lg border border-[#E3D7C7] bg-white px-3 pr-10 text-[16px] text-[#3F352B] leading-normal box-border"
                          style={{
                            fontSize: '16px', 
                            height: '36px',
                            WebkitAppearance: 'none',
                            MozAppearance: 'textfield'
                          }}
                        />
                        <style dangerouslySetInnerHTML={{
                          __html: `
                            input[type="time"]::-webkit-calendar-picker-indicator {
                              display: none;
                              -webkit-appearance: none;
                            }
                            input[type="time"]::-webkit-inner-spin-button,
                            input[type="time"]::-webkit-outer-spin-button {
                              -webkit-appearance: none;
                              margin: 0;
                            }
                          `
                        }} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Clock size={18} className="text-[#9C8D7C]" />
                        </div>
                      </div>
                            </div>
                          
                    {/* 이름 입력 */}
                    <div className="relative">
                      <label className="mb-1 block text-[11px] text-[#9C8D7C]">
                        이름
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNameInput(value);
                          setSelectedExistingCustomerId(null);
                          // 기존 고객 선택이 해제되면 전화번호도 초기화
                          if (selectedExistingCustomerId) {
                            setPhoneInput('');
                          }
                          // 이름 입력 시 자동완성 리스트 표시 (최소 2글자 이상일 때만)
                          if (value.trim().length >= 2) {
                            setShowMatchingCustomers(true);
                          } else {
                            setShowMatchingCustomers(false);
                          }
                        }}
                        onFocus={() => {
                          // 포커스 시 자동완성 리스트 표시 (최소 2글자 이상일 때만)
                          if (nameInput.trim().length >= 2 && matchingCustomers.length > 0) {
                            setShowMatchingCustomers(true);
                          }
                        }}
                        onBlur={(e) => {
                          // 포커스가 벗어날 때 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록
                          setTimeout(() => {
                            setShowMatchingCustomers(false);
                          }, 200);
                        }}
                        placeholder="고객 이름"
                        className="h-[36px] w-full rounded-lg border border-[#E3D7C7] bg-white px-3 text-[16px] text-[#3F352B] leading-normal box-border"
                        style={{ fontSize: '16px', height: '36px' }}
                      />
                    </div>
                    
                    {/* 기존 고객 자동완성 리스트 (그리드 전체 너비) */}
                    {showMatchingCustomers && matchingCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-[100] max-h-[120px] overflow-y-auto space-y-1 bg-white rounded-xl shadow-lg border border-gray-100 p-2">
                        {matchingCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()} // blur 이벤트 방지
                            onClick={() => handleSelectExistingCustomer(customer)}
                            className="w-full bg-white rounded-lg p-2 shadow-sm border border-gray-100 hover:border-[#C9A27A] transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <h4 className="font-semibold text-sm text-gray-800">
                                  {customer.name || '이름 미입력'}
                                </h4>
                                {customer.phone && (
                                  <span className="text-xs text-gray-600">{customer.phone}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#A07B4F] font-medium flex-shrink-0">
                                기존 고객
                              </span>
                            </div>
                </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 전화번호 입력 */}
                  <div className="mb-2">
                    <label className="mb-1 block text-[11px] text-[#9C8D7C]">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setPhoneInput(formatted);
                      }}
                      placeholder="010-1234-5678"
                      className="h-[36px] w-full rounded-lg border border-[#E3D7C7] bg-white px-3 text-[16px] text-[#3F352B] leading-normal box-border"
                      style={{ fontSize: '16px', height: '36px' }}
                    />
                  </div>


                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-[6.5] h-9 rounded-lg bg-[#C9A27A] text-xs font-semibold text-white"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-[3.5] h-9 rounded-lg bg-white text-xs text-[#8C7A68] border border-[#E3D7C7]"
                    >
                      취소
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] text-[#A79A8E]">
                    이름을 입력하면 기존 고객이 자동으로 검색됩니다.
                    자동완성 목록에서 고객을 선택하면 전화번호가 자동으로 입력되고 기존 고객과 연결됩니다.
                    자동완성 목록을 선택하지 않고 다른 곳을 클릭하면 신규 고객으로 등록할 수 있습니다.
                  </p>
                </div>
          )}

          {/* 예약 리스트 */}
          <section className="mt-4 space-y-2">
            {filteredReservations.map((reservation) => {
                  const displayPhone = reservation.phone || '';
                  
                  // 신규 판단: 예약 생성 시점에 저장된 isNew 플래그 사용 (고정)
                  const isNew = reservation.isNew === true;
                  
                  // 예약 관리 화면에서는 취소선 없이 일반 텍스트로 표시
                  const isCompleted = reservation.isCompleted || false;
                  
                  return (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between rounded-2xl px-4 py-4 shadow-sm border border-[#E8DFD3] bg-white"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <span className="text-[11px] text-[#B18352]">
                          {reservation.time}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 이름 - 예약 관리 화면에서는 취소선 없이 검정색 텍스트 */}
                          <span className="text-sm font-medium text-[#3F352B]">
                            {reservation.name}
                          </span>
                          {displayPhone && (
                            <span className="text-xs text-gray-600">
                              {displayPhone}
                            </span>
                          )}
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full border border-[#C9A27A] text-[10px] text-[#C9A27A] whitespace-nowrap">
                              신규
                            </span>
                )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveReservation(reservation.id)}
                        className="ml-2 text-[#C4B3A2] hover:text-[#A07B4F]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}

            {filteredReservations.length === 0 && (
              <p className="mt-6 text-center text-xs text-[#B0A497]">
                선택한 날짜에 예약이 없습니다. 상단에서 예약을 추가해 보세요.
              </p>
            )}
          </section>
            </div>
      </main>
    </div>
  );
}

export default ReservationScreen;
