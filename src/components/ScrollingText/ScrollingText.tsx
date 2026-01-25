import React from 'react';
import './ScrollingText.css';

interface ScrollingTextProps {
  items: string[];
  separator?: string;
  paddingEm?: number;
  minDuration?: number;
}

const ScrollingText: React.FC<ScrollingTextProps> = ({
  items,
  separator = ' | ',
  paddingEm = 3,
  minDuration = 10
}) => {
  const text = items.join(separator);
  const textLength = text.length;
  const animationDuration = Math.max(minDuration, textLength * 0.3);

  return (
    <div className="scrollingContainer">
      <div
        className="scrollingContent"
        style={{
          animationDuration: `${animationDuration}s`,
          ['--scroll-padding' as any]: `${paddingEm}em`
        }}
      >
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
};

export default ScrollingText;
