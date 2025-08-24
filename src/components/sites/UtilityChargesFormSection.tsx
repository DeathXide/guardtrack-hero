import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Zap, Droplets, Wrench, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUtilityChargesForSite, createUtilityCharge, updateUtilityCharge, deleteUtilityCharge } from '@/lib/utilityChargesApi';
import { SiteUtilityCharge, CreateUtilityChargeData } from '@/types/utility';

interface UtilityChargesFormSectionProps {
  siteId: string | null;
  siteName: string;
  temporaryCharges?: Omit<CreateUtilityChargeData, 'site_id'>[];
  onTemporaryChargesChange?: (charges: Omit<CreateUtilityChargeData, 'site_id'>[]) => void;
}

const UtilityChargesFormSection: React.FC<UtilityChargesFormSectionProps> = ({ 
  siteId, 
  siteName, 
  temporaryCharges = [], 
  onTemporaryChargesChange 
}) => {
  const [isAddingUtility, setIsAddingUtility] = useState(false);
  const [editingUtility, setEditingUtility] = useState<SiteUtilityCharge | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialFormState = {
    description: '',
    amount: 0,
  };

  const [formData, setFormData] = useState<Omit<CreateUtilityChargeData, 'site_id'>>(initialFormState);

  // Query for fetching utility charges (only if siteId exists)
  const { data: utilityCharges = [], isLoading } = useQuery({
    queryKey: ['utility-charges', siteId],
    queryFn: () => siteId ? getUtilityChargesForSite(siteId) : Promise.resolve([]),
    enabled: !!siteId,
  });

  // Use either existing utility charges or temporary charges for creation mode
  const displayCharges = siteId 
    ? utilityCharges 
    : temporaryCharges.map((charge, index) => ({
        ...charge,
        id: `temp-${index}`,
        site_id: 'temp',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

  // Create utility charge mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUtilityChargeData) => createUtilityCharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-charges', siteId] });
      toast({
        title: "Utility Charge Added",
        description: `${formData.description} has been successfully added`,
      });
      handleFormReset();
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
      handleFormReset();
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

  const getUtilityIcon = () => {
    return <Package className="h-4 w-4" />;
  };

  const getUtilityColor = () => {
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEdit = (utility: SiteUtilityCharge) => {
    if (!siteId && onTemporaryChargesChange) {
      // Handle temporary charge editing
      const index = temporaryCharges.findIndex((_, i) => `temp-${i}` === utility.id);
      if (index !== -1) {
        setEditingUtility(utility);
        setFormData({
          description: utility.description,
          amount: utility.amount,
        });
        setIsAddingUtility(true);
      }
    } else {
      setEditingUtility(utility);
      setFormData({
        description: utility.description,
        amount: utility.amount,
      });
      setIsAddingUtility(true);
    }
  };

  const handleDelete = (utilityId: string) => {
    if (!siteId && onTemporaryChargesChange) {
      // Handle temporary charge deletion
      const index = temporaryCharges.findIndex((_, i) => `temp-${i}` === utilityId);
      if (index !== -1) {
        const updatedCharges = temporaryCharges.filter((_, i) => i !== index);
        onTemporaryChargesChange(updatedCharges);
        toast({
          title: "Utility Charge Removed",
          description: "The temporary utility charge has been removed",
        });
      }
    } else {
      deleteMutation.mutate(utilityId);
    }
  };

  const handleFormReset = () => {
    setIsAddingUtility(false);
    setEditingUtility(null);
    setFormData(initialFormState);
  };

  const handleSubmit = () => {
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a description for the utility charge",
        variant: "destructive"
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: "Validation Error", 
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!siteId && onTemporaryChargesChange) {
      // Handle temporary charges for site creation
      if (editingUtility) {
        const index = temporaryCharges.findIndex((_, i) => `temp-${i}` === editingUtility.id);
        if (index !== -1) {
          const updatedCharges = [...temporaryCharges];
          updatedCharges[index] = formData;
          onTemporaryChargesChange(updatedCharges);
        }
      } else {
        onTemporaryChargesChange([...temporaryCharges, formData]);
      }
      
      toast({
        title: editingUtility ? "Utility Charge Updated" : "Utility Charge Added",
        description: `${formData.description} has been ${editingUtility ? 'updated' : 'added'} temporarily`,
      });
      handleFormReset();
    } else if (siteId) {
      // Handle persisted charges for existing sites
      if (editingUtility) {
        updateMutation.mutate({ 
          id: editingUtility.id, 
          data: formData 
        });
      } else {
        createMutation.mutate({
          site_id: siteId,
          ...formData
        });
      }
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
              Manage recurring utility charges for {siteName || 'this site'}
            </p>
          </div>
          <Button 
            onClick={() => setIsAddingUtility(true)} 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Utility
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Utility Charges */}
        {isLoading ? (
          <div className="text-center py-4">Loading utility charges...</div>
        ) : displayCharges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No utility charges configured</p>
            <p className="text-sm">
              {siteId 
                ? "Add utility charges to include them in invoices" 
                : "Add utility charges that will be created when the site is saved"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayCharges.map((utility) => (
              <div key={utility.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getUtilityColor()}`}>
                    {getUtilityIcon()}
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

        {/* Add/Edit Utility Form */}
        {isAddingUtility && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">
                {editingUtility ? 'Edit Utility Charge' : 'Add Utility Charge'}
              </h4>
              <Button variant="ghost" size="sm" onClick={handleFormReset}>
                Cancel
              </Button>
            </div>
            <div className="space-y-4">
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
              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  size="sm"
                >
                  {(createMutation.isPending || updateMutation.isPending) 
                    ? 'Saving...' 
                    : editingUtility ? 'Save Changes' : 'Add Utility'}
                </Button>
                <Button variant="outline" onClick={handleFormReset} size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UtilityChargesFormSection;
