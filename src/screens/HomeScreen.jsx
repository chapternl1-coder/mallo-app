import React from 'react';
import { Mic, Scissors, ChevronRight } from 'lucide-react';
import { SCREENS } from '../constants/screens';

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
  // 전화번호에서 하이픈과 공백 제거하는 헬퍼 함수
  const normalizePhone = (phone) => {
    return phone.replace(/[-\s]/g, '');
  };

  // 검색 필터링된 고객 리스트
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const normalizedQuery = normalizePhone(query);
    
    // 이름 검색 (기존 로직 유지)
    const nameMatch = customer.name.toLowerCase().includes(query);
    
    // 전화번호 검색 (하이픈과 공백 제거 후 비교)
    const normalizedCustomerPhone = normalizePhone(customer.phone);
    const phoneMatch = normalizedCustomerPhone.includes(normalizedQuery);
    
    return nameMatch || phoneMatch;
  });

  // 오늘 날짜 표시
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="flex flex-col h-full relative pb-[60px]" style={{ backgroundColor: '#F2F0E6' }}>
      <header className="px-8 py-6 flex justify-between items-center bg-white z-10 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold" style={{ color: '#232323' }}>원장님, 안녕하세요!</h2>
          <span className="text-sm font-light mt-1" style={{ color: '#232323', opacity: 0.6 }}>{todayStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveTab('History');
              setCurrentScreen(SCREENS.HISTORY);
            }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#C9A27A' }}
          >
            <Scissors size={20} className="text-white" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-8 space-y-12 pb-20 relative">
        {/* 검색창 - 화면 중앙에 크게 배치 */}
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-8" style={{ top: '140px', zIndex: 100 }}>
          <div className="bg-white rounded-2xl shadow-md border border-[#EFECE1] p-6">
            <div className="flex items-center gap-4 bg-white rounded-2xl px-4 h-14 border border-[#EFECE1] focus-within:border-[#C9A27A] focus-within:ring-2 focus-within:ring-[#C9A27A] transition-all">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="고객 이름이나 전화번호 검색"
                className="w-full bg-transparent outline-none font-light placeholder-gray-400 text-lg leading-normal"
                style={{ color: '#232323' }}
              />
            </div>
          </div>

          {/* 검색 결과 - Absolute Positioning으로 드롭다운 */}
          {searchQuery.trim() && filteredCustomers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-[100] max-h-60 overflow-y-auto">
              <div className="p-2 space-y-1">
                {filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('선택된 고객:', customer.name, customer.id, customer.phone);
                      setSelectedCustomerId(customer.id);
                      setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
                    }}
                    className="bg-white rounded-xl p-4 hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{customer.avatar}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-base mb-1" style={{ color: '#232323' }}>{customer.name}</h4>
                        <p className="text-sm font-light" style={{ color: '#232323', opacity: 0.7 }}>{customer.phone}</p>
                      </div>
                      <ChevronRight size={18} style={{ color: '#C9A27A' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 검색 결과 없음 - Absolute Positioning */}
          {searchQuery.trim() && filteredCustomers.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-[100] p-6">
              <p className="text-base font-light text-center" style={{ color: '#232323', opacity: 0.6 }}>검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

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


