"use client";

import React from "react";

interface LoaderProgressiveBarProps {
  duration?: number;
  onComplete?: () => void;
  label?: string;
}

const KEYFRAMES = `
@keyframes pf-loading {
    0%   { width: 0; }
    80%  { width: 100%; }
    100% { width: 100%; }
}
@keyframes pf-blink {
    0%, 100% { opacity: 0; }
    50%       { opacity: 1; }
}
`;

export const LoaderProgressiveBar: React.FC<LoaderProgressiveBarProps> = ({ label = "Loading" }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Loading text */}
      <div className="text-white text-sm font-semibold font-syne">
        {label}
        <span style={{ animation: "pf-blink 1.5s infinite", marginLeft: 3 }}>.</span>
        <span style={{ animation: "pf-blink 1.5s infinite 0.3s", marginLeft: 3 }}>.</span>
        <span style={{ animation: "pf-blink 1.5s infinite 0.6s", marginLeft: 3 }}>.</span>
      </div>

      {/* Bar track */}
      <div className="flex items-center box-border p-[5px] w-[200px] h-[30px] bg-[#0A0A0A] border border-[#1E1E1E] shadow-[inset_-2px_2px_4px_#000000] rounded-[15px]">
        {/* Animated fill */}
        <div
          className="relative flex justify-center flex-col h-[20px] overflow-hidden rounded-[10px] bg-gradient-to-t from-[rgba(57,255,20,0.8)] to-[rgba(57,255,20,1)]"
          style={{ animation: "pf-loading 4s ease-out infinite", width: 0 }}
        >
          {/* Shine bars */}
          <div className="absolute flex items-center gap-[18px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-[10px] h-[45px] opacity-20 rotate-45 bg-gradient-to-tr from-white to-transparent"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoaderProgressiveBar;
