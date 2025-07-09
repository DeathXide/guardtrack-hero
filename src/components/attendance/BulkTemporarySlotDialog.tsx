import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Site } from '@/types';

interface BulkTemporarySlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    daySlots: number;
    nightSlots: number;
    role: string;
    payRatePerSlot: number;
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

export default function BulkTemporarySlotDialog({
  isOpen,
  onClose,
  onSave,
  site,
  date,
  isSaving = false
}: BulkTemporarySlotDialogProps) {
  const [daySlots, setDaySlots] = useState<number>(0);
  const [nightSlots, setNightSlots] = useState<number>(0);
  const [role, setRole] = useState('');
  const [payRatePerSlot, setPayRatePerSlot] = useState<number>(site.payRate ? Math.floor(site.payRate / (site.daySlots + site.nightSlots)) : 3000);

  const totalSlots = daySlots + nightSlots;
  const totalCost = totalSlots * payRatePerSlot;

  const handleSave = () => {
    if (!role || payRatePerSlot <= 0 || totalSlots === 0) return;
    
    onSave({
      daySlots,
      nightSlots,
      role,
      payRatePerSlot
    });
  };

  const handleClose = () => {
    setDaySlots(0);
    setNightSlots(0);
    setRole('');
    setPayRatePerSlot(site.payRate ? Math.floor(site.payRate / (site.daySlots + site.nightSlots)) : 3000);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Temporary Slots</DialogTitle>
          <DialogDescription>
            Create temporary slots for {site.name} on {date.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Role Selection */}
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

          {/* Slot Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="day-slots">Day Slots</Label>
              <Input
                id="day-slots"
                type="number"
                value={daySlots}
                onChange={(e) => setDaySlots(Number(e.target.value))}
                placeholder="0"
                min="0"
                max="10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="night-slots">Night Slots</Label>
              <Input
                id="night-slots"
                type="number"
                value={nightSlots}
                onChange={(e) => setNightSlots(Number(e.target.value))}
                placeholder="0"
                min="0"
                max="10"
              />
            </div>
          </div>

          {/* Pay Rate */}
          <div className="grid gap-2">
            <Label htmlFor="pay-rate">Pay Rate (per slot)</Label>
            <Input
              id="pay-rate"
              type="number"
              value={payRatePerSlot}
              onChange={(e) => setPayRatePerSlot(Number(e.target.value))}
              placeholder="Enter pay rate per slot"
              min="0"
              step="100"
            />
          </div>

          {/* Summary Card */}
          {totalSlots > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Slots:</span>
                    <span className="font-medium">{totalSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Day Slots:</span>
                    <span className="font-medium">{daySlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Night Slots:</span>
                    <span className="font-medium">{nightSlots}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Total Cost:</span>
                    <span className="font-medium">₹{totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!role || payRatePerSlot <= 0 || totalSlots === 0 || isSaving}
          >
            {isSaving ? 'Creating...' : `Create ${totalSlots} Temporary Slots`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}