import React from 'react';
import { ChevronRight } from 'lucide-react';

function CustomerListItem({ customer, onClick }) {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick(customer);
      }}
      className="bg-white rounded-xl p-4 hover:bg-gray-50 transition-all cursor-pointer border border-[#E8DFD3] shadow-sm"
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
  );
}

export default CustomerListItem;












