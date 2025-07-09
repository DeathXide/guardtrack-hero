import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  RotateCcw, 
  TrendingUp, 
  Calendar,
  Clock,
  Users,
  MapPin
} from 'lucide-react';
import { Site } from '@/types';
import { format, subDays } from 'date-fns';

interface QuickActionsProps {
  selectedSite: string;
  selectedDate: Date;
  sites: Site[];
  onCopyYesterday: () => Promise<void>;
  onReset: () => Promise<void>;
  dayShiftCount: number;
  nightShiftCount: number;
  presentDayCount: number;
  presentNightCount: number;
  daySlots: number;
  nightSlots: number;
  isLoading?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  selectedSite,
  selectedDate,
  sites,
  onCopyYesterday,
  onReset,
  dayShiftCount,
  nightShiftCount,
  presentDayCount,
  presentNightCount,
  daySlots,
  nightSlots,
  isLoading = false
}) => {
  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const yesterday = subDays(selectedDate, 1);
  
  const getDayProgress = () => {
    if (daySlots === 0) return 0;
    return Math.round((presentDayCount / daySlots) * 100);
  };
  
  const getNightProgress = () => {
    if (nightSlots === 0) return 0;
    return Math.round((presentNightCount / nightSlots) * 100);
  };

  const getProgressVariant = (progress: number) => {
    if (progress === 100) return 'default';
    if (progress >= 80) return 'secondary';
    if (progress >= 50) return 'outline';
    return 'destructive';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Site Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Site Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium truncate">
                {selectedSiteData?.name || 'No site selected'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedSiteData?.location || ''}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                Day: {daySlots} slots
              </Badge>
              <Badge variant="outline" className="text-xs">
                Night: {nightSlots} slots
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Shift Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Day Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{presentDayCount}</span>
              <Badge variant={getProgressVariant(getDayProgress())}>
                {getDayProgress()}%
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {presentDayCount} of {daySlots} guards present
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getDayProgress() === 100 
                    ? 'bg-green-500' 
                    : getDayProgress() >= 80
                    ? 'bg-blue-500'
                    : getDayProgress() >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${getDayProgress()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Night Shift Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Night Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{presentNightCount}</span>
              <Badge variant={getProgressVariant(getNightProgress())}>
                {getNightProgress()}%
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {presentNightCount} of {nightSlots} guards present
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  getNightProgress() === 100 
                    ? 'bg-green-500' 
                    : getNightProgress() >= 80
                    ? 'bg-blue-500'
                    : getNightProgress() >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${getNightProgress()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyYesterday}
              disabled={!selectedSite || isLoading}
              className="w-full text-xs flex items-center gap-2"
            >
              <Copy className="h-3 w-3" />
              Copy from {format(yesterday, 'MMM dd')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={!selectedSite || isLoading}
              className="w-full text-xs flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Today
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickActions;