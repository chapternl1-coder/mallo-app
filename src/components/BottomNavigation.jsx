import React from 'react';
import { Home, Calendar, History, User } from 'lucide-react';

export default function BottomNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'Home', label: '홈', icon: Home },
    { id: 'Reservation', label: '예약', icon: Calendar },
    { id: 'History', label: '기록', icon: History },
    { id: 'Settings', label: '설정', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
      <div className="max-w-md mx-auto h-[60px] flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  color: isActive ? '#C9A27A' : '#D1D5DB',
                  transition: 'all 0.2s',
                }}
              />
              <span
                className="text-[10px] mt-1 font-medium"
                style={{
                  color: isActive ? '#232323' : '#D1D5DB',
                  transition: 'color 0.2s',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}


