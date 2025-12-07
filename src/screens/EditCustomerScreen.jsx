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
  refreshVisitLogs,
  refreshReservations
}) {
  const { user } = useAuth();

  const handleComplete = async () => {
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

    // 🔹 Supabase customers 테이블 업데이트 (UUID인 경우만, 기본 필드만)
    let supabaseUpdatedCustomer = null;

    if (selectedCustomerId && isValidUuid(String(selectedCustomerId)) && user) {
      try {
        const updatePayload = {
          name: editCustomerName.trim(),
          phone: editCustomerPhone.trim() || null,
          memo: editCustomerMemo.trim() || null,
        };

        const { data, error } = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', selectedCustomerId)
          .eq('owner_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('[EditCustomerScreen] Supabase 업데이트 에러:', error);
          alert('고객 정보를 저장하는 중 오류가 발생했습니다: ' + error.message);
          return;
        }

        supabaseUpdatedCustomer = data;
        console.log('[EditCustomerScreen] Supabase 업데이트 성공:', {
          customerId: selectedCustomerId,
          updatePayload,
        });
      } catch (e) {
        console.error('[EditCustomerScreen] Supabase 업데이트 중 예외:', e);
        alert('고객 정보를 저장하는 중 오류가 발생했습니다.');
        return;
      }
    }

    // 🔹 고객 정보 업데이트 (전역 state + localStorage)
    setCustomers(prev => {
      const updated = prev.map(c => {
        if (c.id === selectedCustomerId) {
          // Supabase에서 최신 데이터를 받아온 경우 그걸 우선 반영
          const base = supabaseUpdatedCustomer ? { ...c, ...supabaseUpdatedCustomer } : c;
          return {
            ...base,
            name: editCustomerName.trim(),
            phone: editCustomerPhone.trim() || null,
            // 레거시 태그는 유지
            tags: editCustomerTags.filter(tag => tag.trim() !== ''),
            // 새로운 고객 특징 태그
            customerTags: updatedCustomerTags,
            memo: editCustomerMemo.trim() || null
          };
        }
        return c;
      });
      
      if (saveToLocalStorage) {
        saveToLocalStorage('mallo_customers', updated);
      }
      return updated;
    });

    // 🔹 관련된 visits의 customerName, customerPhone도 업데이트 (로컬 상태)
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

    // 🔹 편집 화면 닫기 + 상태 초기화
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
          {/* ↓↓↓ 아래 삭제 로직은 기존 그대로 유지 ↓↓↓ */}
          <button 
            onClick={async () => {
              const confirmMessage = `⚠️ 경고: "${editCustomerName}" 고객을 삭제하시겠습니까?\n\n` +
                `다음 항목이 모두 삭제됩니다:\n` +
                `• 고객 정보\n` +
                `• 모든 방문 기록\n` +
                `• 모든 예약 정보\n\n` +
                `이 작업은 복구할 수 없습니다.`;
              
              if (window.confirm(confirmMessage)) {
                const customerId = selectedCustomerId;
                
                // (이하 삭제 로직 그대로 ⬇️)
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
                
                if (user && editCustomerName && editCustomerPhone) {
                  try {
                    const { data: allVisitLogs, error: fetchError } = await supabase
                      .from('visit_logs')
                      .select('id, summary_json, customer_id')
                      .eq('owner_id', user.id)
                      .is('customer_id', null);
                    
                    if (fetchError) {
                      console.error('[Supabase] 방문 기록 조회 에러:', fetchError);
                    } else if (allVisitLogs && allVisitLogs.length > 0) {
                      const matchingVisitIds = [];
                      
                      allVisitLogs.forEach(visit => {
                        const summaryJson = visit.summary_json || {};
                        const customerInfo = summaryJson.customerInfo || summaryJson.customer || {};
                        const summaryName = customerInfo.name?.trim();
                        const summaryPhone = String(customerInfo.phone || '').replace(/[^0-9]/g, '');
                        const customerName = editCustomerName.trim();
                        const customerPhone = String(editCustomerPhone).replace(/[^0-9]/g, '');
                        
                        if (summaryName === customerName && summaryPhone === customerPhone && summaryPhone.length > 0) {
                          matchingVisitIds.push(visit.id);
                        }
                      });
                      
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
                
                if (refreshVisitLogs) {
                  refreshVisitLogs();
                }
                
                if (refreshReservations) {
                  refreshReservations();
                }
                
                setCustomers(prev => {
                  const updated = prev.filter(c => c.id !== customerId);
                  if (saveToLocalStorage) {
                    saveToLocalStorage('mallo_customers', updated);
                  }
                  return updated;
                });
                
                setVisits(prev => {
                  const updated = { ...prev };
                  
                  delete updated[customerId];
                  delete updated[String(customerId)];
                  
                  if (updated['no_customer'] && Array.isArray(updated['no_customer'])) {
                    updated['no_customer'] = updated['no_customer'].filter(visit => {
                      const summaryJson = visit.summaryJson || visit.detail || {};
                      const customerInfo = summaryJson.customerInfo || summaryJson.customer || {};
                      const summaryName = customerInfo.name?.trim();
                      const summaryPhone = String(customerInfo.phone || '').replace(/[^0-9]/g, '');
                      const customerName = editCustomerName.trim();
                      const customerPhone = String(editCustomerPhone).replace(/[^0-9]/g, '');
                      
                      return !(summaryName === customerName && summaryPhone === customerPhone && summaryPhone.length > 0);
                    });
                    
                    if (updated['no_customer'].length === 0) {
                      delete updated['no_customer'];
                    }
                  }
                  
                  localStorage.setItem('visits', JSON.stringify(updated));
                  return updated;
                });
                
                if (setReservations && reservations) {
                  setReservations(prev => {
                    const updated = prev.filter(res => {
                      const resCustomerId = res.customerId || res.customer_id;
                      const matchById = resCustomerId === customerId || 
                                       String(resCustomerId) === String(customerId);
                      
                      const matchByName = res.name && editCustomerName && 
                                        res.name.trim() === editCustomerName.trim();
                      const matchByPhone = res.phone && editCustomerPhone && 
                                         res.phone.replace(/\D/g, '') === editCustomerPhone.replace(/\D/g, '');
                      
                      return !(matchById || (matchByName && matchByPhone));
                    });
                    localStorage.setItem('reservations', JSON.stringify(updated));
                    return updated;
                  });
                }
                
                setEditCustomerName('');
                setEditCustomerPhone('');
                setEditCustomerTags([]);
                setEditCustomerTagIds([]);
                setEditCustomerMemo('');
                setNewTag('');
                
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
