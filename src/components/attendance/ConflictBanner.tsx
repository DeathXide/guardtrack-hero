import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ConflictInfo } from '@/lib/dailyAttendanceSlotsApi';

interface ConflictBannerProps {
  conflicts: ConflictInfo[];
  onResolve: (guardId: string, shiftType: 'day' | 'night', keepAtSiteId: string) => void;
  isLoading?: boolean;
}

const ConflictBanner: React.FC<ConflictBannerProps> = ({ conflicts, onResolve, isLoading = false }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
          {conflicts.length} Guard Conflict{conflicts.length > 1 ? 's' : ''} — Same guard assigned to multiple sites
        </h3>
      </div>

      <div className="space-y-2">
        {conflicts.map(conflict => (
          <div
            key={`${conflict.guardId}-${conflict.shiftType}`}
            className="bg-white dark:bg-background rounded-md border border-red-100 dark:border-red-900 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{conflict.guardName}</span>
              <Badge variant="outline" className="text-[10px]">{conflict.badgeNumber}</Badge>
              <Badge className="text-[10px] capitalize bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {conflict.shiftType} shift
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Assigned to {conflict.slots.length} sites. Choose where to keep this guard:
            </p>
            <div className="flex flex-wrap gap-2">
              {conflict.slots.map(slot => (
                <Button
                  key={slot.slotId}
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(conflict.guardId, conflict.shiftType, slot.siteId)}
                  disabled={isLoading}
                  className="text-xs h-7 gap-1"
                >
                  Keep at {slot.siteName}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictBanner;
