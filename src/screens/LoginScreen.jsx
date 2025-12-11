import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function LoginScreen({ onGoToSignUp }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await signIn({ email, password });
      setMessage('로그인 완료! 잠시만 기다려 주세요.');
    } catch (error) {
      console.error(error);
      setMessage(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center px-6 pt-8"
      style={{ backgroundColor: '#F2F0E6' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex justify-center -mb-6">
            <img 
              src="/logo.png" 
              alt="Mallo 로고" 
              className="w-72 h-72 object-contain"
            />
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            오늘의 시술일지, 말로 남기고 한 번에 정리하세요.
          </p>
        </div>

        <div className="bg-white border border-[#E4D9CC] rounded-2xl px-5 py-6 shadow-sm/5">
          <form onSubmit={handleLogin} className="space-y-3">
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
              {submitting ? '처리 중...' : '로그인'}
            </button>
          </form>

          <button
            type="button"
            onClick={onGoToSignUp}
            className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold border-2"
            style={{ borderColor: '#C9A27A', color: '#C9A27A' }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
