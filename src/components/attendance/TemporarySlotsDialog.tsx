import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/localService';

const ROLE_TYPES = ['Security Guard', 'Supervisor', 'Housekeeping'] as const;

interface TemporarySlotsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSlots: (data: { daySlots: number; nightSlots: number; payRate: number; roleType: string }) => void;
  isLoading?: boolean;
}

const TemporarySlotsDialog: React.FC<TemporarySlotsDialogProps> = ({
  isOpen,
  onClose,
  onCreateSlots,
  isLoading = false
}) => {
  const [daySlots, setDaySlots] = useState<number>(0);
  const [nightSlots, setNightSlots] = useState<number>(0);
  const [payRate, setPayRate] = useState<number>(0);
  const [roleType, setRoleType] = useState<string>('');

  const totalSlots = daySlots + nightSlots;
  const totalCost = totalSlots * payRate;

  const handleSubmit = () => {
    if (totalSlots === 0 || !roleType) return;
    onCreateSlots({ daySlots, nightSlots, payRate, roleType });
    setDaySlots(0);
    setNightSlots(0);
    setPayRate(0);
    setRoleType('');
  };

  const resetForm = () => {
    setDaySlots(0);
    setNightSlots(0);
    setPayRate(0);
    setRoleType('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Temporary Slots
          </DialogTitle>
        </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleType">Role Type</Label>
              <Select value={roleType} onValueChange={setRoleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role type" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_TYPES.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              Temporary slots are for this specific date only and will appear with red borders.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daySlots">Day Slots</Label>
              <Input
                id="daySlots"
                type="number"
                min="0"
                value={daySlots || ''}
                onChange={(e) => setDaySlots(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nightSlots">Night Slots</Label>
              <Input
                id="nightSlots"
                type="number"
                min="0"
                value={nightSlots || ''}
                onChange={(e) => setNightSlots(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payRate">Pay Rate per Slot</Label>
            <Input
              id="payRate"
              type="number"
              min="0"
              step="0.01"
              value={payRate || ''}
              onChange={(e) => setPayRate(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {totalSlots > 0 && (
            <>
              <Separator />
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <span className="font-medium">{roleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Slots:</span>
                      <span className="font-medium">{totalSlots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pay Rate:</span>
                      <span className="font-medium">{formatCurrency(payRate)}/slot</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Cost:</span>
                      <span className="text-primary">{formatCurrency(totalCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={totalSlots === 0 || payRate <= 0 || !roleType || isLoading}
          >
            {isLoading ? 'Creating...' : `Create ${totalSlots} ${roleType} Slot${totalSlots !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemporarySlotsDialog;