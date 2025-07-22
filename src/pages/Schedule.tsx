
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader, CardLoader } from '@/components/ui/loader';
import { 
  CalendarDays,
  Clock,
  LockIcon,
  UnlockIcon,
  Moon,
  Sun,
  Building,
  Shield,
  User,
  AlertTriangle,
  Check,
  ArrowRight
} from 'lucide-react';
import { 
  sites,
  guards,
  getShiftsBySite,
  getSiteById,
  getGuardById
} from '@/lib/data';
import { Guard, Site, Shift, ScheduleAssignment } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Generate dates for the next 30 days
const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    dates.push({
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    });
  }
  
  return dates;
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSite, setSelectedSite] = useState<string | undefined>(sites[0]?.id);
  const [selectedTab, setSelectedTab] = useState<'day' | 'night'>('day');
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ index: number, assigned: boolean }>({ index: 0, assigned: false });
  const [selectedGuardId, setSelectedGuardId] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignment | null>(null);
  const [selectedTargetSite, setSelectedTargetSite] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Simulate loading delay
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return <PageLoader text="Loading schedule..." />;
  }
  
  const dateString = selectedDate 
    ? selectedDate.toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];
  
  const dateOptions = generateDateOptions();
  const selectedSiteDetails = getSiteById(selectedSite || '');
  
  // Get slots for the selected site
  const slotsCount = selectedSiteDetails 
    ? (selectedTab === 'day' ? selectedSiteDetails.daySlots : selectedSiteDetails.nightSlots)
    : 0;
  
  // Get assignments for the selected date, site, and shift type
  const currentAssignments = assignments.filter(
    a => a.date === dateString && a.siteId === selectedSite && a.shiftType === selectedTab
  );
  
  // Initialize slots array
  const slots = Array(slotsCount).fill(null).map((_, index) => {
    const assignment = currentAssignments.find(a => a.id.endsWith(`-${index}`));
    return assignment || null;
  });
  
  // Get available guards (not assigned to this site/date/shift and active)
  const getAvailableGuards = () => {
    const assignedGuardIds = currentAssignments.map(a => a.guardId);
    
    // Get all guards that are:
    // 1. Active
    // 2. Not already assigned to this site/date/shift
    // 3. Not assigned to ANY site for this date/shift (to prevent double booking)
    const busyGuardIds = assignments
      .filter(a => a.date === dateString && a.shiftType === selectedTab)
      .map(a => a.guardId);
    
    return guards.filter(g => 
      g.status === 'active' && 
      !busyGuardIds.includes(g.id)
    );
  };
  
  // Handle assign dialog open
  const handleAssignDialogOpen = (index: number, assigned: boolean) => {
    setSelectedSlot({ index, assigned });
    
    if (assigned) {
      const assignment = currentAssignments.find(a => a.id.endsWith(`-${index}`));
      setSelectedAssignment(assignment || null);
      setReassignDialogOpen(true);
    } else {
      setSelectedGuardId('');
      setAssignDialogOpen(true);
    }
  };
  
  // Assign guard to slot
  const assignGuardToSlot = () => {
    if (!selectedGuardId || !selectedSite || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please select a guard to assign",
        variant: "destructive"
      });
      return;
    }
    
    const assignmentId = `${dateString}-${selectedSite}-${selectedTab}-${selectedSlot.index}`;
    
    const newAssignment: ScheduleAssignment = {
      id: assignmentId,
      date: dateString,
      siteId: selectedSite,
      shiftType: selectedTab,
      guardId: selectedGuardId,
      locked: false
    };
    
    setAssignments([...assignments.filter(a => a.id !== assignmentId), newAssignment]);
    setAssignDialogOpen(false);
    
    const guard = getGuardById(selectedGuardId);
    
    toast({
      title: "Guard Assigned",
      description: `${guard?.name} has been assigned to ${selectedSiteDetails?.name} for ${selectedTab} shift`,
    });
  };
  
  // Reassign guard to another site
  const reassignGuard = () => {
    if (!selectedAssignment || !selectedTargetSite) {
      toast({
        title: "Missing Information",
        description: "Please select a target site for reassignment",
        variant: "destructive"
      });
      return;
    }
    
    const targetSite = getSiteById(selectedTargetSite);
    
    if (!targetSite) {
      toast({
        title: "Invalid Target Site",
        description: "Please select a valid target site",
        variant: "destructive"
      });
      return;
    }
    
    // Check if target site has available slots
    const targetSiteAssignments = assignments.filter(
      a => a.date === dateString && a.siteId === selectedTargetSite && a.shiftType === selectedTab
    );
    
    const targetSiteSlots = selectedTab === 'day' ? targetSite.daySlots : targetSite.nightSlots;
    
    if (targetSiteAssignments.length >= targetSiteSlots) {
      toast({
        title: "No Available Slots",
        description: `${targetSite.name} has no available slots for ${selectedTab} shift`,
        variant: "destructive"
      });
      return;
    }
    
    // Remove from current site
    setAssignments(assignments.filter(a => a.id !== selectedAssignment.id));
    
    // Add to target site (first available slot)
    const usedIndices = targetSiteAssignments.map(a => parseInt(a.id.split('-').pop() || '0'));
    let nextIndex = 0;
    while (usedIndices.includes(nextIndex)) {
      nextIndex++;
    }
    
    const newAssignmentId = `${dateString}-${selectedTargetSite}-${selectedTab}-${nextIndex}`;
    
    const newAssignment: ScheduleAssignment = {
      id: newAssignmentId,
      date: dateString,
      siteId: selectedTargetSite,
      shiftType: selectedTab,
      guardId: selectedAssignment.guardId,
      locked: false
    };
    
    setAssignments([...assignments, newAssignment]);
    setReassignDialogOpen(false);
    
    const guard = getGuardById(selectedAssignment.guardId);
    
    toast({
      title: "Guard Reassigned",
      description: `${guard?.name} has been reassigned to ${targetSite.name} for ${selectedTab} shift`,
    });
  };
  
  // Toggle lock on assignment
  const toggleLock = (assignment: ScheduleAssignment) => {
    const updatedAssignments = assignments.map(a => 
      a.id === assignment.id ? { ...a, locked: !a.locked } : a
    );
    
    setAssignments(updatedAssignments);
    
    const guard = getGuardById(assignment.guardId);
    const site = getSiteById(assignment.siteId);
    
    toast({
      title: assignment.locked ? "Assignment Unlocked" : "Assignment Locked",
      description: `${guard?.name}'s assignment at ${site?.name} has been ${assignment.locked ? 'unlocked' : 'locked'}`,
    });
  };
  
  // Remove assignment
  const removeAssignment = (assignment: ScheduleAssignment) => {
    if (assignment.locked) {
      toast({
        title: "Assignment Locked",
        description: "Cannot remove a locked assignment. Please unlock it first.",
        variant: "destructive"
      });
      return;
    }
    
    setAssignments(assignments.filter(a => a.id !== assignment.id));
    
    const guard = getGuardById(assignment.guardId);
    
    toast({
      title: "Assignment Removed",
      description: `${guard?.name} has been removed from the schedule`,
    });
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Schedule</h2>
          <p className="text-muted-foreground">
            Manage guard assignments and schedules for all sites
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>Schedule Options</CardTitle>
            <CardDescription>
              Select date, site and shift type
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
                <Tabs defaultValue="day" onValueChange={(v) => setSelectedTab(v as 'day' | 'night')}>
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
              <CardTitle>Guard Assignments</CardTitle>
              <CardDescription>
                {selectedSiteDetails ? selectedSiteDetails.name : 'No site selected'} • {selectedTab === 'day' ? 'Day Shift' : 'Night Shift'} • {formatDate(dateString)}
              </CardDescription>
            </div>
            <Badge className="text-xs">
              {selectedSiteDetails 
                ? (selectedTab === 'day' 
                  ? `${selectedSiteDetails.daySlots} slots` 
                  : `${selectedSiteDetails.nightSlots} slots`)
                : '0 slots'}
            </Badge>
          </CardHeader>
          <CardContent>
            {!selectedSiteDetails ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Site Selected</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  Please select a site from the sidebar to view the schedule.
                </p>
              </div>
            ) : slotsCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Slots Available</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  This site has no {selectedTab} shift slots configured.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {slots.map((assignment, index) => (
                  <Card key={index} className={`transition-all ${assignment?.locked ? 'bg-muted/50 border-primary/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 rounded-md bg-primary/10 items-center justify-center text-primary font-medium">
                            {index + 1}
                          </div>
                          
                          {assignment ? (
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage 
                                  src={getGuardById(assignment.guardId)?.avatar} 
                                  alt={getGuardById(assignment.guardId)?.name} 
                                />
                                <AvatarFallback>
                                  {getInitials(getGuardById(assignment.guardId)?.name || 'Unknown')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{getGuardById(assignment.guardId)?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getGuardById(assignment.guardId)?.type || 'Permanent'} Guard • Badge #{getGuardById(assignment.guardId)?.badgeNumber}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              Unassigned Slot
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          {assignment && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => toggleLock(assignment)}
                            >
                              {assignment.locked ? (
                                <LockIcon className="h-4 w-4 text-primary" />
                              ) : (
                                <UnlockIcon className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {assignment ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAssignDialogOpen(index, true)}
                                disabled={assignment.locked}
                              >
                                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                Reassign
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => removeAssignment(assignment)}
                                disabled={assignment.locked}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleAssignDialogOpen(index, false)}
                            >
                              <User className="h-3.5 w-3.5 mr-1" />
                              Assign Guard
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Assign Guard Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Guard to Slot</DialogTitle>
            <DialogDescription>
              Select a guard to assign to slot #{selectedSlot.index + 1}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="guard-select">Select Guard</Label>
              <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                <SelectTrigger id="guard-select">
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableGuards().length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No available guards for this shift
                    </div>
                  ) : (
                    getAvailableGuards().map(guard => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.name} ({guard.type || 'Permanent'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assignGuardToSlot} disabled={!selectedGuardId}>
              Assign Guard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reassign Guard Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reassign Guard</DialogTitle>
            <DialogDescription>
              Move {getGuardById(selectedAssignment?.guardId || '')?.name} to another site
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="target-site">Select Target Site</Label>
              <Select value={selectedTargetSite} onValueChange={setSelectedTargetSite}>
                <SelectTrigger id="target-site">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites
                    .filter(site => site.id !== selectedSite)
                    .map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={reassignGuard} disabled={!selectedTargetSite}>
              Reassign Guard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
