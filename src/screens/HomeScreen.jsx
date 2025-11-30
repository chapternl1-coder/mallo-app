import React from 'react';
import { Mic } from 'lucide-react';
import HomeHeader from '../components/HomeHeader';
import { filterCustomersBySearch } from '../utils/customerListUtils';

/**
 * 홈 화면 컴포넌트
 * 
 * 변경 이력:
 * - 고객 검색 로직을 filterCustomersBySearch 유틸 함수로 통합 (src/utils/customerListUtils.js)
 * - 고객 리스트 아이템을 CustomerListItem 컴포넌트로 분리 (src/components/CustomerListItem.jsx)
 * - 헤더와 검색창을 HomeHeader 컴포넌트로 분리 (src/components/HomeHeader.jsx)
 */
function HomeScreen({
  currentScreen,
  setCurrentScreen,
  setActiveTab,
  customers,
  searchQuery,
  setSearchQuery,
  setSelectedCustomerId,
  selectedCustomerForRecord,
  setSelectedCustomerForRecord,
  startRecording
}) {
  // 고객 검색 필터링 (utils/customerListUtils.js의 filterCustomersBySearch 사용)
  const filteredCustomers = filterCustomersBySearch(customers, searchQuery);

  // 오늘 날짜 표시
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: '#F2F0E6' }}>
      <HomeHeader
        todayStr={todayStr}
        setActiveTab={setActiveTab}
        setCurrentScreen={setCurrentScreen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredCustomers={filteredCustomers}
        setSelectedCustomerId={setSelectedCustomerId}
      />

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-8 space-y-12 pb-20 relative">

        {/* 신규 고객 바로 녹음 버튼 - 큰 원형 카드 형태 (항상 표시) */}
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-0" style={{ bottom: '50px' }}>
          <div 
            className="w-full bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-[#C9A27A] transition-all duration-300 p-12 flex flex-col items-center justify-center gap-6"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomerForRecord(null);
                startRecording();
              }}
              className="rounded-full flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer"
              style={{ backgroundColor: '#C9A27A', width: '136px', height: '136px' }}
            >
              <Mic size={40} className="text-white" />
            </button>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#232323' }}>신규 고객 바로 녹음</h3>
              <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.6 }}>시술 내용을 말로만 기록하세요</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomeScreen;


