import React from 'react';
import { Rocket, CheckCircle, AlertTriangle, Users, Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BulkStartDayResult } from '@/lib/dailyAttendanceSlotsApi';

interface StartDayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  result: BulkStartDayResult | null;
  totalSites: number;
  dateLabel: string;
  alreadyStarted: boolean;
}

const StartDayDialog: React.FC<StartDayDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  result,
  totalSites,
  dateLabel,
  alreadyStarted,
}) => {
  const hasResult = result !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {hasResult ? 'Day Started' : 'Start Day'}
          </DialogTitle>
          <DialogDescription>
            {hasResult
              ? `Attendance setup complete for ${dateLabel}`
              : `Set up attendance for ${dateLabel}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Pre-confirmation */}
        {!hasResult && !isLoading && (
          <div className="space-y-4 py-2">
            {alreadyStarted ? (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Some sites already have slots for today
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Existing attendance data will be preserved. Only sites without slots will be generated.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Generate slots for <strong className="text-foreground">{totalSites}</strong> active sites
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Copy yesterday's guard assignments
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                Mark all assigned guards as present
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Inactive guards and cross-site conflicts will be automatically skipped.
              You can fix exceptions after.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Processing all sites...</p>
          </div>
        )}

        {/* Result */}
        {hasResult && !isLoading && (
          <div className="space-y-4 py-2">
            {/* Success stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-600">{result.sitesProcessed}</p>
                <p className="text-xs text-green-700 dark:text-green-400">Sites Processed</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-600">{result.guardsMarkedPresent}</p>
                <p className="text-xs text-green-700 dark:text-green-400">Guards Marked Present</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-2xl font-bold text-blue-600">{result.totalSlotsGenerated}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">Total Slots</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-2xl font-bold text-blue-600">{result.guardsAssigned}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">Guards Assigned</p>
              </div>
            </div>

            {/* Warnings */}
            {result.conflicts.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {result.conflicts.length} conflict{result.conflicts.length > 1 ? 's' : ''} detected
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Some guards are assigned to multiple sites. Resolve these from the dashboard.
                </p>
              </div>
            )}

            {result.newSites.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {result.newSites.length} new site{result.newSites.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.newSites.map(s => (
                    <Badge key={s.siteId} variant="outline" className="text-[10px]">{s.siteName}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.skippedInactive.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {result.skippedInactive.length} inactive guard{result.skippedInactive.length > 1 ? 's' : ''} skipped
                  </span>
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {result.skippedInactive.slice(0, 5).map((g, i) => (
                    <p key={i}>{g.guardName} was at {g.siteName}</p>
                  ))}
                  {result.skippedInactive.length > 5 && (
                    <p>...and {result.skippedInactive.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!hasResult ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
              <Button onClick={onConfirm} disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {isLoading ? 'Processing...' : 'Start Day'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartDayDialog;
