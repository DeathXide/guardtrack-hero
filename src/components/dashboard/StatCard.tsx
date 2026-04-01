import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  accentColor: string; // tailwind color like "blue" "emerald" "amber" "rose" "indigo" "violet"
}

const colorMap: Record<string, { bg: string; text: string; blob: string }> = {
  blue:    { bg: 'bg-blue-500/10 dark:bg-blue-500/20',    text: 'text-blue-600 dark:text-blue-400',    blob: 'bg-blue-500/5' },
  emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', blob: 'bg-emerald-500/5' },
  amber:   { bg: 'bg-amber-500/10 dark:bg-amber-500/20',   text: 'text-amber-600 dark:text-amber-400',   blob: 'bg-amber-500/5' },
  rose:    { bg: 'bg-rose-500/10 dark:bg-rose-500/20',    text: 'text-rose-600 dark:text-rose-400',    blob: 'bg-rose-500/5' },
  indigo:  { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',  text: 'text-indigo-600 dark:text-indigo-400',  blob: 'bg-indigo-500/5' },
  violet:  { bg: 'bg-violet-500/10 dark:bg-violet-500/20',  text: 'text-violet-600 dark:text-violet-400',  blob: 'bg-violet-500/5' },
  green:   { bg: 'bg-green-500/10 dark:bg-green-500/20',   text: 'text-green-600 dark:text-green-400',   blob: 'bg-green-500/5' },
  orange:  { bg: 'bg-orange-500/10 dark:bg-orange-500/20',  text: 'text-orange-600 dark:text-orange-400',  blob: 'bg-orange-500/5' },
};

const StatCard = ({ title, value, subtitle, icon: Icon, prefix, suffix, accentColor }: StatCardProps) => {
  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <m.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="relative overflow-hidden">
        {/* Decorative blob */}
        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${colors.blob} pointer-events-none`} />

        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`p-2 md:p-2.5 rounded-lg ${colors.bg}`}>
              <Icon className={`h-4 w-4 md:h-5 md:w-5 ${colors.text}`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold tracking-tight">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          </div>

          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1.5 truncate">
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </m.div>
  );
};

export default StatCard;
