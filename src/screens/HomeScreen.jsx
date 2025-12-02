import React, { useState, useMemo } from 'react';
import { Search, Clock, User, Plus, Calendar } from 'lucide-react';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import { SCREENS } from '../constants/screens';
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
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 오늘 날짜를 YYYY-MM-DD 형식으로 변환
  const todayDateStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // 오늘 날짜 표시용
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getMonth() + 1}월 ${today.getDate()}일`;
  }, []);

  // 검색어에 따른 고객 필터링
  const filteredCustomers = useMemo(() => {
    if (!searchText || !searchText.trim()) return [];
    return filterCustomersBySearch(customers, searchText);
  }, [customers, searchText]);

  // 오늘 예약 손님 필터링 및 정렬
  const todaysReservations = useMemo(() => {
    const filtered = (reservations || []).filter(
      (res) => res && res.date === todayDateStr && !res.isCompleted
    );
    // 시간순으로 정렬
    return filtered.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
  }, [reservations, todayDateStr]);

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

  // 예약 카드 클릭 핸들러 (녹음 화면으로 이동)
  const handleReservationClick = (reservation) => {
    // 예약에 customerId가 있으면 기존 고객 매칭
    const matchedCustomer = reservation.customerId
      ? customers.find((c) => c.id === reservation.customerId)
      : null;

    if (matchedCustomer) {
      setSelectedCustomerForRecord(matchedCustomer);
      setSelectedCustomerId(matchedCustomer.id);
    } else {
      // 신규 손님: 최소 정보만 가진 임시 객체 생성
      const tempCustomer = {
        id: null,
        name: reservation.name || '이름 미입력',
        phone: reservation.phone || '',
        isNew: true,
        tags: [],
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
    if (reservation.customerId) {
      return customers.find((c) => c.id === reservation.customerId);
    }
    // 이름이나 전화번호로 매칭 시도
    if (reservation.name) {
      return customers.find((c) => c.name === reservation.name);
    }
    if (reservation.phoneLast4) {
      return customers.find((c) => c.phone?.endsWith(reservation.phoneLast4));
    }
    return null;
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
      <div className="px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
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
                <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
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
                      <div className="text-3xl">{customer.avatar || '👤'}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base text-gray-800 mb-1">
                          {customer.name || '이름 미입력'}
                        </h4>
                        {customer.phone && (
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        )}
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full bg-[#F2F0E6] text-xs text-[#7A6A58]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
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
            {/* 섹션 1: 오늘 방문 예정 고객 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">오늘 방문 예정 고객</h3>
                <div className="flex items-center gap-2">
                  {todaysReservations.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {todaysReservations.length}명
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentScreen(SCREENS.RESERVATION)}
                    className="p-2 hover:bg-[#F9F5EF] rounded-xl transition-colors"
                  >
                    <Calendar size={18} className="text-[#C9A27A]" />
                  </button>
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

                    return (
                      <div
                        key={reservation.id}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-[#C9A27A] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          {/* 시간 (왼쪽) */}
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
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-2xl">{matchedCustomer?.avatar || '👤'}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-base text-gray-800 truncate">
                                    {displayName}
                                  </h4>
                                  {(!matchedCustomer || reservation.isNew) && (
                                    <span className="px-2 py-0.5 rounded-full border border-[#C9A27A] text-[10px] text-[#C9A27A] whitespace-nowrap">
                                      신규
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 truncate mt-0.5">
                                  {displayPhone}
                                </p>
                              </div>
                            </div>
                            {matchedCustomer?.tags && matchedCustomer.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {matchedCustomer.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-full bg-[#F2F0E6] text-xs text-[#7A6A58]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 녹음/완료 버튼 (오른쪽) */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={() => handleReservationClick(reservation)}
                              className="px-4 py-2 bg-[#C9A27A] text-white rounded-lg text-sm font-medium hover:bg-[#B8926A] active:scale-95 transition-all shadow-sm"
                            >
                              녹음
                            </button>
                          </div>
                        </div>
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
