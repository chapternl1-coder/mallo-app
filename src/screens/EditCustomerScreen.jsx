import React, { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { SCREENS } from '../constants/screens';

function EditCustomerScreen({
  editCustomerName,
  setEditCustomerName,
  editCustomerPhone,
  setEditCustomerPhone,
  editCustomerTags,
  setEditCustomerTags,
  editCustomerTagIds,
  setEditCustomerTagIds,
  editCustomerMemo,
  setEditCustomerMemo,
  newTag,
  setNewTag,
  selectedCustomerId,
  allCustomerTags,
  isEditCustomerTagPickerOpen,
  setIsEditCustomerTagPickerOpen,
  CustomerTagPickerModal,
  setCustomers,
  setVisits,
  setCurrentScreen,
  setSelectedCustomerId,
  saveToLocalStorage,
  reservations,
  setReservations
}) {
  const handleComplete = () => {
    if (!editCustomerName.trim()) {
      alert('이름은 필수입니다.');
      return;
    }

    // 편집된 고객 특징 태그를 카테고리별로 분류
    const updatedCustomerTags = {
      caution: [],
      trait: [],
      payment: [],
      pattern: []
    };
    
    editCustomerTagIds.forEach(tagId => {
      const tag = allCustomerTags.find(t => t.id === tagId);
      if (tag) {
        const category = tag.category;
        if (updatedCustomerTags[category]) {
          updatedCustomerTags[category] = [...updatedCustomerTags[category], tag.label];
        } else {
          updatedCustomerTags[category] = [tag.label];
        }
      }
    });

    // 고객 정보 업데이트
    setCustomers(prev => {
      const updated = prev.map(c => {
        if (c.id === selectedCustomerId) {
          return {
            ...c,
            name: editCustomerName.trim(),
            phone: editCustomerPhone.trim() || null,
            tags: editCustomerTags.filter(tag => tag.trim() !== ''), // 레거시 태그 유지
            customerTags: updatedCustomerTags, // 고객 특징 태그 업데이트
            memo: editCustomerMemo.trim() || null
          };
        }
        return c;
      });
      
      // localStorage에 저장
      saveToLocalStorage('mallo_customers', updated);
      return updated;
    });

    // 관련된 visits의 customerName, customerPhone도 업데이트
    setVisits(prev => {
      const updated = { ...prev };
      if (updated[selectedCustomerId]) {
        updated[selectedCustomerId] = updated[selectedCustomerId].map(visit => ({
          ...visit,
          customerName: editCustomerName.trim(),
          customerPhone: editCustomerPhone.trim() || null
        }));
      }
      localStorage.setItem('visits', JSON.stringify(updated));
      return updated;
    });

    // 편집 화면 닫기
    setEditCustomerName('');
    setEditCustomerPhone('');
    setEditCustomerTags([]);
    setEditCustomerTagIds([]);
    setEditCustomerMemo('');
    setNewTag('');
    setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
  };

  const handleCancel = () => {
    setEditCustomerName('');
    setEditCustomerPhone('');
    setEditCustomerTags([]);
    setEditCustomerTagIds([]);
    setEditCustomerMemo('');
    setNewTag('');
    setCurrentScreen(SCREENS.CUSTOMER_DETAIL);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F0E6' }}>
      {/* Header */}
      <header className="bg-white px-8 py-6 sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 shadow-sm">
        <button 
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-lg" style={{ color: '#232323' }}>고객 정보 편집</h2>
        <button 
          onClick={handleComplete}
          className="px-4 py-2 rounded-2xl font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
          style={{ backgroundColor: '#C9A27A' }}
        >
          완료
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-5">
        {/* 이름 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>이름 *</label>
          <input
            type="text"
            value={editCustomerName}
            onChange={(e) => setEditCustomerName(e.target.value)}
            className="w-full px-3 py-1.5 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323', height: '36px' }}
            placeholder="고객 이름을 입력하세요"
          />
        </div>

        {/* 전화번호 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>전화번호</label>
          <input
            type="tel"
            value={editCustomerPhone}
            onChange={(e) => setEditCustomerPhone(e.target.value)}
            className="w-full px-3 py-1.5 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors"
            style={{ color: '#232323', height: '36px' }}
            placeholder="010-0000-0000"
          />
        </div>

        {/* 고객 특징 태그 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: '#232323' }}>고객 특징 태그</label>
            <p className="text-sm" style={{ color: '#232323', opacity: 0.7 }}>
              고객의 특징을 태그로 관리할 수 있습니다.
            </p>
          </div>

          {/* 태그 칩들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {editCustomerTagIds.length === 0 ? (
              <p className="text-sm" style={{ color: '#232323', opacity: 0.5 }}>
                태그가 없어요. 아래 버튼에서 추가할 수 있어요.
              </p>
            ) : (
              editCustomerTagIds.map((tagId) => {
                const tag = allCustomerTags.find((t) => t.id === tagId);
                if (!tag) return null;

                // 주의 태그만 빨간색, 나머지는 회색
                const isCaution = tag.category === 'caution';

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setEditCustomerTagIds((prev) =>
                        prev.filter((id) => id !== tag.id)
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1 ${
                      isCaution 
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {tag.label}
                    <X size={14} />
                  </button>
                );
              })
            )}
          </div>

          {/* 태그 더 추가하기 버튼 */}
          <button
            type="button"
            onClick={() => setIsEditCustomerTagPickerOpen(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 태그 더 추가하기
          </button>
        </div>

        {/* 메모 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-bold mb-3" style={{ color: '#232323' }}>메모</label>
          <textarea
            value={editCustomerMemo}
            onChange={(e) => setEditCustomerMemo(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#C9A27A] focus:outline-none transition-colors resize-none"
            style={{ color: '#232323', minHeight: '100px' }}
            placeholder="고객에 대한 중요한 메모를 입력하세요"
            rows={4}
          />
        </div>
        
        {/* 고객 삭제 버튼 (스크롤 끝에만 표시) */}
        <div className="flex justify-center p-6 mt-5">
          <button 
            onClick={() => {
              // 경고 메시지 (더 명확하게)
              const confirmMessage = `⚠️ 경고: "${editCustomerName}" 고객을 삭제하시겠습니까?\n\n` +
                `다음 항목이 모두 삭제됩니다:\n` +
                `• 고객 정보\n` +
                `• 모든 방문 기록\n` +
                `• 모든 예약 정보\n\n` +
                `이 작업은 복구할 수 없습니다.`;
              
              if (window.confirm(confirmMessage)) {
                const customerId = selectedCustomerId;
                
                // 고객 삭제
                setCustomers(prev => {
                  const updated = prev.filter(c => c.id !== customerId);
                  // localStorage에 저장
                  if (saveToLocalStorage) {
                    saveToLocalStorage('mallo_customers', updated);
                  }
                  return updated;
                });
                
                // 해당 고객의 방문 기록 삭제
                setVisits(prev => {
                  const updated = { ...prev };
                  delete updated[customerId];
                  // localStorage에 저장
                  localStorage.setItem('visits', JSON.stringify(updated));
                  return updated;
                });
                
                // 해당 고객의 예약 정보 삭제 (customerId로 연결된 예약)
                if (setReservations && reservations) {
                  setReservations(prev => {
                    const updated = prev.filter(res => {
                      // customerId가 일치하는 예약 삭제
                      // 숫자와 문자열 ID 모두 처리
                      const resCustomerId = res.customerId;
                      const matchById = resCustomerId === customerId || 
                                       String(resCustomerId) === String(customerId);
                      
                      // customerId가 없지만 이름/전화번호가 일치하는 예약도 삭제
                      const matchByName = res.name && editCustomerName && 
                                        res.name.trim() === editCustomerName.trim();
                      const matchByPhone = res.phone && editCustomerPhone && 
                                         res.phone.replace(/\D/g, '') === editCustomerPhone.replace(/\D/g, '');
                      
                      // customerId가 일치하거나, 이름과 전화번호가 모두 일치하면 삭제
                      return !(matchById || (matchByName && matchByPhone));
                    });
                    // localStorage에 저장
                    localStorage.setItem('reservations', JSON.stringify(updated));
                    return updated;
                  });
                }
                
                // 상태 초기화
                setEditCustomerName('');
                setEditCustomerPhone('');
                setEditCustomerTags([]);
                setEditCustomerTagIds([]);
                setEditCustomerMemo('');
                setNewTag('');
                
                // History 화면으로 이동
                setSelectedCustomerId(null);
                setCurrentScreen(SCREENS.HISTORY);
              }
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all"
            style={{ backgroundColor: '#EF4444' }}
          >
            고객 삭제
          </button>
        </div>
      </main>

      {/* 고객 특징 태그 선택 모달 */}
      {isEditCustomerTagPickerOpen && (
        <CustomerTagPickerModal
          allCustomerTags={allCustomerTags}
          selectedTagIds={editCustomerTagIds}
          onClose={() => setIsEditCustomerTagPickerOpen(false)}
          onChangeSelected={(nextSelected) => setEditCustomerTagIds(nextSelected)}
        />
      )}
    </div>
  );
}

export default EditCustomerScreen;


