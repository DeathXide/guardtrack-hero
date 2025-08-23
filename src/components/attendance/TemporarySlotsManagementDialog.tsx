import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { dailyAttendanceSlotsApi, DailyAttendanceSlot, CreateSlotData } from '@/lib/dailyAttendanceSlotsApi';

interface TemporarySlotsManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  date: string;
  temporarySlots: DailyAttendanceSlot[];
}

interface SlotFormData {
  shift_type: 'day' | 'night';
  role_type: string;
  pay_rate: string;
}

const TemporarySlotsManagementDialog: React.FC<TemporarySlotsManagementDialogProps> = ({
  isOpen,
  onClose,
  siteId,
  date,
  temporarySlots
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<SlotFormData>({
    shift_type: 'day',
    role_type: '',
    pay_rate: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Common role types
  const roleTypes = ['Security Guard', 'Supervisor', 'Manager', 'Cleaner', 'Maintenance'];

  // Create temporary slot mutation
  const createSlotMutation = useMutation({
    mutationFn: (slotData: CreateSlotData) => dailyAttendanceSlotsApi.createTemporarySlot(slotData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ title: 'Temporary slot created successfully' });
      setShowAddForm(false);
      setFormData({ shift_type: 'day', role_type: '', pay_rate: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating temporary slot',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete temporary slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.deleteTemporarySlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ title: 'Temporary slot deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting temporary slot',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleCreateSlot = () => {
    if (!formData.role_type || !formData.pay_rate) {
      toast({
        title: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    createSlotMutation.mutate({
      site_id: siteId,
      attendance_date: date,
      shift_type: formData.shift_type,
      role_type: formData.role_type,
      slot_number: 1, // Will be automatically calculated in the API
      pay_rate: parseFloat(formData.pay_rate)
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('Are you sure you want to delete this temporary slot?')) {
      deleteSlotMutation.mutate(slotId);
    }
  };

  // Group slots by shift type
  const groupedSlots = temporarySlots.reduce((acc, slot) => {
    if (!acc[slot.shift_type]) {
      acc[slot.shift_type] = [];
    }
    acc[slot.shift_type].push(slot);
    return acc;
  }, {} as Record<string, DailyAttendanceSlot[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Temporary Slots</DialogTitle>
          <DialogDescription>
            Create and manage temporary staff requirements for {date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Slot Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Add Temporary Slot</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shift_type">Shift Type</Label>
                    <Select
                      value={formData.shift_type}
                      onValueChange={(value: 'day' | 'night') => 
                        setFormData(prev => ({ ...prev, shift_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_type">Role Type</Label>
                    <Select
                      value={formData.role_type}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, role_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleTypes.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_rate">Pay Rate</Label>
                  <Input
                    id="pay_rate"
                    type="number"
                    placeholder="Enter pay rate"
                    value={formData.pay_rate}
                    onChange={(e) => 
                      setFormData(prev => ({ ...prev, pay_rate: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateSlot}
                    disabled={createSlotMutation.isPending}
                  >
                    {createSlotMutation.isPending ? 'Creating...' : 'Create Slot'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Existing Temporary Slots */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Existing Temporary Slots</h3>
            
            {temporarySlots.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No temporary slots created for this date
                </CardContent>
              </Card>
            ) : (
              <>
                {['day', 'night'].map(shiftType => (
                  groupedSlots[shiftType] && groupedSlots[shiftType].length > 0 && (
                    <div key={shiftType} className="space-y-3">
                      <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                        {shiftType} Shift
                      </h4>
                      <div className="grid gap-3">
                        {groupedSlots[shiftType].map(slot => (
                          <Card key={slot.id} className="border-amber-200 bg-amber-50/30">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="text-xs bg-amber-100">
                                    Temporary
                                  </Badge>
                                  <div>
                                    <div className="font-medium">{slot.role_type}</div>
                                    <div className="text-sm text-muted-foreground">
                                      Slot {slot.slot_number} • ₹{slot.pay_rate}/day
                                    </div>
                                  </div>
                                  {slot.assigned_guard_id && (
                                    <Badge variant="secondary">
                                      Guard Assigned
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    disabled={!!slot.assigned_guard_id}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemporarySlotsManagementDialog;
