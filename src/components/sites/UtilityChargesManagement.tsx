import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Zap, Droplets, Wrench, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUtilityChargesForSite, createUtilityCharge, updateUtilityCharge, deleteUtilityCharge } from '@/lib/utilityChargesApi';
import { SiteUtilityCharge, CreateUtilityChargeData } from '@/types/utility';

interface UtilityChargesManagementProps {
  siteId: string;
  siteName: string;
}

const UtilityChargesManagement: React.FC<UtilityChargesManagementProps> = ({ siteId, siteName }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUtility, setSelectedUtility] = useState<SiteUtilityCharge | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialFormState = {
    description: '',
    amount: 0,
  };

  const [formData, setFormData] = useState<Omit<CreateUtilityChargeData, 'site_id'>>(initialFormState);

  // Query for fetching utility charges
  const { data: utilityCharges = [], isLoading } = useQuery({
    queryKey: ['utility-charges', siteId],
    queryFn: () => getUtilityChargesForSite(siteId),
  });

  // Create utility charge mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUtilityChargeData) => createUtilityCharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-charges', siteId] });
      toast({
        title: "Utility Charge Added",
        description: `${formData.description} has been successfully added`,
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add utility charge: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update utility charge mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUtilityChargeData> }) => 
      updateUtilityCharge(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-charges', siteId] });
      toast({
        title: "Utility Charge Updated",
        description: `${formData.description} has been successfully updated`,
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update utility charge: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete utility charge mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUtilityCharge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-charges', siteId] });
      toast({
        title: "Utility Charge Removed",
        description: "The utility charge has been successfully removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to remove utility charge: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case 'water': return <Droplets className="h-4 w-4" />;
      case 'electricity': return <Zap className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getUtilityColor = (type: string) => {
    switch (type) {
      case 'water': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'electricity': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'maintenance': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEdit = (utility: SiteUtilityCharge) => {
    setSelectedUtility(utility);
    setFormData({
      description: utility.description,
      amount: utility.amount,
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedUtility(null);
    setFormData(initialFormState);
  };

  const handleSubmit = () => {
    if (!formData.description || formData.amount <= 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in description and amount",
        variant: "destructive"
      });
      return;
    }

    if (isEditMode && selectedUtility) {
      updateMutation.mutate({ 
        id: selectedUtility.id, 
        data: formData 
      });
    } else {
      createMutation.mutate({
        site_id: siteId,
        ...formData
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Utility Charges</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage recurring utility charges for {siteName}
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Utility
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading utility charges...</div>
        ) : utilityCharges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No utility charges configured</p>
            <p className="text-sm">Add utility charges to include them in invoices</p>
          </div>
        ) : (
          <div className="space-y-3">
            {utilityCharges.map((utility) => (
              <div key={utility.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-500 border-blue-500/20`}>
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{utility.description}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(utility.amount)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(utility)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(utility.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Utility Charge' : 'Add Utility Charge'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Water Bill, Electricity Bill, Maintenance Charges"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) 
                ? 'Saving...' 
                : isEditMode ? 'Save Changes' : 'Add Utility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UtilityChargesManagement;