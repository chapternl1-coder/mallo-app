import React from 'react';

function AppLogo({ size = 'md', src, alt = 'Mallo' }) {
  const circleSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-9 h-9';

  return (
    <div
      className={`${circleSize} rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain scale-[1.18] shrink-0"
        />
      ) : (
        <span
          className="text-[18px] font-semibold leading-none tracking-tight"
          style={{ color: '#C9A27A' }}
        >
          말
        </span>
      )}
    </div>
  );
}

export default AppLogo;

