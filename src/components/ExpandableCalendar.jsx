import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  addDays,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addYears,
  subYears
} from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 접이식 캘린더 컴포넌트
 * - 기본: Weekly 뷰 (이번 주 월~일)
 * - 확장: Monthly 뷰 (이번 달 전체)
 * - 예약 있는 날짜에 Dot 표시
 * - 날짜 선택 시 필터링
 */
function ExpandableCalendar({ selectedDate, onDateSelect, reservations = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate); // 현재 보고 있는 달/년

  // 예약이 있는 날짜들과 개수를 Map으로 저장 (빠른 조회)
  const reservationDates = useMemo(() => {
    const dateMap = new Map();
    reservations.forEach(res => {
      if (res.date && !res.isCompleted) {
        const count = dateMap.get(res.date) || 0;
        dateMap.set(res.date, count + 1);
      }
    });
    return dateMap;
  }, [reservations]);

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const formatDateKey = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // 해당 날짜의 예약 개수 가져오기
  const getReservationCount = (date) => {
    return reservationDates.get(formatDateKey(date)) || 0;
  };

  // Weekly 뷰: 현재 보고 있는 주 날짜 (월~일)
  const weekDays = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 0 }); // 일요일 시작
    const end = endOfWeek(viewDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  // Monthly 뷰: 현재 보고 있는 달 전체 날짜
  const monthWeeks = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
    
    return weeks.map(weekStart => {
      return eachDayOfInterval({
        start: weekStart,
        end: addDays(weekStart, 6)
      });
    });
  }, [viewDate]);

  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
      setViewDate(date); // 선택한 날짜로 뷰도 이동
    }
  };

  // 토글 핸들러
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // 이전 달로 이동
  const goToPrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(prev => subMonths(prev, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(prev => addMonths(prev, 1));
  };

  // 이전 주로 이동
  const goToPrevWeek = (e) => {
    e.stopPropagation();
    setViewDate(prev => addDays(prev, -7));
  };

  // 다음 주로 이동
  const goToNextWeek = (e) => {
    e.stopPropagation();
    setViewDate(prev => addDays(prev, 7));
  };

  // 오늘로 이동
  const goToToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    setViewDate(today);
    if (onDateSelect) {
      onDateSelect(today);
    }
  };

  // 날짜 셀 렌더링
  const renderDateCell = (date, isInCurrentMonth = true) => {
    const isSelected = isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    const reservationCount = getReservationCount(date);
    const hasRes = reservationCount > 0;

    // 예약 개수에 따른 점 색상 설정
    let dotColor = 'bg-gray-400'; // 기본 회색
    
    if (reservationCount >= 10) {
      dotColor = 'bg-red-500'; // 빨간 점: 10개 이상 (바쁨)
    } else if (reservationCount >= 7) {
      dotColor = 'bg-orange-500'; // 주황 점: 7~9개 (적당함)
    } else if (reservationCount >= 4) {
      dotColor = 'bg-yellow-500'; // 노란 점: 4~6개 (적당함)
    } else if (reservationCount >= 1) {
      dotColor = 'bg-gray-400'; // 회색 점: 1~3개 (한가함)
    }

    return (
      <button
        key={formatDateKey(date)}
        onClick={() => handleDateClick(date)}
        className={`
          relative flex flex-col items-center justify-center py-2 rounded-lg transition-all
          border-2 box-border
          ${!isInCurrentMonth ? 'opacity-30' : ''}
          ${isSelected 
            ? 'border-[#C9A27A] bg-[#F9F5EF] text-[#C9A27A] font-bold shadow-md scale-105' 
            : isCurrentDay
            ? 'border-transparent bg-[#F9F5EF] text-[#C9A27A] font-semibold'
            : 'border-transparent text-gray-700 hover:bg-[#F9F5EF]'
          }
        `}
        style={{ boxSizing: 'border-box' }}
      >
        <span className="text-sm font-medium">
          {format(date, 'd')}
        </span>
        {hasRes && (
          <div className="absolute bottom-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-sm`} />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더: 월/년 표시 + 네비게이션 */}
      <div className="px-4 py-3 bg-[#F9F5EF]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={isExpanded ? goToPrevMonth : goToPrevWeek}
              className="p-0.5 hover:bg-[#F2EDE4] rounded-lg transition-colors"
            >
              <ChevronLeft size={16} className="text-[#7A6A58]" />
            </button>
            <h3 className="text-base font-semibold text-[#3F352B] min-w-[180px] text-center">
              {format(viewDate, 'yyyy년 M월 d일', { locale: ko })}
            </h3>
            <button
              onClick={isExpanded ? goToNextMonth : goToNextWeek}
              className="p-0.5 hover:bg-[#F2EDE4] rounded-lg transition-colors"
            >
              <ChevronRight size={16} className="text-[#7A6A58]" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-medium text-[#7A6A58] hover:bg-[#F2EDE4] rounded-lg transition-colors border border-[#E3D7C7]"
            >
              오늘
            </button>
            <button
              onClick={toggleExpand}
              className="p-1 hover:bg-[#F2EDE4] rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp size={18} className="text-[#7A6A58]" />
              ) : (
                <ChevronDown size={18} className="text-[#7A6A58]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly 뷰 (기본) */}
      {!isExpanded && (
        <div className="p-3">
          <div className="grid grid-cols-7 gap-1">
            {/* 요일 헤더 */}
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={day} className="text-center py-1">
                <span className={`text-xs font-medium ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {day}
                </span>
              </div>
            ))}
            {/* 날짜 셀 */}
            {weekDays.map(date => renderDateCell(date))}
          </div>
        </div>
      )}

      {/* Monthly 뷰 (확장) */}
      {isExpanded && (
        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {/* 요일 헤더 */}
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div key={day} className="text-center py-1">
                <span className={`text-xs font-medium ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {day}
                </span>
              </div>
            ))}
          </div>
          {/* 주별 날짜 */}
          {monthWeeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
              {week.map(date => renderDateCell(date, isSameMonth(date, selectedDate)))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExpandableCalendar;

