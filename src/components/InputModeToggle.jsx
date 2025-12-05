import React from 'react';
import { Mic, Keyboard } from 'lucide-react';

function InputModeToggle({ inputMode, onChange }) {
  const isVoice = inputMode === 'voice';

  return (
    <div className="inline-flex items-center gap-1 bg-[#F9F5EF] rounded-full p-1 border border-[#E3DDD3] shadow-sm">
      <button
        type="button"
        onClick={() => onChange('voice')}
        className={[
          'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200',
          isVoice
            ? 'bg-[#C9A27A] text-white shadow-md font-medium'
            : 'text-[#A59B90] hover:text-[#8E8377] hover:bg-white/50 font-normal'
        ].join(' ')}
      >
        <Mic size={14} />
        <span className="text-[11px]">음성</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('text')}
        className={[
          'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200',
          !isVoice
            ? 'bg-[#C9A27A] text-white shadow-md font-medium'
            : 'text-[#A59B90] hover:text-[#8E8377] hover:bg-white/50 font-normal'
        ].join(' ')}
      >
        <Keyboard size={14} />
        <span className="text-[11px]">텍스트</span>
      </button>
    </div>
  );
}

export default InputModeToggle;

