import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

import { Site } from '@/types';

interface RoleSlot {
  id: string;
  role: string;
  daySlots: number;
  nightSlots: number;
  payRatePerSlot: number;
}

interface BulkTemporarySlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RoleSlot[]) => void;
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
  const [roleSlots, setRoleSlots] = useState<RoleSlot[]>([
    {
      id: '1',
      role: '',
      daySlots: 0,
      nightSlots: 0,
      payRatePerSlot: site.payRate ? Math.floor(site.payRate / (site.daySlots + site.nightSlots)) : 3000
    }
  ]);

  const addRoleSlot = () => {
    const newRoleSlot: RoleSlot = {
      id: Date.now().toString(),
      role: '',
      daySlots: 0,
      nightSlots: 0,
      payRatePerSlot: site.payRate ? Math.floor(site.payRate / (site.daySlots + site.nightSlots)) : 3000
    };
    setRoleSlots([...roleSlots, newRoleSlot]);
  };

  const removeRoleSlot = (id: string) => {
    if (roleSlots.length > 1) {
      setRoleSlots(roleSlots.filter(slot => slot.id !== id));
    }
  };

  const updateRoleSlot = (id: string, field: keyof RoleSlot, value: string | number) => {
    setRoleSlots(roleSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const totalSlots = roleSlots.reduce((total, slot) => total + slot.daySlots + slot.nightSlots, 0);
  const totalCost = roleSlots.reduce((total, slot) => total + (slot.daySlots + slot.nightSlots) * slot.payRatePerSlot, 0);

  const handleSave = () => {
    const validRoles = roleSlots.filter(slot => slot.role && (slot.daySlots > 0 || slot.nightSlots > 0) && slot.payRatePerSlot > 0);
    if (validRoles.length === 0) return;
    
    onSave(validRoles);
  };

  const handleClose = () => {
    setRoleSlots([{
      id: '1',
      role: '',
      daySlots: 0,
      nightSlots: 0,
      payRatePerSlot: site.payRate ? Math.floor(site.payRate / (site.daySlots + site.nightSlots)) : 3000
    }]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Temporary Slots</DialogTitle>
          <DialogDescription>
            Create temporary slots for {site.name} on {date.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {roleSlots.map((roleSlot, index) => (
            <Card key={roleSlot.id} className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Role {index + 1}</CardTitle>
                  {roleSlots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoleSlot(roleSlot.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Role Selection */}
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select 
                    value={roleSlot.role} 
                    onValueChange={(value) => updateRoleSlot(roleSlot.id, 'role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Slot Numbers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Day Slots</Label>
                    <Input
                      type="number"
                      value={roleSlot.daySlots}
                      onChange={(e) => updateRoleSlot(roleSlot.id, 'daySlots', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Night Slots</Label>
                    <Input
                      type="number"
                      value={roleSlot.nightSlots}
                      onChange={(e) => updateRoleSlot(roleSlot.id, 'nightSlots', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>

                {/* Pay Rate */}
                <div className="grid gap-2">
                  <Label>Pay Rate (per slot)</Label>
                  <Input
                    type="number"
                    value={roleSlot.payRatePerSlot}
                    onChange={(e) => updateRoleSlot(roleSlot.id, 'payRatePerSlot', Number(e.target.value))}
                    placeholder="Enter pay rate per slot"
                    min="0"
                    step="100"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Role Button */}
          <Button
            variant="outline"
            onClick={addRoleSlot}
            className="border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Role
          </Button>

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
                    <span>Total Roles:</span>
                    <span className="font-medium">{roleSlots.filter(slot => slot.role).length}</span>
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
            disabled={!roleSlots.some(slot => slot.role && (slot.daySlots > 0 || slot.nightSlots > 0) && slot.payRatePerSlot > 0) || isSaving}
          >
            {isSaving ? 'Creating...' : `Create ${totalSlots} Temporary Slots`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}