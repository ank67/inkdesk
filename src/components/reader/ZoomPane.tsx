import { useRef, useState, type ReactNode, type TouchList } from "react";

const MIN = 0.6;
const MAX = 4;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

/**
 * Touch-first zoom surface: multi-touch pinch, double-tap toggle and
 * ctrl/cmd + wheel on desktop. No zoom buttons by design.
 */
export function ZoomPane({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [scale, setScale] = useState(1);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const distance = (t: TouchList) => {
    const [a, b] = [t[0]!, t[1]!];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  return (
    <div
      className={`touch-pan-y overscroll-contain ${className}`}
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          pinch.current = { dist: distance(e.touches), scale };
          return;
        }
        if (e.touches.length === 1) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            setScale((s) => (s > 1.05 ? 1 : 2));
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length !== 2 || !pinch.current) return;
        e.preventDefault();
        const next = (pinch.current.scale * distance(e.touches)) / pinch.current.dist;
        setScale(clamp(next));
      }}
      onTouchEnd={(e) => {
        if (e.touches.length < 2) pinch.current = null;
      }}
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        setScale((s) => clamp(s - e.deltaY * 0.005));
      }}
      onDoubleClick={() => setScale((s) => (s > 1.05 ? 1 : 2))}
    >
      <div
        className="mx-auto w-max origin-top transition-transform duration-100 ease-out will-change-transform"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
