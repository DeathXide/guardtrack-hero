import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  CalendarDays, 
  Check, 
  Clock, 
  Moon, 
  Pencil, 
  Search, 
  ShieldAlert, 
  Sun, 
  User,
  X,
  ArrowRight,
  Building,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { 
  attendanceRecords, 
  sites, 
  guards, 
  getShiftsBySite, 
  getGuardById, 
  getSiteById, 
  getAttendanceByDate,
  isGuardMarkedPresentElsewhere
} from '@/lib/data';
import { AttendanceRecord, Guard, Site, Shift } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const calculateDailyRate = (guard: Guard | undefined): number => {
  if (!guard || !guard.payRate) return 0;
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  return guard.payRate / daysInMonth;
};

const calculateMonthlyEarnings = (guard: Guard | undefined, currentDate: Date): number => {
  if (!guard) return 0;
  
  const month = getMonthName(currentDate);
  const monthRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return getMonthName(recordDate) === month && 
           record.guardId === guard.id && 
           (record.status === 'present' || record.status === 'reassigned');
  });
  
  const dailyRate = calculateDailyRate(guard);
  return monthRecords.length * dailyRate;
};

const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSite, setSelectedSite] = useState<string | undefined>(sites[0]?.id);
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day');
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [guardAllocationDialogOpen, setGuardAllocationDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'reassigned'>('present');
  const [replacementGuard, setReplacementGuard] = useState<string | undefined>();
  const [reassignedSite, setReassignedSite] = useState<string | undefined>();
  const [allocatedGuard, setAllocatedGuard] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  
  const siteOptions = sites.map(site => ({
    value: site.id,
    label: site.name
  }));
  
  const dateString = selectedDate 
    ? selectedDate.toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];
  
  const selectedSiteDetails = getSiteById(selectedSite || '');
  
  const siteShifts = selectedSiteDetails 
    ? getShiftsBySite(selectedSiteDetails.id).filter(shift => shift.type === selectedShiftType)
    : [];
  
  const dateRecords = getAttendanceByDate(dateString);
  
  const shiftsWithAttendance = siteShifts.map(shift => {
    const attendanceRecord = dateRecords.find(record => record.shiftId === shift.id);
    const guard = getGuardById(shift.guardId);
    
    const record = attendanceRecord || {
      id: `temp-${shift.id}-${dateString}`,
      date: dateString,
      shiftId: shift.id,
      guardId: shift.guardId,
      status: 'present',
    };
    
    const isPresentElsewhere = guard ? 
      isGuardMarkedPresentElsewhere(guard.id, dateString, selectedShiftType, selectedSiteDetails?.id) : 
      false;
    
    return {
      shift,
      record,
      guard,
      replacementGuard: record.replacementGuardId 
        ? getGuardById(record.replacementGuardId) 
        : undefined,
      reassignedSite: record.reassignedSiteId
        ? getSiteById(record.reassignedSiteId)
        : undefined,
      isPresentElsewhere,
      dailyRate: calculateDailyRate(guard)
    };
  });
  
  const handleMarkAttendance = (shift: Shift, guard: Guard | undefined) => {
    if (!guard) return;
    
    if (isGuardMarkedPresentElsewhere(guard.id, dateString, selectedShiftType, selectedSiteDetails?.id)) {
      toast({
        title: "Guard already assigned",
        description: `${guard.name} is already marked present at another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedRecord({
      id: `temp-${shift.id}-${dateString}`,
      date: dateString,
      shiftId: shift.id,
      guardId: guard.id,
      status: 'present',
    });
    setSelectedGuard(guard);
    setAttendanceStatus('present');
    setNotes('');
    setAttendanceDialogOpen(true);
  };
  
  const handleAssignReplacement = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReplacementGuard(undefined);
    setNotes('');
    setReplacementDialogOpen(true);
  };
  
  const handleReassignToSite = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReassignedSite(undefined);
    setNotes('');
    setReassignDialogOpen(true);
  };

  const handleAllocateGuard = (shift: Shift) => {
    setSelectedShift(shift);
    setAllocatedGuard(undefined);
    setGuardAllocationDialogOpen(true);
  };
  
  const saveAttendance = () => {
    if (!selectedRecord || !selectedGuard) return;
    
    toast({
      title: 'Attendance recorded',
      description: `${selectedGuard.name} marked as ${attendanceStatus} for ${formatDate(dateString)}`,
    });
    
    setAttendanceDialogOpen(false);
    
    if (attendanceStatus === 'absent') {
      setReplacementDialogOpen(true);
    } else if (attendanceStatus === 'reassigned') {
      setReassignDialogOpen(true);
    }
  };
  
  const saveReplacement = () => {
    if (!selectedRecord || !selectedGuard || !replacementGuard) return;
    
    if (isGuardMarkedPresentElsewhere(replacementGuard, dateString, selectedShiftType, selectedSiteDetails?.id)) {
      toast({
        title: "Guard already assigned",
        description: `Selected replacement is already marked present at another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    const replacement = getGuardById(replacementGuard);
    
    toast({
      title: 'Replacement assigned',
      description: `${replacement?.name} assigned as replacement for ${selectedGuard.name}`,
    });
    
    setReplacementDialogOpen(false);
  };
  
  const saveReassignment = () => {
    if (!selectedRecord || !selectedGuard || !reassignedSite) return;
    
    const targetSite = getSiteById(reassignedSite);
    
    toast({
      title: 'Guard reassigned',
      description: `${selectedGuard.name} reassigned to ${targetSite?.name}`,
    });
    
    setReassignDialogOpen(false);
  };

  const saveGuardAllocation = () => {
    if (!selectedShift || !allocatedGuard) return;
    
    const guard = getGuardById(allocatedGuard);
    
    if (isGuardMarkedPresentElsewhere(allocatedGuard, dateString, selectedShiftType, selectedSiteDetails?.id)) {
      toast({
        title: "Guard already assigned",
        description: `${guard?.name} is already assigned to another site for this shift`,
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: 'Guard allocated',
      description: `${guard?.name} has been allocated to this shift`,
    });
    
    setGuardAllocationDialogOpen(false);
  };
  
  const getAvailableGuards = () => {
    return guards.filter(guard => {
      if (guard.status === 'inactive') {
        return false;
      }
      
      return !isGuardMarkedPresentElsewhere(guard.id, dateString, selectedShiftType, selectedSiteDetails?.id);
    });
  };
  
  const getAvailableReassignmentSites = () => {
    return sites.filter(site => site.id !== selectedSite);
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Mark and manage daily attendance for all sites
          </p>
        </div>
        <Button onClick={() => handleAllocateGuard(siteShifts[0])} disabled={!selectedSite || siteShifts.length === 0}>
          <UserPlus className="h-4 w-4 mr-2" />
          Allocate Guard
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 overflow-hidden">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose a date to view or mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-full max-w-[300px]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full mx-auto"
              />
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Selected Date:</span>
                  <Badge variant="outline" className="font-mono">
                    {dateString}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Day:</span>
                  <span className="font-medium">
                    {selectedDate 
                      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) 
                      : new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Attendance Sheet</CardTitle>
              <CardDescription>
                {selectedSiteDetails ? selectedSiteDetails.name : 'No site selected'} • {selectedShiftType === 'day' ? 'Day Shift' : 'Night Shift'} • {formatDate(dateString)}
              </CardDescription>
            </div>
            <Badge className="text-xs">
              {selectedSiteDetails 
                ? (selectedShiftType === 'day' 
                  ? `${selectedSiteDetails.daySlots} slots` 
                  : `${selectedSiteDetails.nightSlots} slots`)
                : '0 slots'}
            </Badge>
          </CardHeader>
          <CardContent>
            {!selectedSiteDetails ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Site Selected</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Please select a site from the sidebar to view attendance records.
                </p>
              </div>
            ) : shiftsWithAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Shifts Found</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  There are no {selectedShiftType} shifts assigned for this site.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="min-w-full overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="py-3 px-4 text-left text-sm font-medium">#</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Guard</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Status</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Pay</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shiftsWithAttendance.map((item, index) => (
                        <tr key={item.shift.id}>
                          <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.guard?.avatar} alt={item.guard?.name} />
                                <AvatarFallback>{item.guard ? getInitials(item.guard.name) : 'N/A'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center flex-wrap">
                                  <p className="font-medium text-sm">{item.guard?.name || 'Unassigned'}</p>
                                  {item.isPresentElsewhere && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                      Assigned Elsewhere
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {item.guard?.type || 'Permanent'} • Badge #{item.guard?.badgeNumber || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.record.status === 'present' ? (
                              <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Present
                              </Badge>
                            ) : item.record.status === 'absent' ? (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                                <X className="h-3.5 w-3.5 mr-1" />
                                Absent
                              </Badge>
                            ) : item.record.status === 'reassigned' ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">
                                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                  Reassigned
                                </Badge>
                                {item.reassignedSite && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <span className="truncate max-w-[120px]">
                                      To: {item.reassignedSite.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  Replaced
                                </Badge>
                                {item.replacementGuard && (
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <span className="truncate max-w-[120px]">
                                      By: {item.replacementGuard.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.record.status === 'present' || item.record.status === 'reassigned' ? (
                              <div className="text-sm font-medium">
                                ${item.dailyRate.toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">-</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleMarkAttendance(item.shift, item.guard || undefined)}
                                disabled={item.isPresentElsewhere}
                                title={item.isPresentElsewhere ? "Guard is already marked present at another site" : ""}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Mark
                              </Button>
                              
                              {item.record.status === 'absent' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleAssignReplacement(item.record, item.guard || undefined)}
                                >
                                  <User className="h-3.5 w-3.5 mr-1" />
                                  Replace
                                </Button>
                              )}
                              
                              {item.record.status === 'absent' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleReassignToSite(item.record, item.guard || undefined)}
                                >
                                  <Building className="h-3.5 w-3.5 mr-1" />
                                  Reassign
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle>Attendance Statistics</CardTitle>
            <CardDescription>
              Summary for {formatDate(dateString)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSiteDetails ? (
              <div className="text-center text-muted-foreground py-8">
                Select a site to view statistics
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {shiftsWithAttendance.filter(i => 
                      i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                    ).length}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-destructive mt-1">
                    {shiftsWithAttendance.filter(i => i.record.status === 'absent').length}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-2xl font-bold mt-1">
                    {shiftsWithAttendance.length > 0
                      ? Math.round(
                          (shiftsWithAttendance.filter(
                            i => i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                          ).length / 
                          shiftsWithAttendance.length) * 100
                        )
                      : 0}%
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    ${shiftsWithAttendance
                      .filter(i => i.record.status === 'present' || i.record.status === 'reassigned')
                      .reduce((total, item) => total + item.dailyRate, 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Record attendance for {selectedGuard?.name} on {formatDate(dateString)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Attendance Status</Label>
              <RadioGroup value={attendanceStatus} onValueChange={(value) => setAttendanceStatus(value as 'present' | 'absent' | 'reassigned')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="present" id="present" />
                  <Label htmlFor="present" className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-success" />
                    Present
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="absent" id="absent" />
                  <Label htmlFor="absent" className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-destructive" />
                    Absent
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reassigned" id="reassigned" />
                  <Label htmlFor="reassigned" className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                    Reassigned to Another Site
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAttendance}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={replacementDialogOpen} onOpenChange={setReplacementDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Replacement</DialogTitle>
            <DialogDescription>
              Select a replacement guard for {selectedGuard?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="replacement">Replacement Guard</Label>
              <Select value={replacementGuard} onValueChange={setReplacementGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableGuards().map(guard => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.type || 'Permanent'}) - ${guard.payRate?.toFixed(2)}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableGuards().length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No available guards found. All guards may be assigned elsewhere.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="replacement-notes">Notes (Optional)</Label>
              <Textarea
                id="replacement-notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplacementDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveReplacement} disabled={!replacementGuard}>
              Assign Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign to Another Site</DialogTitle>
            <DialogDescription>
              Select the site where {selectedGuard?.name} is working today
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedGuard?.avatar} alt={selectedGuard?.name} />
                <AvatarFallback>
                  {selectedGuard ? getInitials(selectedGuard.name) : 'N/A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">{selectedGuard?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedGuard?.type || 'Permanent'} • Badge #{selectedGuard?.badgeNumber}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="reassigned-site">Reassigned to Site</Label>
              <Select value={reassignedSite} onValueChange={setReassignedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableReassignmentSites().map(site => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reassignment-notes">Reason for Reassignment</Label>
              <Textarea
                id="reassignment-notes"
                placeholder="Explain why the guard was reassigned..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveReassignment} disabled={!reassignedSite}>
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={guardAllocationDialogOpen} onOpenChange={setGuardAllocationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Allocate Guard to Shift</DialogTitle>
            <DialogDescription>
              Select a guard to allocate to this shift
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="site-info">Site</Label>
                <Badge>
                  {selectedSiteDetails?.name || 'No site selected'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="shift-type">Shift Type</Label>
                <Badge variant="outline" className="capitalize">
                  {selectedShiftType} Shift
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="allocated-guard">Select Guard</Label>
              <Select value={allocatedGuard} onValueChange={setAllocatedGuard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableGuards().map(guard => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.type || 'Permanent'}) - ${guard.payRate?.toFixed(2)}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableGuards().length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  No available guards found. All guards may be assigned elsewhere.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardAllocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGuardAllocation} disabled={!allocatedGuard || !selectedSite}>
              Allocate Guard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
