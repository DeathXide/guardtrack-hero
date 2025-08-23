import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, TrendingUp, Clock, Sun, Moon, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { shiftTrackingApi, type MonthlyShiftSummary, type GuardShiftDetails } from '@/lib/shiftTrackingApi';
import { format, subMonths } from 'date-fns';
import { CardLoader } from '@/components/ui/loader';

interface ShiftTrackingCardProps {
  guardId: string;
  guardName: string;
  currentMonth: string;
}

export const ShiftTrackingCard: React.FC<ShiftTrackingCardProps> = ({
  guardId,
  guardName,
  currentMonth
}) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showDetails, setShowDetails] = useState(false);

  // Get last 6 months for trend analysis
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(date, 'yyyy-MM');
  }).reverse();

  const { data: monthlyShifts, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['guard-monthly-shifts', guardId, selectedMonth],
    queryFn: () => shiftTrackingApi.getGuardMonthlyShifts(guardId, selectedMonth),
    enabled: !!guardId
  });

  const { data: shiftDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['guard-shift-details', guardId, selectedMonth],
    queryFn: () => shiftTrackingApi.getGuardShiftDetails(guardId, selectedMonth),
    enabled: showDetails && !!guardId
  });

  const { data: shiftTrends } = useQuery({
    queryKey: ['guard-shift-trends', guardId],
    queryFn: () => shiftTrackingApi.getGuardShiftTrends(guardId, last6Months),
    enabled: !!guardId
  });

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBadgeVariant = (rate: number) => {
    if (rate >= 95) return 'default';
    if (rate >= 85) return 'secondary';
    return 'destructive';
  };

  if (isLoadingMonthly) {
    return <CardLoader />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Monthly Shifts
          </CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {last6Months.map(month => (
                <SelectItem key={month} value={month}>
                  {format(new Date(month + '-01'), 'MMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {monthlyShifts ? (
          <>
            {/* Shift Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-primary/5 rounded-lg border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Sun className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Day</span>
                </div>
                <div className="font-semibold text-lg">{monthlyShifts.totalDayShifts}</div>
              </div>
              
              <div className="text-center p-3 bg-primary/5 rounded-lg border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Moon className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Night</span>
                </div>
                <div className="font-semibold text-lg">{monthlyShifts.totalNightShifts}</div>
              </div>
              
              <div className="text-center p-3 bg-primary/5 rounded-lg border">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <div className="font-semibold text-lg">{monthlyShifts.totalShifts}</div>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance Rate</span>
              <Badge variant={getAttendanceBadgeVariant(monthlyShifts.attendanceRate)}>
                {monthlyShifts.attendanceRate.toFixed(1)}%
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Shift Details - {guardName} ({format(new Date(selectedMonth + '-01'), 'MMMM yyyy')})
                    </DialogTitle>
                    <DialogDescription>
                      Detailed breakdown of all shifts for this month
                    </DialogDescription>
                  </DialogHeader>
                  
                  {isLoadingDetails ? (
                    <CardLoader />
                  ) : shiftDetails ? (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{shiftDetails.shifts.length}</div>
                          <div className="text-sm text-muted-foreground">Total Assigned</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {shiftDetails.shifts.filter(s => s.isPresent === true).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Present</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {shiftDetails.shifts.filter(s => s.isPresent === false).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Absent</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {shiftDetails.shifts.filter(s => s.isPresent === null).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Pending</div>
                        </div>
                      </div>

                      {/* Detailed Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shiftDetails.shifts.map((shift, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {format(new Date(shift.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>{shift.siteName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {shift.shiftType === 'day' ? (
                                    <><Sun className="h-3 w-3 mr-1" />Day</>
                                  ) : (
                                    <><Moon className="h-3 w-3 mr-1" />Night</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {shift.isPresent === true && (
                                  <Badge className="bg-green-500">Present</Badge>
                                )}
                                {shift.isPresent === false && (
                                  <Badge variant="destructive">Absent</Badge>
                                )}
                                {shift.isPresent === null && (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No shift details available for this month.
                    </p>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Trend Indicator */}
            {shiftTrends && shiftTrends.length > 1 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">6-month average</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium">
                      {(shiftTrends.reduce((sum, trend) => sum + trend.totalShifts, 0) / shiftTrends.length).toFixed(1)} shifts/month
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No shift data available for this month</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};