import React, { useMemo, useState } from 'react';
import { ArrowLeft, X, Clock } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { formatPhoneNumber } from '../utils/formatters';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import ExpandableCalendar from '../components/ExpandableCalendar';
import { format } from 'date-fns';

function ReservationScreen({
  reservations,
  addReservation,
  deleteReservation,
  customers,
  setCurrentScreen,
  getTodayDateString,
}) {
  const [showForm, setShowForm] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedExistingCustomerId, setSelectedExistingCustomerId] =
    useState(null);
  const [showMatchingCustomers, setShowMatchingCustomers] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // 선택된 날짜의 예약만 필터링하고 시간순으로 정렬
  const filteredReservations = useMemo(() => {
    const filtered = (reservations || []).filter(
      (res) => res && res.date === selectedDateStr && !res.isCompleted
    );
    
    // 시간순으로 정렬 (시간이 없는 것은 맨 아래)
    return filtered.sort((a, b) => {
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      return timeA.localeCompare(timeB);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedPhone = phoneInput.trim();

    if (!timeInput || !trimmedName) {
      alert('시간과 이름을 모두 입력해주세요.');
      return;
    }

    if (!trimmedPhone) {
      alert('전화번호를 입력해주세요.');
      return;
    }

    // ✨ 자동완성에서 직접 선택했을 때만 기존 고객으로 연결
    // 선택하지 않으면 customerId는 null로 신규 예약으로 추가됨
    const customerIdToUse = selectedExistingCustomerId || null;

    const reservationData = {
      date: selectedDateStr, // 선택된 날짜로 예약 추가
      time: timeInput,
      name: trimmedName,
      phone: trimmedPhone,
      customerId: customerIdToUse,
      phoneLast4: trimmedPhone.slice(-4),
      isCompleted: false,
    };

    console.log('[예약 추가]', reservationData);

    if (addReservation) {
      const result = addReservation(reservationData);
      console.log('[예약 추가 결과]', result);
    } else {
      console.error('[예약 추가 실패] addReservation 함수가 없습니다.');
    }

    resetForm();
  };

  // 예약 삭제
  const handleRemoveReservation = (id) => {
    if (deleteReservation) {
      deleteReservation(id);
    }
  };

  return (
    <div
      className="flex flex-col h-dvh bg-[#F2F0E6] font-sans"
      style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
    >
      {/* Safe Area Top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* 헤더 영역 - 고정 */}
      <header className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentScreen(SCREENS.HOME)}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
            style={{ color: '#232323' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">예약 관리</h2>
        </div>
      </header>

      {/* 전체 컨텐츠 영역 - 스크롤 가능 */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 pt-4 pb-28">
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
                <form
                  onSubmit={handleSubmit}
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
                      type="submit"
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
                </form>
          )}

          {/* 예약 리스트 */}
          <section className="mt-4 space-y-2">
            {filteredReservations.map((reservation) => {
                  const displayPhone = reservation.phone || '';
                  return (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <span className="text-[11px] text-[#B18352]">
                          {reservation.time}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#3F352B]">
                            {reservation.name}
                          </span>
                          {displayPhone && (
                            <span className="text-xs text-gray-600">
                              {displayPhone}
                            </span>
                          )}
                          {!reservation.customerId && (
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
