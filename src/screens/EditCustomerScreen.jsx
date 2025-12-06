import React, { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { SCREENS } from '../constants/screens';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// UUID 검증 헬퍼 함수
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
};

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
  setReservations,
  refreshVisitLogs
}) {
  const { user } = useAuth();
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
      <header className="flex items-center justify-between px-5 pt-4 pb-2 bg-[#F2F0E6] sticky top-0 z-20">
        {/* 뒤로가기 버튼 */}
        <button 
          type="button"
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 rounded-2xl transition-colors" 
          style={{ color: '#232323' }}
        >
          <span className="text-[32px]">&#x2039;</span>
        </button>

        {/* 가운데 타이틀 */}
        <h2 className="font-bold text-base" style={{ color: '#232323' }}>고객 정보 편집</h2>

        {/* 오른쪽 완료 버튼 */}
        <button 
          type="button"
          onClick={handleComplete}
          className="px-3 py-1.5 text-[12px] font-medium rounded-full bg-[#C9A27A] text-white"
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
            onClick={async () => {
              // 경고 메시지 (더 명확하게)
              const confirmMessage = `⚠️ 경고: "${editCustomerName}" 고객을 삭제하시겠습니까?\n\n` +
                `다음 항목이 모두 삭제됩니다:\n` +
                `• 고객 정보\n` +
                `• 모든 방문 기록\n` +
                `• 모든 예약 정보\n\n` +
                `이 작업은 복구할 수 없습니다.`;
              
              if (window.confirm(confirmMessage)) {
                const customerId = selectedCustomerId;
                
                // 1. Supabase에서 고객 삭제 (UUID인 경우만)
                if (isValidUuid(customerId) && user) {
                  try {
                    const { error: customerError } = await supabase
                      .from('customers')
                      .delete()
                      .eq('id', customerId)
                      .eq('owner_id', user.id);
                    
                    if (customerError) {
                      console.error('[Supabase] 고객 삭제 에러:', customerError);
                      alert('고객 삭제 중 오류가 발생했습니다: ' + customerError.message);
                      return;
                    }
                    console.log('[Supabase] 고객 삭제 성공:', customerId);
                  } catch (e) {
                    console.error('[Supabase] 고객 삭제 중 예외:', e);
                    alert('고객 삭제 중 오류가 발생했습니다.');
                    return;
                  }
                }
                
                // 2. Supabase에서 해당 고객의 예약 삭제
                if (user && reservations) {
                  const customerReservations = reservations.filter(res => {
                    const resCustomerId = res.customerId || res.customer_id;
                    return resCustomerId === customerId || 
                           String(resCustomerId) === String(customerId);
                  });
                  
                  for (const reservation of customerReservations) {
                    if (isValidUuid(reservation.id)) {
                      try {
                        const { error: reservationError } = await supabase
                          .from('reservations')
                          .delete()
                          .eq('id', reservation.id)
                          .eq('owner_id', user.id);
                        
                        if (reservationError) {
                          console.error('[Supabase] 예약 삭제 에러:', reservationError);
                        } else {
                          console.log('[Supabase] 예약 삭제 성공:', reservation.id);
                        }
                      } catch (e) {
                        console.error('[Supabase] 예약 삭제 중 예외:', e);
                      }
                    }
                  }
                }
                
                // 3. Supabase에서 해당 고객의 방문 기록 삭제
                // 3-1. customer_id로 직접 연결된 방문 기록 삭제
                if (user && isValidUuid(customerId)) {
                  try {
                    const { error: visitLogsError } = await supabase
                      .from('visit_logs')
                      .delete()
                      .eq('customer_id', customerId)
                      .eq('owner_id', user.id);
                    
                    if (visitLogsError) {
                      console.error('[Supabase] 방문 기록 삭제 에러 (customer_id):', visitLogsError);
                    } else {
                      console.log('[Supabase] 방문 기록 삭제 성공 (customer_id)');
                    }
                  } catch (e) {
                    console.error('[Supabase] 방문 기록 삭제 중 예외 (customer_id):', e);
                  }
                }
                
                // 3-2. summary_json에 고객 정보가 있는 방문 기록도 삭제
                // customer_id가 null이지만 summary_json.customerInfo에 이름/전화번호가 일치하는 경우
                if (user && editCustomerName && editCustomerPhone) {
                  try {
                    // 먼저 모든 방문 기록을 가져와서 필터링
                    const { data: allVisitLogs, error: fetchError } = await supabase
                      .from('visit_logs')
                      .select('id, summary_json, customer_id')
                      .eq('owner_id', user.id)
                      .is('customer_id', null); // customer_id가 null인 것만
                    
                    if (fetchError) {
                      console.error('[Supabase] 방문 기록 조회 에러:', fetchError);
                    } else if (allVisitLogs && allVisitLogs.length > 0) {
                      // summary_json에서 고객 정보를 추출하여 일치하는 방문 기록 찾기
                      const matchingVisitIds = [];
                      
                      allVisitLogs.forEach(visit => {
                        const summaryJson = visit.summary_json || {};
                        const customerInfo = summaryJson.customerInfo || summaryJson.customer || {};
                        const summaryName = customerInfo.name?.trim();
                        const summaryPhone = String(customerInfo.phone || '').replace(/[^0-9]/g, '');
                        const customerName = editCustomerName.trim();
                        const customerPhone = String(editCustomerPhone).replace(/[^0-9]/g, '');
                        
                        // 이름과 전화번호가 모두 일치하면 삭제 대상
                        if (summaryName === customerName && summaryPhone === customerPhone && summaryPhone.length > 0) {
                          matchingVisitIds.push(visit.id);
                        }
                      });
                      
                      // 일치하는 방문 기록 삭제
                      if (matchingVisitIds.length > 0) {
                        const { error: deleteError } = await supabase
                          .from('visit_logs')
                          .delete()
                          .in('id', matchingVisitIds)
                          .eq('owner_id', user.id);
                        
                        if (deleteError) {
                          console.error('[Supabase] 방문 기록 삭제 에러 (summary_json):', deleteError);
                        } else {
                          console.log(`[Supabase] 방문 기록 삭제 성공 (summary_json): ${matchingVisitIds.length}개`);
                        }
                      }
                    }
                  } catch (e) {
                    console.error('[Supabase] 방문 기록 삭제 중 예외 (summary_json):', e);
                  }
                }
                
                // 3-3. visit_logs 새로고침
                if (refreshVisitLogs) {
                  refreshVisitLogs();
                }
                
                // 4. 로컬 state에서 고객 삭제
                setCustomers(prev => {
                  const updated = prev.filter(c => c.id !== customerId);
                  // localStorage에 저장
                  if (saveToLocalStorage) {
                    saveToLocalStorage('mallo_customers', updated);
                  }
                  return updated;
                });
                
                // 5. 로컬 state에서 해당 고객의 방문 기록 삭제
                // customerId로 직접 연결된 것 + summary_json에 고객 정보가 있는 것도 삭제
                setVisits(prev => {
                  const updated = { ...prev };
                  
                  // customerId로 직접 연결된 방문 기록 삭제
                  delete updated[customerId];
                  delete updated[String(customerId)];
                  
                  // 'no_customer' 키의 방문 기록에서도 해당 고객의 기록 삭제
                  if (updated['no_customer'] && Array.isArray(updated['no_customer'])) {
                    updated['no_customer'] = updated['no_customer'].filter(visit => {
                      const summaryJson = visit.summaryJson || visit.detail || {};
                      const customerInfo = summaryJson.customerInfo || summaryJson.customer || {};
                      const summaryName = customerInfo.name?.trim();
                      const summaryPhone = String(customerInfo.phone || '').replace(/[^0-9]/g, '');
                      const customerName = editCustomerName.trim();
                      const customerPhone = String(editCustomerPhone).replace(/[^0-9]/g, '');
                      
                      // 이름과 전화번호가 모두 일치하면 삭제
                      return !(summaryName === customerName && summaryPhone === customerPhone && summaryPhone.length > 0);
                    });
                    
                    // 'no_customer' 배열이 비어있으면 키 자체를 삭제
                    if (updated['no_customer'].length === 0) {
                      delete updated['no_customer'];
                    }
                  }
                  
                  // localStorage에 저장
                  localStorage.setItem('visits', JSON.stringify(updated));
                  return updated;
                });
                
                // 6. 로컬 state에서 해당 고객의 예약 정보 삭제
                if (setReservations && reservations) {
                  setReservations(prev => {
                    const updated = prev.filter(res => {
                      // customerId가 일치하는 예약 삭제
                      // 숫자와 문자열 ID 모두 처리
                      const resCustomerId = res.customerId || res.customer_id;
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
                
                // 7. 상태 초기화
                setEditCustomerName('');
                setEditCustomerPhone('');
                setEditCustomerTags([]);
                setEditCustomerTagIds([]);
                setEditCustomerMemo('');
                setNewTag('');
                
                // 8. History 화면으로 이동
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


