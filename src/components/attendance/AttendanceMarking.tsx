
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { AlertCircle, Calendar as CalendarIcon, Check, CheckCircle2, IndianRupee, Info, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  fetchSites,
  fetchGuards,
  fetchShiftsBySite,
  createAttendanceRecord,
  fetchAttendanceByDate,
  isGuardMarkedPresentElsewhere,
  deleteAttendanceRecord,
  fetchSiteMonthlyEarnings,
  formatCurrency
} from '@/lib/supabaseService';
import { Site, Guard, Shift, AttendanceRecord, SiteEarnings } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AttendanceMarkingProps {
  preselectedSiteId?: string;
}

const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({ preselectedSiteId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedGuards, setSelectedGuards] = useState<Record<string, string[]>>({});
  const queryClient = useQueryClient();
  
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const currentMonth = format(selectedDate, 'yyyy-MM');

  useEffect(() => {
    if (preselectedSiteId) {
      setSelectedSite(preselectedSiteId);
    }
  }, [preselectedSiteId]);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', formattedDate],
    queryFn: () => fetchAttendanceByDate(formattedDate),
    enabled: !!formattedDate
  });

  const { data: siteEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['site-earnings', selectedSite, currentMonth],
    queryFn: () => fetchSiteMonthlyEarnings(selectedSite, currentMonth),
    enabled: !!selectedSite && !!currentMonth
  });

  const markAttendanceMutation = useMutation({
    mutationFn: createAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['site-earnings', selectedSite, currentMonth] });
      toast.success('Attendance marked successfully');
    },
    onError: (error) => {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: deleteAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', formattedDate] });
      queryClient.invalidateQueries({ queryKey: ['site-earnings', selectedSite, currentMonth] });
      toast.success('Attendance record removed successfully');
    },
    onError: (error) => {
      console.error('Error removing attendance record:', error);
      toast.error('Failed to remove attendance record');
    }
  });

  const dayShifts = shifts.filter(shift => shift.type === 'day');
  const nightShifts = shifts.filter(shift => shift.type === 'night');

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const daySlots = selectedSiteData?.daySlots || 0;
  const nightSlots = selectedSiteData?.nightSlots || 0;
  const sitePayRate = selectedSiteData?.payRate || 0;

  const dayShiftGuards = shifts
    .filter(shift => shift.type === 'day' && shift.guardId)
    .map(shift => {
      const guard = guards.find(g => g.id === shift.guardId);
      return {
        ...shift,
        guardName: guard?.name || 'Unknown Guard',
        guardId: shift.guardId,
      };
    });

  const nightShiftGuards = shifts
    .filter(shift => shift.type === 'night' && shift.guardId)
    .map(shift => {
      const guard = guards.find(g => g.id === shift.guardId);
      return {
        ...shift,
        guardName: guard?.name || 'Unknown Guard',
        guardId: shift.guardId,
      };
    });

  useEffect(() => {
    const initialSelectedGuards: Record<string, string[]> = {};
    
    shifts.forEach(shift => {
      const existingAttendance = attendanceRecords.filter(record => 
        record.shiftId === shift.id && 
        record.status === 'present'
      );
      
      if (existingAttendance.length > 0) {
        initialSelectedGuards[shift.type] = existingAttendance.map(record => record.guardId);
      } else {
        initialSelectedGuards[shift.type] = [];
      }
    });
    
    setSelectedGuards(initialSelectedGuards);
  }, [shifts, attendanceRecords, formattedDate]);

  const handleGuardSelection = async (guardId: string, shiftType: 'day' | 'night') => {
    const currentSelected = selectedGuards[shiftType] || [];
    const isSelected = currentSelected.includes(guardId);
    
    if (isSelected) {
      setSelectedGuards({
        ...selectedGuards,
        [shiftType]: currentSelected.filter(id => id !== guardId)
      });
    } else {
      try {
        const isMarkedElsewhere = await isGuardMarkedPresentElsewhere(
          guardId, 
          formattedDate, 
          shiftType, 
          selectedSite
        );
        
        if (isMarkedElsewhere) {
          toast.error('This guard is already marked present at another site for this shift');
          return;
        }
        
        setSelectedGuards({
          ...selectedGuards,
          [shiftType]: [...currentSelected, guardId]
        });
      } catch (error) {
        console.error('Error checking guard status:', error);
        toast.error('Failed to check guard availability');
      }
    }
  };

  const handleSubmitAttendance = async () => {
    const dayGuardIds = selectedGuards['day'] || [];
    const dayRecords = dayGuardIds.map(guardId => {
      const shift = dayShifts.find(s => s.guardId === guardId) || dayShifts[0];
      return {
        date: formattedDate,
        shiftId: shift.id,
        guardId,
        status: 'present' as const
      };
    });

    const nightGuardIds = selectedGuards['night'] || [];
    const nightRecords = nightGuardIds.map(guardId => {
      const shift = nightShifts.find(s => s.guardId === guardId) || nightShifts[0];
      return {
        date: formattedDate,
        shiftId: shift.id,
        guardId,
        status: 'present' as const
      };
    });

    const allRecords = [...dayRecords, ...nightRecords];
    
    if (allRecords.length === 0) {
      toast.error('No guards selected for attendance');
      return;
    }

    for (const record of allRecords) {
      try {
        await markAttendanceMutation.mutateAsync(record);
      } catch (error) {
        console.error('Error creating attendance record:', error);
      }
    }

    refetchAttendance();
  };

  const findAttendanceRecord = (guardId: string, shiftType: 'day' | 'night') => {
    return attendanceRecords.find(record => {
      const shift = shifts.find(s => s.id === record.shiftId);
      return record.guardId === guardId && 
             record.status === 'present' && 
             shift?.type === shiftType &&
             shift?.siteId === selectedSite;
    });
  };

  const isGuardMarked = (guardId: string, shiftType: 'day' | 'night') => {
    return !!findAttendanceRecord(guardId, shiftType);
  };

  const handleRemoveAttendance = async (guardId: string, shiftType: 'day' | 'night') => {
    const record = findAttendanceRecord(guardId, shiftType);
    if (record && record.id) {
      await deleteAttendanceMutation.mutateAsync(record.id);
      
      setSelectedGuards({
        ...selectedGuards,
        [shiftType]: (selectedGuards[shiftType] || []).filter(id => id !== guardId)
      });
    }
  };

  // Calculate site earnings data
  const totalSlots = daySlots + nightSlots;
  const payRatePerShift = totalSlots > 0 ? sitePayRate / totalSlots : 0;

  // Calculate guard costs
  const calculateGuardCostPerShift = (guardId: string) => {
    const guard = guards.find(g => g.id === guardId);
    if (!guard || !guard.payRate) return 0;
    
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    return guard.payRate / daysInMonth;
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading sites and guards...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mark Attendance</CardTitle>
        <CardDescription>
          Select a date, site and mark guard attendance for shifts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-6">
            <div>
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Select Site</Label>
              <Select
                value={selectedSite}
                onValueChange={setSelectedSite}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent searchable>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSite && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Day shift slots:</span>
                    <Badge variant="outline">{daySlots}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Night shift slots:</span>
                    <Badge variant="outline">{nightSlots}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span>Site Pay Rate:</span>
                    <div className="flex items-center">
                      <IndianRupee className="h-3 w-3 mr-1" />
                      <Badge variant="outline">{formatCurrency(sitePayRate)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Per Shift Rate:</span>
                    <div className="flex items-center">
                      <IndianRupee className="h-3 w-3 mr-1" />
                      <Badge variant="outline">{formatCurrency(payRatePerShift)}</Badge>
                    </div>
                  </div>
                </div>
                
                {siteEarnings && !earningsLoading && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-sm font-medium">Monthly Earnings</h4>
                    <div className="flex items-center justify-between">
                      <span>Total Shifts:</span>
                      <Badge variant="outline">{siteEarnings.totalShifts}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Allocated Budget:</span>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <Badge variant="outline">{formatCurrency(siteEarnings.allocatedAmount)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Guard Costs:</span>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <Badge variant="outline">{formatCurrency(siteEarnings.guardCosts)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Net Earnings:</span>
                      <div className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        <Badge 
                          variant="outline" 
                          className={siteEarnings.netEarnings > 0 ? "bg-green-50 text-green-700 border-green-200" : 
                                    siteEarnings.netEarnings < 0 ? "bg-red-50 text-red-700 border-red-200" : ""}
                        >
                          {formatCurrency(siteEarnings.netEarnings)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              className="w-full" 
              disabled={!selectedSite || !selectedDate}
              onClick={handleSubmitAttendance}
            >
              <Check className="mr-2 h-4 w-4" /> Save Attendance
            </Button>
          </div>

          <div>
            {!selectedSite ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No site selected</AlertTitle>
                <AlertDescription>
                  Please select a site to view and mark attendance
                </AlertDescription>
              </Alert>
            ) : shiftsLoading ? (
              <div className="flex items-center justify-center h-64">Loading shifts...</div>
            ) : (
              <Tabs defaultValue="day">
                <TabsList className="mb-4">
                  <TabsTrigger value="day">Day Shift</TabsTrigger>
                  <TabsTrigger value="night">Night Shift</TabsTrigger>
                </TabsList>

                <TabsContent value="day">
                  {dayShiftGuards.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No guards allocated</AlertTitle>
                      <AlertDescription>
                        No guards have been allocated to day shifts for this site. 
                        Please go to the "Shift Allocation" tab to allocate guards.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {(selectedGuards['day'] || []).length > daySlots && (
                        <Alert className="mb-4 bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Slot Limit Exceeded</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            You have selected {(selectedGuards['day'] || []).length} guards, which exceeds the configured {daySlots} day shift slots.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Present</TableHead>
                            <TableHead>Guard Name</TableHead>
                            <TableHead>Badge Number</TableHead>
                            <TableHead>Pay Rate</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayShiftGuards.map((guard) => {
                            const guardDetails = guards.find(g => g.id === guard.guardId);
                            const isMarked = isGuardMarked(guard.guardId, 'day');
                            const isSelected = (selectedGuards['day'] || []).includes(guard.guardId);
                            const guardCost = calculateGuardCostPerShift(guard.guardId);
                            
                            return (
                              <TableRow key={guard.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={isMarked || isSelected}
                                    onCheckedChange={() => handleGuardSelection(guard.guardId, 'day')}
                                  />
                                </TableCell>
                                <TableCell>{guardDetails?.name}</TableCell>
                                <TableCell>{guardDetails?.badgeNumber}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {formatCurrency(guardCost)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isMarked ? (
                                    <Badge className="bg-green-500">Marked Present</Badge>
                                  ) : isSelected ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending Save</Badge>
                                  ) : (
                                    <Badge variant="outline">Not Marked</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isMarked && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleRemoveAttendance(guard.guardId, 'day')}
                                      title="Remove attendance record"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="night">
                  {nightShiftGuards.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No guards allocated</AlertTitle>
                      <AlertDescription>
                        No guards have been allocated to night shifts for this site.
                        Please go to the "Shift Allocation" tab to allocate guards.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {(selectedGuards['night'] || []).length > nightSlots && (
                        <Alert className="mb-4 bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Slot Limit Exceeded</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            You have selected {(selectedGuards['night'] || []).length} guards, which exceeds the configured {nightSlots} night shift slots.
                          </AlertDescription>
                        </Alert>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Present</TableHead>
                            <TableHead>Guard Name</TableHead>
                            <TableHead>Badge Number</TableHead>
                            <TableHead>Pay Rate</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nightShiftGuards.map((guard) => {
                            const guardDetails = guards.find(g => g.id === guard.guardId);
                            const isMarked = isGuardMarked(guard.guardId, 'night');
                            const isSelected = (selectedGuards['night'] || []).includes(guard.guardId);
                            const guardCost = calculateGuardCostPerShift(guard.guardId);
                            
                            return (
                              <TableRow key={guard.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={isMarked || isSelected}
                                    onCheckedChange={() => handleGuardSelection(guard.guardId, 'night')}
                                  />
                                </TableCell>
                                <TableCell>{guardDetails?.name}</TableCell>
                                <TableCell>{guardDetails?.badgeNumber}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {formatCurrency(guardCost)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isMarked ? (
                                    <Badge className="bg-green-500">Marked Present</Badge>
                                  ) : isSelected ? (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending Save</Badge>
                                  ) : (
                                    <Badge variant="outline">Not Marked</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isMarked && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleRemoveAttendance(guard.guardId, 'night')}
                                      title="Remove attendance record"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceMarking;
