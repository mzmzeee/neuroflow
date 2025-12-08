import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-950 border border-gray-700 text-xs text-gray-200 rounded shadow-lg z-50 pointer-events-none">
        {content}
      </div>
    </div>
  );
};