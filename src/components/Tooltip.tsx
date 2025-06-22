import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isVisible && (
        <div className="tooltip-content">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;