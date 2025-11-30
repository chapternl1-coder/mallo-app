import React from 'react';
import { SCREENS } from '../constants/screens';
import CustomerListItem from './CustomerListItem';
import logo from '../assets/logo.png';

function HomeHeader({
  todayStr,
  setActiveTab,
  setCurrentScreen,
  searchQuery,
  setSearchQuery,
  filteredCustomers,
  setSelectedCustomerId
}) {
  return (
    <>
      <header className="px-8 pt-6 pb-4 flex justify-between items-center bg-white z-10 border-b border-gray-200 shadow-sm h-[100px]">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold" style={{ color: '#232323' }}>원장님, 안녕하세요!</h2>
          <span className="text-sm font-light mt-1" style={{ color: '#232323', opacity: 0.6 }}>{todayStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt="Mallo 로고" 
            className="w-20 h-20 object-contain"
          />
        </div>
      </header>

      {/* 검색창 - 화면 중앙에 크게 배치 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-8"
        style={{ top: '120px', zIndex: 100 }}
      >
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
                <CustomerListItem
                  key={customer.id}
                  customer={customer}
                  onClick={(customer) => {
                    console.log('선택된 고객:', customer.name, customer.id, customer.phone);
                    setSelectedCustomerId(customer.id);
                    setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
                  }}
                />
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
    </>
  );
}

export default HomeHeader;

