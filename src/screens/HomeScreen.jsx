import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Clock, User, Calendar, ChevronLeft, ChevronRight, Mic, X, Keyboard, Plus } from 'lucide-react';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import { SCREENS } from '../constants/screens';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import InputModeToggle from '../components/InputModeToggle';
import AppLogo from '../components/AppLogo';

/**
 * 홈 화면 컴포넌트 - 검색 및 예약 중심의 현대적인 UI
 * 
 * 주요 기능:
 * - 고정된 검색창으로 고객 검색
 * - 오늘 방문 예정 고객 리스트
 * - 플로팅 녹음 버튼 (신규/비예약 고객용)
 */

// HomeScreen.jsx 상단, 컴포넌트 바깥에 추가
function getDateKeyFromTimestamp(ts) {
  if (!ts) return '';
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  // 로컬 날짜 기준 YYYY-MM-DD 형태 키 (UTC 버그 방지)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeLabelFromTimestamp(ts) {
  if (!ts) return '--:--';
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function HomeScreen({
  currentScreen,
  setCurrentScreen,
  setActiveTab,
  customers = [],
  searchQuery,
  setSearchQuery,
  setSelectedCustomerId,
  selectedCustomerForRecord,
  setSelectedCustomerForRecord,
  startRecording,
  reservations = [],
  reservationsLoading = false,
  toggleReservationComplete,
  visits = {},
  visitLogs = [], // Supabase visit_logs 추가
  updateReservation,
  setReservations,
  setSelectedReservation,
  userProfile,
  setShouldOpenReservationForm,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateInputRef = useRef(null);
  const [editingMemoReservationId, setEditingMemoReservationId] = useState(null);
  const [tempMemoValue, setTempMemoValue] = useState('');
  const memoInputRef = useRef(null);
  const isComposingRef = useRef(false); // 한글 조합 중인지 추적
  const [inputMode, setInputMode] = useState(() => {
    if (typeof window === 'undefined') return 'voice';
    const saved = window.localStorage.getItem('mallo_input_mode');
    return saved === 'voice' || saved === 'text' ? saved : 'voice';
  });

  // 선택된 날짜를 YYYY-MM-DD 형식으로 변환
  const selectedDateKey = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // ✅ 1) Supabase 훅 제거, App에서 내려준 reservations 로만 필터링
  const todayReservationsForHome = useMemo(() => {
    if (!reservations || reservations.length === 0) return [];

    const targetKey = selectedDateKey; // 예: '2025-12-06'

    // ① 날짜로 필터 (date 필드 직접 사용)
    const sameDayRows = reservations.filter((row) => {
      return row.date === targetKey;
    });

    // ② 홈 카드에서 쓰는 형태로 변환 (이미 필요한 필드가 모두 있음)
    const mapped = sameDayRows.map((row) => {
      return {
        // ⚠️ 아래 필드 이름은 "홈 카드 JSX에서 실제로 쓰는 이름"에 맞춰서 사용해
        id: row.id,
        timeLabel: row.time, // 'HH:MM' 형식
        time: row.time, // 기존 코드 호환성
        name: row.name || '이름 없음',
        phone: row.phone || '',
        memo: row.memo || '',
        note: row.memo || '', // 기존 코드 호환성
        // Supabase snake_case(customer_id) + 기존 camelCase(customerId) 둘 다 대응
        customerId: row.customer_id ?? row.customerId ?? null,
        date: row.date, // 'YYYY-MM-DD' 형식
        // 필요하면 isFirstVisit 같은 것도 여기서 계산
        isFirstVisit: false,
        // Supabase snake_case(is_new) + 기존 camelCase(isNew) 둘 다 대응
        isNew: row.is_new ?? row.isNew ?? false,
        status: row.status || 'scheduled', // 기존 코드 호환성
      };
    });

    // ③ 시간순 정렬 (오름차순)
    mapped.sort((a, b) => {
      if (a.timeLabel < b.timeLabel) return -1;
      if (a.timeLabel > b.timeLabel) return 1;
      return 0;
    });

    // ★ 더 이상 .slice(0, 1) 이나 .slice(0, 3) 같은 거 안 함 → Supabase에 있는 오늘 예약 모두 노출
    return mapped;
  }, [reservations, selectedDateKey]);   // ✅ supabaseReservations 대신 reservations 사용

  // 로딩 중이 아니고 예약이 없을 때만 true
  const hasNoTodayReservations =
    !reservationsLoading && todayReservationsForHome.length === 0;
  
  // 입력 모드를 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('mallo_input_mode', inputMode);
  }, [inputMode]);
  
  // 반응형 글자 수 제한 계산
  const getMaxMemoLength = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      return screenWidth <= 380 ? 18 : 30;
    }
    return 30; // 기본값
  };


  // 오늘 날짜 표시용 (헤더)
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dayNames = ['일','월','화','수','목','금','토'];
    const dayName = dayNames[today.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayName})`;
  }, []);

  // 동적 제목 텍스트 (항상 "M월 D일 (요일)" 형식으로 표시)
  const dateTitle = useMemo(() => {
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dayNames = ['일','월','화','수','목','금','토'];
    const dayName = dayNames[selectedDate.getDay()];
    return `${month}월 ${day}일 (${dayName})`;
  }, [selectedDate]);

  // 검색어에 따른 고객 필터링 (최소 2글자)
  const filteredCustomers = useMemo(() => {
    const trimmedSearch = searchText?.trim() || '';
    // 최소 2글자 제한
    if (trimmedSearch.length < 2) return [];
    return filterCustomersBySearch(customers, trimmedSearch);
  }, [customers, searchText]);


  // 검색창 포커스 핸들러
  const handleSearchFocus = () => {
    setIsSearching(true);
  };

  // 검색창 블러 핸들러
  const handleSearchBlur = () => {
    // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록
    setTimeout(() => {
      if (!searchText.trim()) {
        setIsSearching(false);
      }
    }, 200);
  };

  // 검색어 변경 핸들러
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (value.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
    // 기존 searchQuery도 업데이트 (호환성 유지)
    if (setSearchQuery) {
      setSearchQuery(value);
    }
  };

  // 고객 선택 핸들러 (상세 페이지로 이동)
  const handleCustomerSelect = (customer) => {
    if (customer && customer.id) {
      setSelectedCustomerId(customer.id);
      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
    }
  };

  // 예약 카드 클릭 핸들러 (고객 상세 페이지로 이동)
  const handleReservationCardClick = (reservation) => {
    // Supabase snake_case + 기존 camelCase 둘 다 대응
    const customerId = reservation.customerId ?? reservation.customer_id;
    
    // 예약에 customerId가 있을 때만 고객 상세 페이지로 이동
    if (!customerId) {
      console.log('[HomeScreen] 예약에 customerId가 없어 클릭 무시:', reservation.name);
      return;
    }
    
    // customerId로 고객 찾기 (숫자와 문자열 ID 모두 처리)
    const matchedCustomer = customers.find((c) => {
      return c.id === customerId || String(c.id) === String(customerId);
    });
    
    if (matchedCustomer) {
      console.log('[HomeScreen] 고객 상세 페이지로 이동:', matchedCustomer.id, matchedCustomer.name);
      setSelectedCustomerId(matchedCustomer.id);
      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
    } else {
      console.warn('[HomeScreen] 예약의 customerId로 고객을 찾을 수 없습니다:', customerId);
    }
  };

  // 녹음 버튼 클릭 핸들러 (녹음 화면으로 이동)
  const handleReservationClick = (reservation) => {
    // Supabase snake_case + 기존 camelCase 둘 다 대응
    const customerId = reservation.customerId ?? reservation.customer_id;
    
    // 예약에 customerId가 있으면 기존 고객 매칭
    const matchedCustomer = customerId
      ? customers.find((c) => c.id === customerId || String(c.id) === String(customerId))
      : null;

    if (matchedCustomer) {
      setSelectedCustomerForRecord({
        ...matchedCustomer,
        reservationId: reservation.id,  // 예약 ID 추가
        time: reservation.time || matchedCustomer.time  // 예약 시간 추가 (예약 시간 우선, 없으면 고객 시간)
      });
      setSelectedCustomerId(matchedCustomer.id);
    } else {
      // 신규 손님: 최소 정보만 가진 임시 객체 생성
      const tempCustomer = {
        id: null,
        name: reservation.name || '이름 미입력',
        phone: reservation.phone || '',
        isNew: true,
        tags: [],
        reservationId: reservation.id,  // 예약 ID 추가
        time: reservation.time  // 예약 시간 추가
      };
      setSelectedCustomerForRecord(tempCustomer);
      setSelectedCustomerId(null);
    }

    // 녹음 화면으로 이동
    startRecording();
  };

  // 음성 녹음 시작 핸들러
  const handleStartVoiceRecord = (reservation) => {
    handleReservationClick(reservation);
  };

  // 텍스트 기록 시작 핸들러
  const handleStartTextRecord = (reservation) => {
    // Supabase snake_case + 기존 camelCase 둘 다 대응
    const customerId = reservation.customerId ?? reservation.customer_id;
    
    // 예약 정보를 selectedReservation에 저장
    const reservationInfo = {
      id: reservation.id,
      name: reservation.name || '이름 미입력',
      phone: reservation.phone || '',
      timeLabel: reservation.time || '--:--',
      dateLabel: dateTitle, // 선택된 날짜의 제목 (예: "12월 5일 (목)")
      customerId: customerId || null,
      date: reservation.date || selectedDateKey,
    };
    
    setSelectedReservation(reservationInfo);
    
    // 텍스트 기록 화면으로 이동
    setCurrentScreen(SCREENS.TEXT_RECORD);
  };

  // 예약과 매칭되는 고객 찾기
  const findCustomerForReservation = (reservation) => {
    // Supabase snake_case + 기존 camelCase 둘 다 대응
    const customerId = reservation.customerId ?? reservation.customer_id;
    
    // customerId가 있을 때만 기존 고객으로 매칭
    // customerId가 없으면 신규 예약이므로 매칭하지 않음 (동명이인 방지)
    if (customerId) {
      return customers.find((c) => {
        return c.id === customerId || String(c.id) === String(customerId);
      });
    }
    return null;
  };

  // 메모 편집 시작
  const handleStartEditMemo = (e, reservation) => {
    e.stopPropagation();
    setEditingMemoReservationId(reservation.id);
    setTempMemoValue(reservation.note || '');
  };

  // 메모 자동 저장 (onBlur 또는 Enter 키)
  const handleSaveMemo = (e, reservationId) => {
    if (e) {
      e.stopPropagation();
    }
    const trimmedNote = tempMemoValue.trim();
    
    // 내용이 비어있으면 메모 삭제 (빈 문자열로 저장)
    if (updateReservation) {
      updateReservation(reservationId, { note: trimmedNote });
    } else if (setReservations) {
      setReservations(prev => prev.map(res => 
        res.id === reservationId ? { ...res, note: trimmedNote } : res
      ));
    }
    
    setEditingMemoReservationId(null);
    setTempMemoValue('');
  };

  // 메모 전체 삭제 (X 버튼 클릭)
  const handleClearMemo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTempMemoValue('');
    // 포커스 유지
    if (memoInputRef.current) {
      memoInputRef.current.focus();
    }
  };

  // 카드 클릭 핸들러 (메모 편집 모드로 전환)
  const handleCardClick = (reservation) => {
    setEditingMemoReservationId(reservation.id);
    setTempMemoValue(reservation.note || '');
  };

  return (
    <div
      className="flex flex-col h-dvh bg-[#F2F0E6] font-sans"
      style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
    >
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 헤더 영역 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo
            size="md"
            src="/logo.png"
            alt="말로 로고"
          />
          <div className="flex flex-col">
            <span className="text-[11px] text-[#A59B90]">{userProfile?.shopName || '말로 뷰티'}</span>
            <span className="text-[14px] font-semibold text-[#3E2E20]">
              오늘 방문 예정 손님
            </span>
          </div>
        </div>

        <InputModeToggle
          inputMode={inputMode}
          onChange={setInputMode}
        />
      </div>

      {/* 고정 검색창 */}
      <div className="px-4 py-4 bg-[#F2F0E6] sticky top-0 z-10">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="고객 이름이나 전화번호 검색"
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-[#C9A27A] focus:ring-2 focus:ring-[#C9A27A] focus:outline-none transition-all text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto pb-28">
        {/* 상태 A: 검색 중일 때 */}
        {isSearching && searchText.trim() && (
          <div className="px-4 py-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-800">
                검색 결과 ({filteredCustomers.length}명)
              </p>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  {searchText.trim().length < 2 
                    ? '검색어를 2글자 이상 입력해주세요.' 
                    : '검색 결과가 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id || customer.phone}
                    onClick={() => handleCustomerSelect(customer)}
                    className="bg-white rounded-xl p-4 shadow-sm border border-[#E8DFD3] hover:border-[#C9A27A] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-2">
                        <h4 className="font-semibold text-base text-gray-800">
                          {customer.name || '이름 미입력'}
                        </h4>
                        {customer.phone && (
                          <span className="text-sm text-gray-600">{customer.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 상태 B: 평소 (기본) - 오늘의 예약 */}
        {(!isSearching || !searchText.trim()) && (
          <div className="px-4 py-4">
            {/* 섹션 1: 선택된 날짜 방문 예정 고객 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                {/* 날짜 네비게이션 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                    className="p-1.5 hover:bg-[#F9F5EF] rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#C9A27A]" />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => dateInputRef.current?.click()}
                      className="px-3 py-1.5 hover:bg-[#F9F5EF] rounded-lg transition-colors"
                    >
                      <h3 className="text-lg font-bold text-gray-800">
                        {dateTitle}
                      </h3>
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDateKey}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                  
                  <button
                    onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                    className="p-1.5 hover:bg-[#F9F5EF] rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#C9A27A]" />
                  </button>
                </div>

                <div className="flex items-center">
                  {todayReservationsForHome.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {todayReservationsForHome.length}명
                    </span>
                  )}
                </div>
              </div>

              {hasNoTodayReservations && (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                  <Clock size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">오늘 등록된 예약이 없습니다</p>
                  <p className="text-xs text-gray-400">
                    예약을 연동하면 이곳에 손님 정보가 정리됩니다
                  </p>
                </div>
              )}

              {!reservationsLoading && todayReservationsForHome.length > 0 && (
                <div className="space-y-3">
                  {todayReservationsForHome.map((reservation) => {
                    const matchedCustomer = findCustomerForReservation(reservation);
                    const displayName = reservation.name || matchedCustomer?.name || '이름 미입력';
                    const displayPhone = matchedCustomer?.phone || reservation.phone || '전화번호 미입력';
                    
                    // 신규 판단: 예약 생성 시점에 저장된 isNew 플래그 사용 (고정)
                    const isNew = reservation.isNew === true;
                    
                    // 방문 기록이 있는지 확인 (ReservationScreen과 동일한 로직)
                    const hasVisitLog = (visitLogs || []).some((v) =>
                      v &&
                      (v.reservationId === reservation.id ||   // useVisitLogs에서 reservationId로 쓸 수도 있고
                       v.reservation_id === reservation.id)    // Supabase raw row면 reservation_id일 수도 있으니까 둘 다 체크
                    );

                    const cardBgClass = hasVisitLog ? 'bg-white' : 'bg-[#F8F5EE]';

                    const isEditingMemo = editingMemoReservationId === reservation.id;
                    const hasMemo = reservation.note && reservation.note.trim().length > 0;
                    const maxMemoLength = getMaxMemoLength();

                    return (
                      <div
                        key={reservation.id}
                        className={`rounded-xl p-4 shadow-sm transition-all border hover:border-[#C9A27A] cursor-pointer ${cardBgClass} border-[#E8DFD3]`}
                        onClick={() => handleCardClick(reservation)}
                      >
                        <div className="flex items-center gap-4">
                          {/* 시간 */}
                          <div className="flex-shrink-0 w-16">
                            <div className="flex items-center gap-1.5 text-[#C9A27A]">
                              <Clock size={14} />
                              <span className="text-sm font-semibold">
                                {reservation.time || '--:--'}
                              </span>
                            </div>
                          </div>

                          {/* 고객 정보 (중앙) */}
                          <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {/* 이름: customerId가 있으면 클릭 가능하지만 UI는 동일 */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (reservation.customerId) {
                                        handleReservationCardClick(reservation);
                                      }
                                    }}
                                    className={`font-semibold text-base truncate transition-colors ${
                                      reservation.customerId ? 'hover:text-[#C9A27A] cursor-pointer' : 'cursor-default'
                                    } ${
                                      !reservation.customerId 
                                        ? 'text-gray-400'  // 프로필 없음: 회색
                                        : 'text-gray-800'  // 프로필 있음: 기본 색상
                                    }`}
                                  >
                                    {displayName}
                                  </button>
                                  {isNew && (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-sm bg-[#C9A27A] text-white">
                                      신규
                                    </span>
                                  )}
                                </div>
                            <p className="text-sm truncate mt-0.5 text-gray-600">
                              {displayPhone}
                            </p>
                          </div>

                          {/* 액션 버튼 (오른쪽) - 모드에 따라 아이콘 변경 */}
                          <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inputMode === 'voice') {
                                  handleStartVoiceRecord(reservation);
                                } else {
                                  handleStartTextRecord(reservation);
                                }
                              }}
                              className="w-10 h-10 rounded-full bg-[#C9A27A] text-white shadow-md hover:bg-[#B8926A] active:scale-95 transition-all flex items-center justify-center"
                            >
                              {inputMode === 'voice' ? (
                                <Mic size={18} />
                              ) : (
                                <Keyboard size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 메모 영역 */}
                        {isEditingMemo ? (
                          // 편집 모드 (자동 저장)
                          <div 
                            className="mt-3 pt-3 border-t border-gray-200 relative z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative">
                              <input
                                ref={memoInputRef}
                                type="text"
                                value={tempMemoValue}
                                onCompositionStart={() => {
                                  // 한글 조합 시작
                                  isComposingRef.current = true;
                                }}
                                onCompositionEnd={(e) => {
                                  // 한글 조합 종료
                                  isComposingRef.current = false;
                                  const value = e.target.value;
                                  // 조합 종료 후 길이 체크 및 강제 고정
                                  if (value.length > maxMemoLength) {
                                    const fixedValue = value.slice(0, maxMemoLength);
                                    setTempMemoValue(fixedValue);
                                    // 입력값 강제 업데이트
                                    e.target.value = fixedValue;
                                  }
                                }}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  
                                  // 한글 조합 중이 아닐 때만 길이 체크
                                  if (!isComposingRef.current) {
                                    // 30자 초과 시 강제로 30자까지만 자르고 상태 업데이트
                                    if (value.length > maxMemoLength) {
                                      const fixedValue = value.slice(0, maxMemoLength);
                                      setTempMemoValue(fixedValue);
                                      // 입력값 강제 업데이트 (30자가 찬 상태에서 키보드를 눌러도 글자가 절대 바뀌지 않음)
                                      e.target.value = fixedValue;
                                      return;
                                    }
                                  }
                                  
                                  // 정상 범위 내에서는 상태 업데이트
                                  setTempMemoValue(value);
                                }}
                                onBlur={(e) => {
                                  // 포커스를 잃으면 자동 저장
                                  handleSaveMemo(e, reservation.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    // Enter 키로 저장
                                    e.preventDefault();
                                    e.target.blur(); // blur 이벤트를 트리거하여 저장
                                  } else if (e.key === 'Escape') {
                                    // Escape 키로 취소 (변경사항 무시)
                                    e.stopPropagation();
                                    setEditingMemoReservationId(null);
                                    setTempMemoValue('');
                                  }
                                }}
                                onClick={(e) => {
                                  // 입력창 클릭 시 이벤트 전파 방지 (오버레이 클릭 방지)
                                  e.stopPropagation();
                                }}
                                placeholder="예약 메모를 입력하세요..."
                                className="w-full px-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A27A] focus:border-transparent touch-manipulation"
                                maxLength={maxMemoLength}
                                autoFocus
                                style={{ fontSize: '16px' }} // 모바일 줌 방지 (16px 이상)
                              />
                              {/* X 버튼 (Clear) */}
                              {tempMemoValue.length > 0 && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // onBlur 방지
                                    e.stopPropagation();
                                    setTempMemoValue('');
                                    // 포커스 유지
                                    setTimeout(() => {
                                      if (memoInputRef.current) {
                                        memoInputRef.current.focus();
                                      }
                                    }, 0);
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors z-50"
                                  aria-label="전체 삭제"
                                >
                                  <X size={14} className="text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : hasMemo ? (
                          // 메모 표시 모드
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm text-gray-600 truncate">
                              {reservation.note}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 투명 오버레이: 편집 모드일 때만 렌더링, 같은 박스 내부 클릭 시 닫힘 문제 해결 */}
        {editingMemoReservationId && (
          <div
            className="fixed inset-0 bg-transparent z-40"
            onClick={() => {
              // 현재 편집 중인 예약의 ID를 사용하여 저장
              handleSaveMemo(null, editingMemoReservationId);
            }}
          />
        )}
      </main>

      {/* Safe Area Bottom */}
      <div className="pb-[env(safe-area-inset-bottom)]" />

      {/* 플로팅 + 버튼 (우측 하단) - 예약 추가 */}
      <button
        onClick={() => {
          setShouldOpenReservationForm(true); // 예약 폼 자동 열기 플래그 설정
          setCurrentScreen(SCREENS.RESERVATION);
        }}
        className="fixed w-12 h-12 rounded-full bg-[#C9A27A] flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform z-50"
        style={{ 
          boxShadow: '0 10px 25px rgba(201, 162, 122, 0.3)',
          bottom: 'calc(60px + env(safe-area-inset-bottom) + 8px)',
          right: '16px'
        }}
      >
        <Plus size={24} className="text-white" strokeWidth={3} />
      </button>
    </div>
  );
}

export default HomeScreen;
