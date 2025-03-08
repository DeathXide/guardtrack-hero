
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import { 
  attendanceRecords, 
  sites, 
  guards, 
  getShiftsBySite, 
  getGuardById, 
  getSiteById, 
  getAttendanceByDate 
} from '@/lib/data';
import { AttendanceRecord, Guard, Site, Shift } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Function to format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSite, setSelectedSite] = useState<string | undefined>(sites[0]?.id);
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day');
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'reassigned'>('present');
  const [replacementGuard, setReplacementGuard] = useState<string | undefined>();
  const [reassignedSite, setReassignedSite] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  
  // Get the date string in YYYY-MM-DD format
  const dateString = selectedDate 
    ? selectedDate.toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];
  
  // Get site details
  const selectedSiteDetails = getSiteById(selectedSite || '');
  
  // Get shifts for the selected site
  const siteShifts = selectedSiteDetails 
    ? getShiftsBySite(selectedSiteDetails.id).filter(shift => shift.type === selectedShiftType)
    : [];
  
  // Get attendance records for the selected date
  const dateRecords = getAttendanceByDate(dateString);
  
  // Combine shifts with attendance records
  const shiftsWithAttendance = siteShifts.map(shift => {
    const attendanceRecord = dateRecords.find(record => record.shiftId === shift.id);
    const guard = getGuardById(shift.guardId);
    
    // If there's no attendance record, create a default one
    const record = attendanceRecord || {
      id: `temp-${shift.id}-${dateString}`,
      date: dateString,
      shiftId: shift.id,
      guardId: shift.guardId,
      status: 'present', // Default to present
    };
    
    return {
      shift,
      record,
      guard,
      replacementGuard: record.replacementGuardId 
        ? getGuardById(record.replacementGuardId) 
        : undefined,
      reassignedSite: record.reassignedSiteId
        ? getSiteById(record.reassignedSiteId)
        : undefined
    };
  });
  
  // Handle mark attendance
  const handleMarkAttendance = (shift: Shift, guard: Guard | undefined) => {
    if (!guard) return;
    
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
  
  // Handle assign replacement
  const handleAssignReplacement = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReplacementGuard(undefined);
    setNotes('');
    setReplacementDialogOpen(true);
  };
  
  // Handle reassign to different site
  const handleReassignToSite = (record: AttendanceRecord, guard: Guard | undefined) => {
    if (!guard) return;
    
    setSelectedRecord(record);
    setSelectedGuard(guard);
    setReassignedSite(undefined);
    setNotes('');
    setReassignDialogOpen(true);
  };
  
  // Save attendance
  const saveAttendance = () => {
    if (!selectedRecord || !selectedGuard) return;
    
    // In a real app, this would call an API to save the attendance
    
    toast({
      title: 'Attendance recorded',
      description: `${selectedGuard.name} marked as ${attendanceStatus} for ${formatDate(dateString)}`,
    });
    
    setAttendanceDialogOpen(false);
    
    // If marked as absent, open replacement dialog
    if (attendanceStatus === 'absent') {
      setReplacementDialogOpen(true);
    } else if (attendanceStatus === 'reassigned') {
      setReassignDialogOpen(true);
    }
  };
  
  // Save replacement
  const saveReplacement = () => {
    if (!selectedRecord || !selectedGuard || !replacementGuard) return;
    
    const replacement = getGuardById(replacementGuard);
    
    // In a real app, this would call an API to save the replacement
    
    toast({
      title: 'Replacement assigned',
      description: `${replacement?.name} assigned as replacement for ${selectedGuard.name}`,
    });
    
    setReplacementDialogOpen(false);
  };
  
  // Save reassignment
  const saveReassignment = () => {
    if (!selectedRecord || !selectedGuard || !reassignedSite) return;
    
    const targetSite = getSiteById(reassignedSite);
    
    // In a real app, this would call an API to save the reassignment
    
    toast({
      title: 'Guard reassigned',
      description: `${selectedGuard.name} reassigned to ${targetSite?.name}`,
    });
    
    setReassignDialogOpen(false);
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose a date to view or mark attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="border rounded-md p-3"
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
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site">Select Site</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Select Site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Shift Type</Label>
                <Tabs defaultValue="day" onValueChange={(v) => setSelectedShiftType(v as 'day' | 'night')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="day" className="flex items-center">
                      <Sun className="h-4 w-4 mr-2" />
                      Day
                    </TabsTrigger>
                    <TabsTrigger value="night" className="flex items-center">
                      <Moon className="h-4 w-4 mr-2" />
                      Night
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
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
              <div className="rounded-md border">
                <div className="grid grid-cols-12 bg-muted py-3 px-4 text-sm font-medium">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Guard</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-4">Actions</div>
                </div>
                
                <div className="divide-y">
                  {shiftsWithAttendance.map((item, index) => (
                    <div key={item.shift.id} className="grid grid-cols-12 py-3 px-4 items-center">
                      <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                      
                      <div className="col-span-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.guard?.avatar} alt={item.guard?.name} />
                            <AvatarFallback>{item.guard ? getInitials(item.guard.name) : 'N/A'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{item.guard?.name || 'Unassigned'}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.guard?.type || 'Permanent'} • Badge #{item.guard?.badgeNumber || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-3">
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
                      </div>
                      
                      <div className="col-span-4 flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAttendance(item.shift, item.guard || undefined)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Mark Attendance
                        </Button>
                        
                        {item.record.status === 'absent' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleAssignReplacement(item.record, item.guard || undefined)}
                          >
                            <User className="h-3.5 w-3.5 mr-1" />
                            Assign Replacement
                          </Button>
                        )}
                        
                        {item.record.status === 'absent' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReassignToSite(item.record, item.guard || undefined)}
                          >
                            <Building className="h-3.5 w-3.5 mr-1" />
                            Reassign to Site
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
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
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
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
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Attendance Rate</span>
                      <span className="font-medium">
                        {shiftsWithAttendance.length > 0
                          ? Math.round(
                              (shiftsWithAttendance.filter(
                                i => i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                              ).length / 
                              shiftsWithAttendance.length) * 100
                            )
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ 
                          width: `${
                            shiftsWithAttendance.length > 0
                              ? Math.round(
                                  (shiftsWithAttendance.filter(
                                    i => i.record.status === 'present' || i.record.status === 'replaced' || i.record.status === 'reassigned'
                                  ).length / 
                                  shiftsWithAttendance.length) * 100
                                )
                              : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Replacement Rate</span>
                      <span className="font-medium">
                        {shiftsWithAttendance.length > 0
                          ? Math.round(
                              (shiftsWithAttendance.filter(i => i.record.status === 'replaced').length / 
                              shiftsWithAttendance.length) * 100
                            )
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-amber-500" 
                        style={{ 
                          width: `${
                            shiftsWithAttendance.length > 0
                              ? Math.round(
                                  (shiftsWithAttendance.filter(i => i.record.status === 'replaced').length / 
                                  shiftsWithAttendance.length) * 100
                                )
                              : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Reassignment Rate</span>
                      <span className="font-medium">
                        {shiftsWithAttendance.length > 0
                          ? Math.round(
                              (shiftsWithAttendance.filter(i => i.record.status === 'reassigned').length / 
                              shiftsWithAttendance.length) * 100
                            )
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ 
                          width: `${
                            shiftsWithAttendance.length > 0
                              ? Math.round(
                                  (shiftsWithAttendance.filter(i => i.record.status === 'reassigned').length / 
                                  shiftsWithAttendance.length) * 100
                                )
                              : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Mark Attendance Dialog */}
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
      
      {/* Assign Replacement Dialog */}
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
                <SelectTrigger id="replacement">
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent>
                  {guards
                    .filter(g => g.id !== selectedGuard?.id && g.status === 'active')
                    .map(guard => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.name} ({guard.type || 'Permanent'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
      
      {/* Reassign to Site Dialog */}
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
                <SelectTrigger id="reassigned-site">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites
                    .filter(site => site.id !== selectedSite)
                    .map(site => (
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
    </div>
  );
};

export default Attendance;
