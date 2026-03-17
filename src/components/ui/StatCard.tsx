import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  sparklineData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60 group-hover:opacity-100 transition-default">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AnimatedCounter({ value }: { value: string | number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (typeof value === 'number' && typeof prevRef.current === 'number') {
      const start = prevRef.current as number;
      const end = value;
      const duration = 600;
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        setDisplayValue(current);
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      setDisplayValue(value);
    }
    prevRef.current = value;
  }, [value]);

  return <>{typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}</>;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon: Icon, sparklineData }: StatCardProps) {
  const changeColor = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  }[changeType];

  const TrendIcon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : Minus;
  const sparkColor = changeType === 'positive' ? 'hsl(160, 84%, 39%)' : changeType === 'negative' ? 'hsl(0, 72%, 51%)' : 'hsl(220, 9%, 46%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="surface-card p-5 group hover:shadow-surface-lg transition-default relative overflow-hidden"
    >
      {/* Subtle gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />

      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-label">{label}</p>
          <p className="stat-value mt-1.5">
            <AnimatedCounter value={value} />
          </p>
          {change && (
            <div className={`flex items-center gap-1 mt-1 ${changeColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-semibold">{change}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="p-2.5 rounded-xl bg-primary/8 border border-primary/10 group-hover:bg-primary/12 transition-default">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          {sparklineData && <MiniSparkline data={sparklineData} color={sparkColor} />}
        </div>
      </div>
    </motion.div>
  );
}
