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
          'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200',
          isVoice
            ? 'bg-[#C9A27A] text-white shadow-md'
            : 'text-[#A59B90] hover:text-[#8E8377] hover:bg-white/50'
        ].join(' ')}
      >
        <Mic size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('text')}
        className={[
          'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200',
          !isVoice
            ? 'bg-[#C9A27A] text-white shadow-md'
            : 'text-[#A59B90] hover:text-[#8E8377] hover:bg-white/50'
        ].join(' ')}
      >
        <Keyboard size={16} />
      </button>
    </div>
  );
}

export default InputModeToggle;

