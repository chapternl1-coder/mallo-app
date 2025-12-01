import React from 'react';
import { Mic } from 'lucide-react';
import HomeHeader from '../components/HomeHeader';
import { filterCustomersBySearch } from '../utils/customerListUtils';
import { SCREENS } from '../constants/screens';

/**
 * 홈 화면 컴포넌트
 *
 * - 헤더 안에 인사 + 날짜 + 검색창
 * - 본문에는 중앙에 큰 녹음 카드 1개
 * - 하단 탭바 높이만큼 여백(padding-bottom) 확보
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
  startRecording,
}) {
  // 고객 검색 필터링
  const filteredCustomers = filterCustomersBySearch(customers, searchQuery);

  // 오늘 날짜 표시
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div
      className="flex flex-col min-h-screen pb-[60px]"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      {/* 상단 헤더 + 검색창 */}
      <HomeHeader
        todayStr={todayStr}
        setActiveTab={setActiveTab}
        setCurrentScreen={setCurrentScreen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredCustomers={filteredCustomers}
        setSelectedCustomerId={setSelectedCustomerId}
      />

      {/* 본문 영역 */}
      <main className="flex-1 flex justify-center px-8 pt-[160px] pb-[150px] overflow-y-auto">
        <div className="w-full max-w-md">
          <div
            className="w-full bg-white rounded-3xl shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-[#C9A27A] transition-all duration-300 p-12 flex flex-col items-center justify-center gap-6"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* 텍스트를 위로 */}
            <div className="text-center">
              <h3
                className="text-2xl font-bold mb-2"
                style={{ color: '#232323' }}
              >
                신규 고객 바로 녹음
              </h3>
              <p
                className="text-sm font-light"
                style={{ color: '#232323', opacity: 0.6 }}
              >
                시술 내용을 말로만 기록하세요
              </p>
            </div>

            {/* 버튼을 아래로 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomerForRecord(null);
                startRecording();
              }}
              className="rounded-full flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer mt-2"
              style={{ backgroundColor: '#C9A27A', width: '136px', height: '136px' }}
            >
              <Mic size={40} className="text-white" />
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}

export default HomeScreen;
