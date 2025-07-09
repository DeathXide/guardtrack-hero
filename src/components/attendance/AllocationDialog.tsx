import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Save, Search } from 'lucide-react';
import { Guard } from '@/types';

interface AllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shiftType: 'day' | 'night';
  daySlots: number;
  nightSlots: number;
  guards: Guard[];
  selectedGuards: string[];
  guardSearchTerm: string;
  onGuardSearchChange: (term: string) => void;
  onGuardSelection: (guardId: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

const AllocationDialog: React.FC<AllocationDialogProps> = ({
  isOpen,
  onClose,
  shiftType,
  daySlots,
  nightSlots,
  guards,
  selectedGuards,
  guardSearchTerm,
  onGuardSearchChange,
  onGuardSelection,
  onSave,
  isSaving
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate Guards to {shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} Shift</DialogTitle>
          <DialogDescription>
            Select guards to assign to this shift. The site has {shiftType === 'day' ? daySlots : nightSlots} configured {shiftType} shift slots.
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
              onChange={(e) => onGuardSearchChange(e.target.value)}
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
                        onCheckedChange={() => onGuardSelection(guard.id)}
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Allocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllocationDialog;