import React, { useState } from 'react';
import { ArrowLeft, Calendar, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { SCREENS } from '../constants/screens';

function ReservationScreen({
  reservations,
  addReservation,
  toggleReservationComplete,
  deleteReservation,
  setReservations,
  setCurrentScreen,
  getTodayDateString,
  currentTheme
}) {
  // 오늘 날짜 계산 (getTodayDateString이 없으면 직접 계산)
  const getTodayDateStr = () => {
    if (getTodayDateString) return getTodayDateString();
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());

  const bgColor = currentTheme?.pastel || '#F2F0E6';
  const textColor = currentTheme?.text || '#232323';
  const accentColor = currentTheme?.color || '#C9A27A';

  // 선택된 날짜의 예약 필터링
  const filteredReservations = (reservations || []).filter(res => res && res.date === selectedDate);
  
  // 시간순 정렬 (오름차순)
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  // 날짜 포맷팅 (YYYY-MM-DD -> MM월 DD일)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(month)}월 ${parseInt(day)}일`;
  };

  // 날짜 문자열을 Date 객체로 변환
  const parseDateStr = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Date 객체를 날짜 문자열로 변환
  const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 요일 반환
  const getDayName = (dateStr) => {
    const date = parseDateStr(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 날짜 레이블 (오늘, 내일, 모레 등)
  const getDateLabel = (dateStr) => {
    const todayStr = getTodayDateStr();
    if (dateStr === todayStr) return '오늘';
    
    const today = parseDateStr(todayStr);
    const target = parseDateStr(dateStr);
    const diffTime = target - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '내일';
    if (diffDays === 2) return '모레';
    if (diffDays === -1) return '어제';
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}일 전`;
    return null;
  };

  // 날짜 변경 함수
  const changeDate = (direction) => {
    const currentDate = parseDateStr(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setSelectedDate(formatDateStr(newDate));
  };

  return (
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button 
          onClick={() => setCurrentScreen(SCREENS.HOME)}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors"
          style={{ color: textColor }}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={20} style={{ color: accentColor }} />
          <h2 className="text-xl font-bold" style={{ color: textColor }}>예약 및 일정</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-6 pb-20">
        {/* 날짜 선택기 - 개선된 버전 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 이전 날짜 버튼 */}
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
              style={{ color: textColor }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* 중앙 날짜 표시 */}
            <button
              onClick={() => {
                // 오늘 날짜로 빠르게 이동
                setSelectedDate(getTodayDateStr());
              }}
              className="flex-1 flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                  {getDateLabel(selectedDate) || formatDateDisplay(selectedDate)}
                </span>
                <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.4 }}>
                  {getDayName(selectedDate)}요일
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: accentColor }}>
                {parseDateStr(selectedDate).getDate()}
              </div>
            </button>

            {/* 다음 날짜 버튼 */}
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
              style={{ color: textColor }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* 빠른 날짜 선택 (어제, 오늘, 내일, 모레, 모레+1) */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {[-1, 0, 1, 2, 3].map((offset) => {
              const today = parseDateStr(getTodayDateStr());
              const quickDate = new Date(today);
              quickDate.setDate(today.getDate() + offset);
              const quickDateStr = formatDateStr(quickDate);
              const isSelected = quickDateStr === selectedDate;
              const dayOfMonth = quickDate.getDate();
              const label = offset === -1 ? '어제' : offset === 0 ? '오늘' : offset === 1 ? '내일' : offset === 2 ? '모레' : `${quickDate.getMonth() + 1}/${dayOfMonth}`;

              return (
                <button
                  key={quickDateStr}
                  onClick={() => setSelectedDate(quickDateStr)}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? accentColor : 'transparent',
                    color: isSelected ? '#FFFFFF' : textColor,
                    opacity: isSelected ? 1 : 0.7
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 예약 리스트 */}
        <div className="space-y-4">
          <h3 className="text-base font-bold" style={{ color: textColor }}>
            {formatDateDisplay(selectedDate)} 예약
          </h3>
          
          {sortedReservations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="font-light text-base" style={{ color: textColor, opacity: 0.6 }}>
                예약이 없습니다
              </p>
            </div>
          ) : (
            sortedReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => {
                      if (toggleReservationComplete) {
                        toggleReservationComplete(reservation.id);
                      } else if (setReservations) {
                        setReservations(prev => prev.map(res => 
                          res.id === reservation.id ? { ...res, isCompleted: !res.isCompleted } : res
                        ));
                      }
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      reservation.isCompleted
                        ? 'bg-[#C9A27A] border-[#C9A27A]'
                        : 'border-gray-300 hover:border-[#C9A27A]'
                    }`}
                  >
                    {reservation.isCompleted && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className={`flex items-center gap-3 ${reservation.isCompleted ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm font-bold" style={{ color: accentColor }}>
                          {reservation.time}
                        </span>
                      </div>
                      <span 
                        className={`text-base font-medium ${reservation.isCompleted ? 'line-through' : ''}`}
                        style={{ color: textColor }}
                      >
                        {reservation.name}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({reservation.phoneLast4})
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (deleteReservation) {
                      deleteReservation(reservation.id);
                    } else if (setReservations) {
                      setReservations(prev => prev.filter(res => res.id !== reservation.id));
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default ReservationScreen;

