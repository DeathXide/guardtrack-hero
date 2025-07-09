import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Site } from '@/types';

interface TemporarySlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    shiftType: 'day' | 'night';
    role: string;
    payRate: number;
  }) => void;
  site: Site;
  date: Date;
  isSaving?: boolean;
}

const predefinedRoles = [
  'Security Guard',
  'Supervisor',
  'Housekeeping',
  'Maintenance',
  'Receptionist',
  'Other'
];

export default function TemporarySlotDialog({
  isOpen,
  onClose,
  onSave,
  site,
  date,
  isSaving = false
}: TemporarySlotDialogProps) {
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day');
  const [role, setRole] = useState('');
  const [payRate, setPayRate] = useState<number>(site.payRate || 0);

  const handleSave = () => {
    if (!role || payRate <= 0) return;
    
    onSave({
      shiftType,
      role,
      payRate
    });
  };

  const handleClose = () => {
    setRole('');
    setPayRate(site.payRate || 0);
    setShiftType('day');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Temporary Slot</DialogTitle>
          <DialogDescription>
            Create a temporary slot for {site.name} on {date.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="shift-type">Shift Type</Label>
            <Select value={shiftType} onValueChange={(value: 'day' | 'night') => setShiftType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {predefinedRoles.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="pay-rate">Pay Rate (per shift)</Label>
            <Input
              id="pay-rate"
              type="number"
              value={payRate}
              onChange={(e) => setPayRate(Number(e.target.value))}
              placeholder="Enter pay rate"
              min="0"
              step="50"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!role || payRate <= 0 || isSaving}
          >
            {isSaving ? 'Creating...' : 'Create Temporary Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}