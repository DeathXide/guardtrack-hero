
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, User } from 'lucide-react';
import { Guard, Site } from '@/types';
import { AttendanceRecord } from '@/types';

interface AlertItem {
  record: AttendanceRecord;
  guard: Guard | undefined;
  site: Site | undefined;
  shiftType: string;
}

interface AbsenceAlertsProps {
  alerts: AlertItem[];
}

const AbsenceAlerts = ({ alerts }: AbsenceAlertsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Absence Alerts</CardTitle>
          <Badge variant="outline" className="ml-2">
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </Badge>
        </div>
        <CardDescription>
          Guards who are absent or need a replacement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Check className="h-8 w-8 text-success mb-2" />
              <p className="text-sm font-medium">All guards present!</p>
              <p className="text-xs text-muted-foreground">
                No absences to report for this day
              </p>
            </div>
          ) : (
            alerts.map(({ record, guard, site, shiftType }) => (
              <Card key={record.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{guard?.name || 'Unknown Guard'}</p>
                        <Badge variant="destructive" className="ml-2 h-5 text-xs">
                          Absent
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {site?.name || 'Unknown Site'} • {shiftType === 'day' ? 'Day Shift' : 'Night Shift'}
                      </p>
                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                          <User className="h-3 w-3 mr-1" />
                          Assign Replacement
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenceAlerts;
