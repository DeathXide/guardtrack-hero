
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}

const StatCard = ({ title, value, description, icon: Icon }: StatCardProps) => {
  const numericValue = typeof value === 'number' ? value : null;
  const stringValue = typeof value === 'string' ? value : null;
  // Extract numeric part and suffix from strings like "85%"
  const percentMatch = stringValue?.match(/^(\d+(?:\.\d+)?)(%?)$/);

  return (
    <m.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {numericValue !== null ? (
              <AnimatedNumber value={numericValue} />
            ) : percentMatch ? (
              <AnimatedNumber value={parseFloat(percentMatch[1])} suffix={percentMatch[2]} />
            ) : (
              value
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default StatCard;
