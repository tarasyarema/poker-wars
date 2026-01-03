import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  skipAnimation?: boolean;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 20,
  skipAnimation = false,
  onComplete,
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(skipAnimation ? text.length : 0);
  const [isComplete, setIsComplete] = useState(skipAnimation);
  const intervalRef = useRef<number | null>(null);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedLength(text.length);
      setIsComplete(true);
      return;
    }

    // If text grew (new chunks appended), continue from where we were
    // If text changed completely (different content), reset
    const prevText = prevTextRef.current;
    const isAppending = text.startsWith(prevText) || prevText.startsWith(text.slice(0, prevText.length));

    if (!isAppending) {
      // Text changed completely, reset
      setDisplayedLength(0);
    }

    prevTextRef.current = text;

    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    setIsComplete(false);

    intervalRef.current = window.setInterval(() => {
      setDisplayedLength(prev => {
        if (prev < text.length) {
          return prev + 1;
        } else {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
          }
          setIsComplete(true);
          onComplete?.();
          return prev;
        }
      });
    }, speed);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, skipAnimation, onComplete]);

  return (
    <span>
      {text.slice(0, displayedLength)}
      {!isComplete && <span className="animate-blink text-nes-green">&#9612;</span>}
    </span>
  );
}
