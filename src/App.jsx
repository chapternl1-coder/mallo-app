import React, { useState, useEffect } from 'react';

import ScreenRouter from './components/ScreenRouter';

import BottomNavigation from './components/BottomNavigation';

import ScrollToTopButton from './components/ScrollToTopButton';

import { SCREENS } from './constants/screens';

import useMalloAppState from './hooks/useMalloAppState';

import { useAuth } from './contexts/AuthContext';

import LoginScreen from './screens/LoginScreen';

import useSupabaseDebug from './hooks/useSupabaseDebug';

import useSupabaseReservations from './hooks/useSupabaseReservations';

import useVisitLogs from './hooks/useVisitLogs';

import { supabase } from './lib/supabaseClient';



export default function MalloApp() {

  const { user, loading } = useAuth();



  // Supabase에 있는 고객/예약 데이터를 콘솔로 확인하는 디버그용 훅

  useSupabaseDebug();



  // Supabase 연동을 위해 user를 훅에 넘겨줌

  const {

    screenRouterProps,

    currentScreen,

    activeTab,

    handleTabClick,

  } = useMalloAppState(user);



  // Supabase 데이터 로딩 + 콘솔 출력용

  const {

    customers,

    reservations: supabaseReservations,

    loading: reservationsLoading,

    error: reservationsError,

    refresh: refreshReservations,

  } = useSupabaseReservations();



  // Supabase 값으로 초기화되는 로컬 state

  const [reservations, setReservations] = useState([]);



  useEffect(() => {

    // Supabase에서 새로 가져오면 로컬 state를 덮어씀

    setReservations(supabaseReservations || []);

  }, [supabaseReservations]);

  // Supabase customers를 localStorage에 동기화 (삭제된 고객 제거)
  useEffect(() => {
    if (customers && customers.length >= 0) {
      try {
        localStorage.setItem('mallo_customers', JSON.stringify(customers));
        console.log('[App] Supabase customers를 localStorage에 동기화:', customers.length, '명');
      } catch (e) {
        console.error('[App] localStorage 동기화 실패:', e);
      }
    }
  }, [customers]);



  // UUID 검증 헬퍼 함수
  const isValidUuid = (value) => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  };

  // 예약 추가/삭제 함수 정의

  const addReservation = (newReservation) => {

    setReservations((prev) => [...prev, newReservation]);

  };



  const deleteReservation = async (reservationId) => {

    // 3-1. 먼저 로컬 state에서 삭제 (UI 즉시 반영)

    setReservations((prev) => prev.filter((res) => res.id !== reservationId));



    // 3-2. id 가 uuid가 아니면 Supabase 삭제는 생략 (옛 로컬 id 보호)

    if (!isValidUuid(reservationId)) {

      return;

    }



    try {

      const { error } = await supabase

        .from('reservations')

        .delete()

        .eq('id', reservationId)

        .eq('owner_id', user.id);



      if (error) {

        console.error('[Supabase] 예약 삭제 에러:', error);

        // 필요하면 여기서 alert 한 줄 추가 가능

      }

    } catch (e) {

      console.error('[Supabase] 예약 삭제 중 예외:', e);

    }

  };



  // Supabase visit_logs 데이터 로딩

  const {

    visitLogsByCustomer,

    visitLogs,

    allVisitLogs,

    loading: visitLogsLoading,

    error: visitLogsError,

    refresh: refreshVisitLogs,

  } = useVisitLogs();



  // 필요하면 아래처럼 콘솔에 다시 한 번 찍을 수도 있음

  console.log('[MalloApp] Supabase customers 길이:', customers.length);

  console.log('[MalloApp] Supabase reservations 길이:', supabaseReservations.length);

  console.log('[MalloApp] 로컬 reservations 길이:', reservations.length);

  console.log('[MalloApp] Supabase visit_logs 길이:', allVisitLogs.length);



  // 1) Auth 로딩 중 로딩 화면

  if (loading) {

    return (

      <div

        className="min-h-screen flex items-center justify-center"

        style={{ backgroundColor: '#F2F0E6' }}

      >

        <div className="text-center">

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E4D9CC] bg-white mb-3">

            <span className="text-xs font-semibold tracking-widest" style={{ color: '#C9A27A' }}>

              MALLO

            </span>

          </div>

          <p className="text-xs text-neutral-600">계정 정보를 불러오는 중입니다...</p>

        </div>

      </div>

    );

  }



  // 2) 로그인 안 된 상태면 → 로그인 화면

  if (!user) {

    return <LoginScreen />;

  }



  // 3) 로그인 된 상태면 → 메인 앱

  return (

    <div

      className="h-screen w-full flex items-center justify-center font-sans"

      style={{ backgroundColor: '#F2F0E6' }}

    >

      <div

        className="w-full max-w-md h-full sm:h-[90vh] sm:rounded-[2rem] sm:shadow-md overflow-hidden relative border-0"

        style={{ backgroundColor: '#F2F0E6' }}

      >

        <ScreenRouter

          {...screenRouterProps}

          reservationsLoading={reservationsLoading}

          customers={customers}  // Supabase에서 가져온 최신 customers 사용 (localStorage의 customers 덮어쓰기)

          reservations={reservations}

          visits={visitLogsByCustomer}

          visitLogs={visitLogs}

          allRecords={allVisitLogs}

          addReservation={addReservation}

          deleteReservation={deleteReservation}

          refreshVisitLogs={refreshVisitLogs}

          refreshReservations={refreshReservations}

        />



        {/* 스크롤이 일정 이상 내려갔을 때 공통으로 보이는 '맨 위로' 버튼 */}

        <ScrollToTopButton />



        {(currentScreen === SCREENS.HOME ||

          currentScreen === SCREENS.RESERVATION ||

          currentScreen === SCREENS.HISTORY ||

          currentScreen === SCREENS.PROFILE) && (

          <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />

        )}

      </div>

    </div>

  );

}
