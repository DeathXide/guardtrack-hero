
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, User, X, ArrowRight, DollarSign } from 'lucide-react';
import { AttendanceRecord, Guard, Site } from '@/types';

interface RecentActivityProps {
  records: AttendanceRecord[];
  getGuardById: (id: string) => Guard | undefined;
  getSiteById: (id: string) => Site | undefined;
  getShiftsBySite: (siteId: string) => any[];
}

const RecentActivity = ({ records, getGuardById, getSiteById, getShiftsBySite }: RecentActivityProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest attendance records and changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {records.slice(0, 5).map((record) => {
            const guard = getGuardById(record.guardId);
            const replacementGuard = record.replacementGuardId ? getGuardById(record.replacementGuardId) : null;
            const shift = getShiftsBySite(record.shiftId.split('-')[0])[0];
            const site = shift ? getSiteById(shift.siteId) : undefined;
            const reassignedSite = record.reassignedSiteId ? getSiteById(record.reassignedSiteId) : undefined;
            
            return (
              <div key={record.id} className="flex items-start space-x-4 py-3 border-b last:border-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  record.status === 'present' ? 'bg-success/10 text-success' :
                  record.status === 'replaced' ? 'bg-warning/10 text-warning' :
                  record.status === 'reassigned' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  {record.status === 'present' ? (
                    <Check className="h-4 w-4" />
                  ) : record.status === 'replaced' ? (
                    <User className="h-4 w-4" />
                  ) : record.status === 'reassigned' ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">{guard?.name || 'Unknown Guard'}</p>
                    <div className="mt-1 sm:mt-0">
                      {record.status === 'present' ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Present</Badge>
                      ) : record.status === 'replaced' ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Replaced</Badge>
                      ) : record.status === 'reassigned' ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Reassigned</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {site?.name || 'Unknown Site'} • {shift?.type === 'day' ? 'Day Shift' : 'Night Shift'}
                  </p>
                  
                  {guard?.payRate && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>${guard.payRate.toFixed(2)}/shift</span>
                    </div>
                  )}
                  
                  {record.status === 'replaced' && replacementGuard && (
                    <div className="mt-2 text-xs bg-muted p-2 rounded-md">
                      <span className="font-medium">Replaced by:</span> {replacementGuard.name}
                    </div>
                  )}
                  
                  {record.status === 'reassigned' && reassignedSite && (
                    <div className="mt-2 text-xs bg-muted p-2 rounded-md">
                      <span className="font-medium">Reassigned to:</span> {reassignedSite.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" asChild>
            <Link to="/attendance">View All Records</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
