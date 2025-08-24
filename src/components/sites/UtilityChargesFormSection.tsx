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
}

const UtilityChargesFormSection: React.FC<UtilityChargesFormSectionProps> = ({ siteId, siteName }) => {
  const [isAddingUtility, setIsAddingUtility] = useState(false);
  const [editingUtility, setEditingUtility] = useState<SiteUtilityCharge | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialFormState = {
    utility_type: 'water' as const,
    utility_name: '',
    monthly_amount: 0,
    billing_frequency: 'monthly' as const,
    description: '',
  };

  const [formData, setFormData] = useState<Omit<CreateUtilityChargeData, 'site_id'>>(initialFormState);

  // Query for fetching utility charges (only if siteId exists)
  const { data: utilityCharges = [], isLoading } = useQuery({
    queryKey: ['utility-charges', siteId],
    queryFn: () => siteId ? getUtilityChargesForSite(siteId) : Promise.resolve([]),
    enabled: !!siteId,
  });

  // Create utility charge mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUtilityChargeData) => createUtilityCharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-charges', siteId] });
      toast({
        title: "Utility Charge Added",
        description: `${formData.utility_name} has been successfully added`,
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
        description: `${formData.utility_name} has been successfully updated`,
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
      [field]: field === 'monthly_amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEdit = (utility: SiteUtilityCharge) => {
    setEditingUtility(utility);
    setFormData({
      utility_type: utility.utility_type,
      utility_name: utility.utility_name,
      monthly_amount: utility.monthly_amount,
      billing_frequency: utility.billing_frequency,
      description: utility.description || '',
    });
    setIsAddingUtility(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleFormReset = () => {
    setIsAddingUtility(false);
    setEditingUtility(null);
    setFormData(initialFormState);
  };

  const handleSubmit = () => {
    if (!siteId) {
      toast({
        title: "Site Required",
        description: "Please save the site first before adding utility charges",
        variant: "destructive"
      });
      return;
    }

    if (!formData.utility_name || formData.monthly_amount <= 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

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
            disabled={!siteId}
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
                  <div className={`p-2 rounded-lg ${getUtilityColor(utility.utility_type)}`}>
                    {getUtilityIcon(utility.utility_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{utility.utility_name}</span>
                      <Badge variant="outline" className={getUtilityColor(utility.utility_type)}>
                        {utility.utility_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(utility.monthly_amount)} / {utility.billing_frequency}
                    </div>
                    {utility.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {utility.description}
                      </div>
                    )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="utility-type">Utility Type</Label>
                  <Select
                    value={formData.utility_type}
                    onValueChange={(value) => handleInputChange('utility_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select utility type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utility-name">Utility Name</Label>
                  <Input
                    id="utility-name"
                    placeholder="e.g., Water Bill, Electricity Bill"
                    value={formData.utility_name}
                    onChange={(e) => handleInputChange('utility_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly-amount">Monthly Amount (₹)</Label>
                  <Input
                    id="monthly-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.monthly_amount}
                    onChange={(e) => handleInputChange('monthly_amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-frequency">Billing Frequency</Label>
                  <Select
                    value={formData.billing_frequency}
                    onValueChange={(value) => handleInputChange('billing_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about this utility charge"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
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
