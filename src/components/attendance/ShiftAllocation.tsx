
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Edit, Plus, Save, Search, ShieldAlert, Trash, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSites, fetchGuards, fetchShiftsBySite, createShift, updateShift, deleteShift, fetchAttendanceByShift } from '@/lib/localService';
import { Site, Guard, Shift } from '@/types';

const ShiftAllocation: React.FC = () => {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day');
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [guardSearchTerm, setGuardSearchTerm] = useState('');
  const [showAttendanceWarning, setShowAttendanceWarning] = useState(false);
  const [guardsWithAttendance, setGuardsWithAttendance] = useState<string[]>([]);
  const [pendingAllocation, setPendingAllocation] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const { data: guards = [], isLoading: guardsLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['shifts', selectedSite],
    queryFn: () => selectedSite ? fetchShiftsBySite(selectedSite) : Promise.resolve([]),
    enabled: !!selectedSite
  });

  const selectedSiteData = sites.find(site => site.id === selectedSite);
  const daySlots = selectedSiteData?.daySlots || 0;
  const nightSlots = selectedSiteData?.nightSlots || 0;

  const createShiftMutation = useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create shift: ${error.message}`);
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, shift }: { id: string; shift: Partial<Shift> }) => 
      updateShift(id, shift),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update shift: ${error.message}`);
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedSite] });
      toast.success('Shift deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete shift: ${error.message}`);
    }
  });

  const dayShifts = shifts.filter(shift => shift.type === 'day');
  const nightShifts = shifts.filter(shift => shift.type === 'night');

  const getGuardName = (guardId: string) => {
    const guard = guards.find(g => g.id === guardId);
    return guard ? guard.name : 'Unknown Guard';
  };

  const handleOpenAllocationDialog = (shiftType: 'day' | 'night') => {
    setSelectedShiftType(shiftType);
    
    const currentShifts = shifts.filter(shift => shift.type === shiftType);
    const currentGuardIds = currentShifts.map(shift => shift.guardId).filter(id => id) as string[];
    setSelectedGuards(currentGuardIds);
    setGuardSearchTerm('');
    
    setIsAllocationDialogOpen(true);
  };

  const handleGuardSelection = (guardId: string) => {
    if (selectedGuards.includes(guardId)) {
      setSelectedGuards(selectedGuards.filter(id => id !== guardId));
    } else {
      setSelectedGuards([...selectedGuards, guardId]);
    }
  };

  const checkAttendanceRecords = async (shiftsToRemove: Shift[]): Promise<string[]> => {
    const guardsWithAttendance: string[] = [];
    
    for (const shift of shiftsToRemove) {
      if (shift.guardId) {
        try {
          const attendanceRecords = await fetchAttendanceByShift(shift.id);
          if (attendanceRecords.length > 0) {
            guardsWithAttendance.push(shift.guardId);
          }
        } catch (error) {
          console.error('Error checking attendance records:', error);
        }
      }
    }
    
    return [...new Set(guardsWithAttendance)]; // Remove duplicates
  };

  const handleSaveAllocation = async () => {
    const shiftType = selectedShiftType;
    const existingShifts = shifts.filter(shift => shift.type === shiftType);
    const shiftsToRemove = existingShifts.filter(shift => 
      shift.guardId && !selectedGuards.includes(shift.guardId)
    );
    
    // Check if any guards being removed have attendance records
    if (shiftsToRemove.length > 0) {
      const guardsWithAttendance = await checkAttendanceRecords(shiftsToRemove);
      
      if (guardsWithAttendance.length > 0) {
        setGuardsWithAttendance(guardsWithAttendance);
        setPendingAllocation(selectedGuards);
        setShowAttendanceWarning(true);
        return;
      }
    }
    
    await performAllocation();
  };

  const performAllocation = async () => {
    const shiftType = selectedShiftType;
    const existingShifts = shifts.filter(shift => shift.type === shiftType);
    
    for (const shift of existingShifts) {
      if (shift.guardId && !selectedGuards.includes(shift.guardId)) {
        try {
          await deleteShiftMutation.mutateAsync(shift.id);
        } catch (error) {
          console.error('Error deleting shift:', error);
        }
      }
    }
    
    for (const guardId of selectedGuards) {
      const existingShift = existingShifts.find(shift => shift.guardId === guardId);
      
      if (existingShift) {
        continue;
      } else {
        try {
          await createShiftMutation.mutateAsync({
            siteId: selectedSite,
            type: shiftType,
            guardId: guardId
          });
        } catch (error) {
          console.error('Error creating shift:', error);
        }
      }
    }
    
    refetchShifts();
    setIsAllocationDialogOpen(false);
    setShowAttendanceWarning(false);
    setGuardsWithAttendance([]);
    setPendingAllocation([]);
  };

  const renderShiftTable = (shiftType: 'day' | 'night') => {
    const shiftsData = shiftType === 'day' ? dayShifts : nightShifts;
    const maxSlots = shiftType === 'day' ? daySlots : nightSlots;
    
    if (maxSlots === 0) {
      return (
        <Alert className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>No slots configured</AlertTitle>
          <AlertDescription>
            This site has no {shiftType} shift slots configured. Please update the site settings to add slots.
          </AlertDescription>
        </Alert>
      );
    }
    
    const filledSlots = shiftsData.filter(shift => shift.guardId).length;
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className={`${filledSlots > maxSlots ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-primary/10 text-primary border-primary/20'}`}>
            {filledSlots} / {maxSlots} Slots Filled {filledSlots > maxSlots && '(Exceeded)'}
          </Badge>
          <Button 
            size="sm"
            onClick={() => handleOpenAllocationDialog(shiftType)}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Guards
          </Button>
        </div>
        
        {shiftsData.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            No guards allocated for this shift. Click "Manage Guards" to allocate guards.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guard Name</TableHead>
                <TableHead>Badge Number</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftsData.map(shift => {
                if (!shift.guardId) return null;
                const guard = guards.find(g => g.id === shift.guardId);
                
                return (
                  <TableRow key={shift.id}>
                    <TableCell>{guard?.name || 'Unknown Guard'}</TableCell>
                    <TableCell>{guard?.badgeNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={guard?.status === 'active' ? 'default' : 'outline'}>
                        {guard?.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  if (sitesLoading || guardsLoading) {
    return <div className="flex items-center justify-center h-64">Loading data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Shift Guard Allocation</CardTitle>
        <CardDescription>
          Manage which guards are assigned to each site shift
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label htmlFor="site-select">Select Site</Label>
            <Select
              value={selectedSite}
              onValueChange={setSelectedSite}
            >
              <SelectTrigger className="w-full mt-2" id="site-select">
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
            <Tabs defaultValue="day" className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="day">Day Shift</TabsTrigger>
                <TabsTrigger value="night">Night Shift</TabsTrigger>
              </TabsList>
              
              <TabsContent value="day">
                {shiftsLoading ? (
                  <div className="flex items-center justify-center h-48">Loading shifts...</div>
                ) : (
                  renderShiftTable('day')
                )}
              </TabsContent>
              
              <TabsContent value="night">
                {shiftsLoading ? (
                  <div className="flex items-center justify-center h-48">Loading shifts...</div>
                ) : (
                  renderShiftTable('night')
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
      
      <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Guards to {selectedShiftType.charAt(0).toUpperCase() + selectedShiftType.slice(1)} Shift</DialogTitle>
            <DialogDescription>
              Select guards to assign to this shift. The site has {selectedShiftType === 'day' ? daySlots : nightSlots} configured {selectedShiftType} shift slots.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or badge number..."
                className="pl-8"
                value={guardSearchTerm}
                onChange={(e) => setGuardSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="max-h-[250px] overflow-y-auto">
              {guards.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No guards available</p>
              ) : (
                <div className="space-y-1">
                  {guards
                    .filter(guard => guard.status === 'active')
                    .filter(guard => 
                      guardSearchTerm === '' || 
                      guard.name.toLowerCase().includes(guardSearchTerm.toLowerCase()) ||
                      guard.badgeNumber.toLowerCase().includes(guardSearchTerm.toLowerCase())
                    )
                    .sort((a, b) => {
                      const aSelected = selectedGuards.includes(a.id);
                      const bSelected = selectedGuards.includes(b.id);
                      
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(guard => (
                      <div key={guard.id} className="flex items-center p-2 hover:bg-muted rounded-md">
                        <Checkbox 
                          id={`guard-${guard.id}`}
                          checked={selectedGuards.includes(guard.id)}
                          onCheckedChange={() => handleGuardSelection(guard.id)}
                        />
                        <label 
                          htmlFor={`guard-${guard.id}`}
                          className="ml-2 text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {guard.name} ({guard.badgeNumber})
                          {selectedGuards.includes(guard.id) && (
                            <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
                          )}
                        </label>
                      </div>
                    ))
                  }
                  {guards
                    .filter(guard => guard.status === 'active')
                    .filter(guard => 
                      guardSearchTerm === '' || 
                      guard.name.toLowerCase().includes(guardSearchTerm.toLowerCase()) ||
                      guard.badgeNumber.toLowerCase().includes(guardSearchTerm.toLowerCase())
                    ).length === 0 && (
                    <p className="text-center py-4 text-muted-foreground">
                      No guards found matching "{guardSearchTerm}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsAllocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAllocation}
              disabled={createShiftMutation.isPending || updateShiftMutation.isPending || deleteShiftMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createShiftMutation.isPending || updateShiftMutation.isPending || deleteShiftMutation.isPending ? 'Saving...' : 'Save Allocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showAttendanceWarning} onOpenChange={setShowAttendanceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Attendance Records Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following guards have existing attendance records and cannot be removed from their assignments:
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <ul className="list-disc list-inside space-y-1">
                  {guardsWithAttendance.map(guardId => {
                    const guard = guards.find(g => g.id === guardId);
                    return (
                      <li key={guardId} className="text-sm font-medium">
                        {guard?.name || 'Unknown Guard'} ({guard?.badgeNumber || 'N/A'})
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="mt-2 text-sm">
                To proceed, you must first clear their attendance records from the Mark Attendance tab.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowAttendanceWarning(false);
              setGuardsWithAttendance([]);
              setPendingAllocation([]);
            }}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ShiftAllocation;
