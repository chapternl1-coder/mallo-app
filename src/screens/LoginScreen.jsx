import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
        setMessage('로그인 완료! 잠시만 기다려 주세요.');
      } else {
        await signUp({ email, password });
        setMessage('회원가입 완료! 잠시만 기다려 주세요.');
      }

      // ✅ 이제는 새로고침 필요 없음
      // AuthContext의 user 상태가 바뀌면 App.jsx에서 자동으로 메인 화면으로 전환됨.
    } catch (error) {
      console.error(error);
      setMessage(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#E4D9CC] bg-white mb-3">
            <span className="text-xs font-semibold tracking-widest" style={{ color: '#C9A27A' }}>
              MALLO
            </span>
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 mb-1">말로해</h1>
          <p className="text-xs text-neutral-500">
            오늘의 시술일지, 말로 남기고 한 번에 정리하세요.
          </p>
        </div>

        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-6 shadow-sm/5">
          <div className="flex mb-4 bg-neutral-50 rounded-full p-1">
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-2 rounded-full transition ${
                mode === 'login'
                  ? 'bg-white shadow-sm text-neutral-900'
                  : 'text-neutral-400'
              }`}
              onClick={() => setMode('login')}
            >
              로그인
            </button>
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-2 rounded-full transition ${
                mode === 'signup'
                  ? 'bg-white shadow-sm text-neutral-900'
                  : 'text-neutral-400'
              }`}
              onClick={() => setMode('signup')}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-[#E4D9CC] bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A27A]"
                placeholder="6자 이상 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && (
              <p className="text-[11px] text-neutral-500 mt-1 whitespace-pre-line">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#C9A27A' }}
            >
              {submitting
                ? '처리 중...'
                : mode === 'login'
                ? '로그인'
                : '회원가입'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-[11px] text-neutral-400 text-center leading-relaxed">
          한 계정으로 고객, 예약, 기록, 태그가 모두 연결됩니다.
          <br />
          추후 유료 플랜도 이 계정 기준으로 관리할 예정입니다.
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;
