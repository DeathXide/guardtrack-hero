import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, UserX, Building2, CalendarDays, CheckCircle2 } from 'lucide-react';
import { DashboardAlert } from '@/hooks/useDashboardData';
import { format, parseISO } from 'date-fns';

interface AlertsPanelProps {
  alerts: DashboardAlert[];
}

function AlertItem({ alert }: { alert: DashboardAlert }) {
  if (alert.type === 'absent') {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
        <UserX className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.guardName}</p>
          <p className="text-xs text-muted-foreground">
            Absent at {alert.siteName} &middot; {alert.shiftType === 'day' ? 'Day' : 'Night'} shift
          </p>
        </div>
      </div>
    );
  }

  if (alert.type === 'understaffed') {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <Building2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.siteName}</p>
          <p className="text-xs text-muted-foreground">
            {alert.coverage}% staffed &middot; {alert.unfilled} slot{alert.unfilled !== 1 ? 's' : ''} unfilled
          </p>
        </div>
      </div>
    );
  }

  if (alert.type === 'leave') {
    const dateRange = alert.startDate && alert.endDate
      ? `${format(parseISO(alert.startDate), 'MMM d')} - ${format(parseISO(alert.endDate), 'MMM d')}`
      : '';
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <CalendarDays className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.guardName}</p>
          <p className="text-xs text-muted-foreground">
            Leave request ({alert.leaveType}) &middot; {dateRange}
          </p>
        </div>
        <Badge variant="outline" className="text-xs flex-shrink-0">Pending</Badge>
      </div>
    );
  }

  return null;
}

const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  const absentCount = alerts.filter(a => a.type === 'absent').length;
  const understaffedCount = alerts.filter(a => a.type === 'understaffed').length;
  const leaveCount = alerts.filter(a => a.type === 'leave').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Alerts & Actions</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="h-5 text-xs px-1.5">
              {alerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mb-2" />
            <p className="text-sm font-medium">All clear!</p>
            <p className="text-xs text-muted-foreground">No alerts or pending actions</p>
          </div>
        ) : (
          <>
            {/* Summary pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {absentCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {absentCount} absent
                </span>
              )}
              {understaffedCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {understaffedCount} understaffed
                </span>
              )}
              {leaveCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {leaveCount} leave request{leaveCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <AlertItem key={i} alert={alert} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
