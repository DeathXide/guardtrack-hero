import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

interface EditingSlot {
  id: string;
  role_type: string;
  pay_rate: string;
}

interface DeleteConfirmation {
  slotId: string;
  slotInfo: string;
  isAssigned: boolean;
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
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

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

  // Update temporary slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: ({ slotId, updateData }: { slotId: string; updateData: Partial<CreateSlotData> }) => 
      dailyAttendanceSlotsApi.updateTemporarySlot(slotId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      toast({ title: 'Temporary slot updated successfully' });
      setEditingSlot(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating temporary slot',
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
      setDeleteConfirmation(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting temporary slot',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Unassign guard mutation
  const unassignGuardMutation = useMutation({
    mutationFn: (slotId: string) => dailyAttendanceSlotsApi.unassignGuardFromSlot(slotId),
    onSuccess: (_, slotId) => {
      queryClient.invalidateQueries({ queryKey: ['daily-slots'] });
      queryClient.invalidateQueries({ queryKey: ['temporary-slots'] });
      // After unassigning, delete the slot
      deleteSlotMutation.mutate(slotId);
    },
    onError: (error: any) => {
      toast({
        title: 'Error unassigning guard',
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

  const handleEditSlot = (slot: DailyAttendanceSlot) => {
    setEditingSlot({
      id: slot.id,
      role_type: slot.role_type,
      pay_rate: slot.pay_rate?.toString() || ''
    });
  };

  const handleUpdateSlot = () => {
    if (!editingSlot?.role_type || !editingSlot?.pay_rate) {
      toast({
        title: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    updateSlotMutation.mutate({
      slotId: editingSlot.id,
      updateData: {
        role_type: editingSlot.role_type,
        pay_rate: parseFloat(editingSlot.pay_rate)
      }
    });
  };

  const handleDeleteSlot = (slot: DailyAttendanceSlot) => {
    setDeleteConfirmation({
      slotId: slot.id,
      slotInfo: `${slot.role_type} - Slot ${slot.slot_number}`,
      isAssigned: !!slot.assigned_guard_id
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.isAssigned) {
      // First unassign the guard, then delete
      unassignGuardMutation.mutate(deleteConfirmation.slotId);
    } else {
      // Delete directly
      deleteSlotMutation.mutate(deleteConfirmation.slotId);
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
                                     onClick={() => handleEditSlot(slot)}
                                   >
                                     <Edit className="h-3 w-3" />
                                   </Button>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => handleDeleteSlot(slot)}
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

      {/* Edit Slot Dialog */}
      <Dialog open={!!editingSlot} onOpenChange={() => setEditingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Temporary Slot</DialogTitle>
            <DialogDescription>
              Update the role type and pay rate for this temporary slot
            </DialogDescription>
          </DialogHeader>
          {editingSlot && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role Type</Label>
                <Select
                  value={editingSlot.role_type}
                  onValueChange={(value) => 
                    setEditingSlot(prev => prev ? { ...prev, role_type: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleTypes.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pay Rate</Label>
                <Input
                  type="number"
                  value={editingSlot.pay_rate}
                  onChange={(e) => 
                    setEditingSlot(prev => prev ? { ...prev, pay_rate: e.target.value } : null)
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateSlot}
                  disabled={updateSlotMutation.isPending}
                >
                  {updateSlotMutation.isPending ? 'Updating...' : 'Update Slot'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingSlot(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Delete
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation?.isAssigned ? (
                <>
                  This slot has a guard assigned to it. Deleting will first unassign the guard and then remove the slot.
                  <br /><br />
                  <strong>Slot:</strong> {deleteConfirmation.slotInfo}
                </>
              ) : (
                <>
                  Are you sure you want to delete this temporary slot?
                  <br /><br />
                  <strong>Slot:</strong> {deleteConfirmation?.slotInfo}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSlotMutation.isPending || unassignGuardMutation.isPending}
            >
              {(deleteSlotMutation.isPending || unassignGuardMutation.isPending) ? 'Deleting...' : 'Delete Slot'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default TemporarySlotsManagementDialog;
