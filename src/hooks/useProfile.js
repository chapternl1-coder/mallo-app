import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * 현재 로그인한 유저의 프로필을 Supabase에서 가져오고,
 * 없으면 자동으로 생성한 뒤 반환해 주는 훅.
 *
 * - profile: { id, owner_name, shop_name, ... } 또는 null
 * - loading: 프로필을 불러오는 중인지 여부
 * - saving: 저장(업데이트) 중인지 여부
 * - error: 마지막 에러 객체(또는 null)
 * - updateProfile(updates): Supabase에 upsert 후 최신 profile 반환
 * - refetch(): 프로필 다시 불러오기
 */
export default function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // 세션 확인 (로그아웃 직후 방지)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // 로그아웃 상태에서는 프로필 요청하지 않음 (정상 동작)
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1) 내 id에 해당하는 프로필을 먼저 조회
      const { data, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = row 없음
        throw selectError;
      }

      if (!data) {
        // 2) 없으면 새 프로필 생성 (최소 필드만)
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            owner_name: '',
            shop_name: '',
          })
          .select('*')
          .single();

        if (insertError) throw insertError;
        setProfile(inserted);
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error('[useProfile] fetchProfile error:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [fetchProfile, user]);

  // 15초마다, 그리고 포커스/가시성 변경 시 최신 프로필을 다시 가져와 기기 간 동기화
  useEffect(() => {
    // user가 없으면 아무것도 하지 않음
    if (!user) {
      // cleanup 함수는 항상 반환 (이전 이벤트 정리용)
      return () => {};
    }

    const handleFocus = () => {
      // 호출 시점에 다시 user 확인 (로그아웃 직후 방지)
      if (!user) return;
      fetchProfile();
    };

    const intervalId = setInterval(() => {
      // 호출 시점에 다시 user 확인 (로그아웃 직후 방지)
      if (!user) return;
      fetchProfile();
    }, 15000); // 15초 폴링

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, fetchProfile]);

  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return null;

      setSaving(true);
      setError(null);

      try {
        // 스키마에 있는 필드들을 모두 보냄 (profiles 컬럼 추가됨)
        const payload = { id: user.id };
        ['owner_name', 'shop_name', 'phone', 'address', 'memo'].forEach((key) => {
          if (updates[key] !== undefined) {
            payload[key] = updates[key];
          }
        });

        const { data, error: upsertError } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select('*')
          .single();

        if (upsertError) {
          throw upsertError;
        }

        setProfile(data);
        return data;
      } catch (e) {
        console.error('[useProfile] updateProfile error:', e);
        setError(e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  return {
    profile,
    loading,
    saving,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}

