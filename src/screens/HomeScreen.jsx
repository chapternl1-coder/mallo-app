import React, { useState, useMemo, useRef } from 'react';
import { Search, Clock, User, Plus, Calendar, ChevronLeft, ChevronRight, Mic } from 'lucide-react';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import { SCREENS } from '../constants/screens';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import logo from '../assets/logo.png';

/**
 * 홈 화면 컴포넌트 - 검색 및 예약 중심의 현대적인 UI
 * 
 * 주요 기능:
 * - 고정된 검색창으로 고객 검색
 * - 오늘 방문 예정 고객 리스트
 * - 플로팅 녹음 버튼 (신규/비예약 고객용)
 */
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
  toggleReservationComplete,
  visits = {},
  updateReservation,
  setReservations,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateInputRef = useRef(null);
  const [editingMemoReservationId, setEditingMemoReservationId] = useState(null);
  const [tempMemoValue, setTempMemoValue] = useState('');
  
  // 반응형 글자 수 제한 계산
  const getMaxMemoLength = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      return screenWidth <= 380 ? 18 : 30;
    }
    return 30; // 기본값
  };

  // 선택된 날짜를 YYYY-MM-DD 형식으로 변환
  const selectedDateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

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

  // 동적 제목 텍스트 (항상 "M월 D일" 형식으로 표시)
  const dateTitle = useMemo(() => {
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    return `${month}월 ${day}일 방문 예정 고객`;
  }, [selectedDate]);

  // 검색어에 따른 고객 필터링 (최소 2글자)
  const filteredCustomers = useMemo(() => {
    const trimmedSearch = searchText?.trim() || '';
    // 최소 2글자 제한
    if (trimmedSearch.length < 2) return [];
    return filterCustomersBySearch(customers, trimmedSearch);
  }, [customers, searchText]);

  // 선택된 날짜의 예약 손님 필터링 및 정렬 (완료된 것도 포함)
  const todaysReservations = useMemo(() => {
    const filtered = (reservations || []).filter(
      (res) => res && res.date === selectedDateStr
    );
    // 시간순으로 정렬
    return filtered.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
    }, [reservations, selectedDateStr]);

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
    // 예약에 customerId가 있을 때만 고객 상세 페이지로 이동
    if (!reservation.customerId) {
      console.log('[HomeScreen] 예약에 customerId가 없어 클릭 무시:', reservation.name);
      return;
    }
    
    // customerId로 고객 찾기 (숫자와 문자열 ID 모두 처리)
    const matchedCustomer = customers.find((c) => {
      return c.id === reservation.customerId || String(c.id) === String(reservation.customerId);
    });
    
    if (matchedCustomer) {
      console.log('[HomeScreen] 고객 상세 페이지로 이동:', matchedCustomer.id, matchedCustomer.name);
      setSelectedCustomerId(matchedCustomer.id);
      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
    } else {
      console.warn('[HomeScreen] 예약의 customerId로 고객을 찾을 수 없습니다:', reservation.customerId);
    }
  };

  // 녹음 버튼 클릭 핸들러 (녹음 화면으로 이동)
  const handleReservationClick = (reservation) => {
    // 예약에 customerId가 있으면 기존 고객 매칭
    const matchedCustomer = reservation.customerId
      ? customers.find((c) => c.id === reservation.customerId)
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

  // 플로팅 녹음 버튼 클릭 (신규/비예약 고객용)
  const handleFabClick = () => {
    setSelectedCustomerForRecord(null);
    startRecording();
  };

  // 예약과 매칭되는 고객 찾기
  const findCustomerForReservation = (reservation) => {
    // customerId가 있을 때만 기존 고객으로 매칭
    // customerId가 없으면 신규 예약이므로 매칭하지 않음 (동명이인 방지)
    if (reservation.customerId) {
      return customers.find((c) => c.id === reservation.customerId);
    }
    return null;
  };

  // 메모 편집 시작
  const handleStartEditMemo = (e, reservation) => {
    e.stopPropagation();
    setEditingMemoReservationId(reservation.id);
    setTempMemoValue(reservation.note || '');
  };

  // 메모 저장
  const handleSaveMemo = (e, reservationId) => {
    e.stopPropagation();
    const trimmedNote = tempMemoValue.trim();
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

  // 메모 취소
  const handleCancelEditMemo = (e) => {
    e.stopPropagation();
    setEditingMemoReservationId(null);
    setTempMemoValue('');
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
      <header className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">원장님, 안녕하세요!</h2>
            <span className="text-sm font-light text-gray-600 mt-1">{todayStr}</span>
          </div>
          <img
            src={logo}
            alt="Mallo 로고"
            className="w-16 h-16 object-contain"
          />
        </div>
      </header>

      {/* 고정 검색창 */}
      <div className="px-4 py-3 bg-[#F2F0E6] sticky top-0 z-10">
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
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-[#C9A27A] transition-all cursor-pointer"
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
                      value={selectedDateStr}
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

                <div className="flex items-center gap-2">
                  {todaysReservations.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {todaysReservations.length}명
                    </span>
                  )}
                </div>
              </div>

              {todaysReservations.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                  <Clock size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">오늘 등록된 예약이 없습니다</p>
                  <p className="text-xs text-gray-400">
                    예약을 연동하면 이곳에 손님 정보가 정리됩니다
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysReservations.map((reservation) => {
                    const matchedCustomer = findCustomerForReservation(reservation);
                    const displayName = reservation.name || matchedCustomer?.name || '이름 미입력';
                    const displayPhone = matchedCustomer?.phone || reservation.phone || '전화번호 미입력';
                    
                    // 신규 판단: 예약 생성 시점에 저장된 isNew 플래그 사용 (고정)
                    const isNew = reservation.isNew === true;
                    
                    // 요약(녹음) 완료 여부 판단
                    let hasSummary = false;
                    
                    if (reservation.customerId) {
                      // customerId로 방문 기록 찾기
                      const customerVisits = visits[reservation.customerId] || visits[String(reservation.customerId)] || [];
                      
                      // 해당 예약과 연결된 방문 기록이 있는지 확인
                      hasSummary = customerVisits.some(visit => {
                        // 1순위: reservationId가 일치하는 경우
                        if (visit.reservationId === reservation.id) {
                          return true;
                        }
                        
                        // 2순위: 날짜가 일치하는 경우 (예약 날짜와 방문 날짜 비교)
                        const visitDate = visit.serviceDate || visit.date;
                        if (visitDate === reservation.date) {
                          return true;
                        }
                        
                        return false;
                      });
                    }

                    const isEditingMemo = editingMemoReservationId === reservation.id;
                    const hasMemo = reservation.note && reservation.note.trim().length > 0;
                    const maxMemoLength = getMaxMemoLength();

                    return (
                      <div
                        key={reservation.id}
                        className={`rounded-xl p-4 shadow-sm transition-all border hover:border-[#C9A27A] cursor-pointer ${
                          !hasSummary 
                            ? 'bg-[#F9F5EF] border-[#F9F5EF]'  // 요약 없음: 베이지색
                            : 'bg-white border-gray-100'         // 요약 완료: 흰색
                        }`}
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

                          {/* 녹음 버튼 (오른쪽) */}
                          <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleReservationClick(reservation)}
                              className="w-10 h-10 rounded-full bg-[#C9A27A] text-white shadow-md hover:bg-[#B8926A] active:scale-95 transition-all flex items-center justify-center"
                            >
                              <Mic size={18} />
                            </button>
                          </div>
                        </div>

                        {/* 메모 영역 */}
                        {isEditingMemo ? (
                          // 편집 모드
                          <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={tempMemoValue}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value.length <= maxMemoLength) {
                                    setTempMemoValue(value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveMemo(e, reservation.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditMemo(e);
                                  }
                                }}
                                placeholder="예약 메모를 입력하세요..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A27A] focus:border-transparent"
                                maxLength={maxMemoLength}
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  {tempMemoValue.length}/{maxMemoLength}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCancelEditMemo(e)}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    취소
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleSaveMemo(e, reservation.id)}
                                    className="px-3 py-1.5 text-xs bg-[#C9A27A] text-white rounded-lg hover:bg-[#B8926A] transition-colors"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
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
      </main>

      {/* Safe Area Bottom */}
      <div className="pb-[env(safe-area-inset-bottom)]" />

      {/* 플로팅 + 버튼 (네비게이션 바 오른쪽 위) */}
      <button
        onClick={handleFabClick}
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
