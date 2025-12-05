import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * 현재 로그인한 유저의 프로필/샵 정보를 가져오는 훅
 * - profiles 테이블에서 id = user.id row 조회
 * - 없으면 기본값으로 insert 후 다시 반환
 */
export default function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1) 기존 프로필 있는지 조회
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116: no rows found
        console.error('[profiles] select error', error);
        setError(error);
        setLoading(false);
        return;
      }

      let profileData = data;

      // 2) row가 없으면 기본값으로 새로 생성
      if (!profileData) {
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            owner_name: null,
            shop_name: null,
            shop_email: user.email,
          })
          .select('*')
          .single();

        if (insertError) {
          console.error('[profiles] insert error', insertError);
          setError(insertError);
          setLoading(false);
          return;
        }

        profileData = inserted;
      }

      setProfile(profileData);
    } catch (err) {
      console.error('[profiles] unexpected error', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 나중에 프로필 수정 화면에서 쓸 수 있게 update 함수도 미리 만들어 둠
  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
        })
        .eq('id', user.id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[profiles] update error', error);
        setError(error);
        throw error;
      }

      setProfile(data);
      return data;
    },
    [user]
  );

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
    updateProfile,
  };
}

