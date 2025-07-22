import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, User, AlertTriangle, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/lib/shiftsApi';
import { toast } from 'sonner';

interface Guard {
  id: string;
  name: string;
  badge_number: string;
  status: string;
}

interface GuardAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  shiftType: 'day' | 'night';
  maxSlots: number;
  currentlyAssigned: Guard[];
  availableGuards: Guard[];
  existingConflicts?: string[];
}

const GuardAllocationModal: React.FC<GuardAllocationModalProps> = ({
  isOpen,
  onClose,
  siteId,
  shiftType,
  maxSlots,
  currentlyAssigned,
  availableGuards,
  existingConflicts = []
}) => {
  const [selectedGuards, setSelectedGuards] = useState<string[]>(
    currentlyAssigned.map(g => g.id)
  );
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();

  // Filter guards based on search
  const filteredGuards = useMemo(() => {
    return availableGuards.filter(guard =>
      guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guard.badge_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableGuards, searchTerm]);

  // Create shift assignments mutation
  const createShiftsMutation = useMutation({
    mutationFn: async (guardIds: string[]) => {
      // First, delete existing shifts for this site and shift type
      const existingShifts = await shiftsApi.getShiftsBySite(siteId);
      const shiftsToDelete = existingShifts
        .filter(shift => shift.type === shiftType)
        .map(shift => shift.id);
      
      // Delete existing shifts
      await Promise.all(shiftsToDelete.map(id => shiftsApi.deleteShift(id)));
      
      // Create new shifts
      const newShifts = guardIds.map(guardId => ({
        site_id: siteId,
        guard_id: guardId,
        type: shiftType
      }));
      
      if (newShifts.length > 0) {
        return shiftsApi.createShifts(newShifts);
      }
      return [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', siteId] });
      toast.success(`${shiftType} shift allocation updated successfully`);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error updating shift allocation:', error);
      toast.error('Failed to update shift allocation');
    }
  });

  const handleGuardToggle = (guardId: string) => {
    setSelectedGuards(prev => {
      if (prev.includes(guardId)) {
        return prev.filter(id => id !== guardId);
      } else if (prev.length < maxSlots) {
        return [...prev, guardId];
      } else {
        toast.error(`Cannot assign more than ${maxSlots} guards to ${shiftType} shift`);
        return prev;
      }
    });
  };

  const handleSave = () => {
    createShiftsMutation.mutate(selectedGuards);
  };

  const isGuardConflicted = (guardId: string) => {
    return existingConflicts.includes(guardId);
  };

  const getSelectedCount = () => selectedGuards.length;
  const getRemainingSlots = () => maxSlots - selectedGuards.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Allocate Guards - {shiftType === 'day' ? 'Day' : 'Night'} Shift
          </DialogTitle>
          <DialogDescription>
            Assign guards to the {shiftType} shift. Maximum {maxSlots} guards allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Allocation Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">
                Selected: {getSelectedCount()} / {maxSlots}
              </span>
            </div>
            <Badge variant={getRemainingSlots() === 0 ? "default" : "outline"}>
              {getRemainingSlots()} slots remaining
            </Badge>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search Guards</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or badge number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Guards List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <Label>Available Guards</Label>
            {filteredGuards.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No guards found matching your search
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGuards.map(guard => {
                  const isSelected = selectedGuards.includes(guard.id);
                  const isConflicted = isGuardConflicted(guard.id);
                  const isDisabled = !isSelected && selectedGuards.length >= maxSlots;

                  return (
                    <div
                      key={guard.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                        isSelected ? 'bg-primary/10 border-primary/30' : 
                        isDisabled ? 'bg-muted/50' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleGuardToggle(guard.id)}
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{guard.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {guard.badge_number}
                          </Badge>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {isConflicted && (
                          <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Already assigned to another site for this shift</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warnings */}
          {selectedGuards.some(id => isGuardConflicted(id)) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some selected guards are already assigned to other sites for this shift time. 
                This may cause scheduling conflicts.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createShiftsMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={createShiftsMutation.isPending}
          >
            {createShiftsMutation.isPending ? 'Saving...' : 'Save Allocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GuardAllocationModal;