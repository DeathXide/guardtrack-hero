import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { sitesApi, CreateSiteData, UpdateSiteData, SiteDB, StaffingRequirementDB } from "@/lib/sitesApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyApi } from "@/lib/companyApi";
import { createUtilityCharge } from "@/lib/utilityChargesApi";
import { CreateUtilityChargeData } from "@/types/utility";
import SitesTable from '@/components/sites/SitesTable';
import UtilityChargesFormSection from '@/components/sites/UtilityChargesFormSection';
import { Card } from "@/components/ui/card";

const GST_TYPES = ['GST', 'NGST', 'RCM', 'PERSONAL'] as const;
const SITE_CATEGORIES = [
  'Office Building', 
  'Residential Complex', 
  'Hospital', 
  'School/College', 
  'Mall/Shopping Center', 
  'Industrial Site',
  'Hotel',
  'Government Building',
  'Other'
];
const ROLE_TYPES = [
  'Security Guard', 
  'Supervisor', 
  'Housekeeping',
  'Receptionist',
  'Maintenance',
  'Office Boy',
  'Other'
];

interface SiteWithStaffing extends SiteDB {
  staffing_requirements: StaffingRequirementDB[];
}

const initialFormState: Omit<CreateSiteData, 'staffing_requirements'> & { 
  staffing_requirements: CreateSiteData['staffing_requirements'];
  id?: string;
} = {
  site_name: "",
  organization_name: "",
  gst_number: "",
  gst_type: "GST",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  site_category: "",
  personal_billing_name: "",
  status: "active",
  staffing_requirements: []
};

const initialStaffingSlot = {
  role_type: "",
  budget_per_slot: 0,
  day_slots: 0,
  night_slots: 0,
  description: ""
};

export default function SitesNew() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [temporaryUtilityCharges, setTemporaryUtilityCharges] = useState<Omit<CreateUtilityChargeData, 'site_id'>[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company settings to get personal billing names
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companyApi.getCompanySettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: sitesApi.createSite,
    onSuccess: async (newSite) => {
      // Create utility charges if any exist
      if (temporaryUtilityCharges.length > 0) {
        try {
          await Promise.all(
            temporaryUtilityCharges.map(utilityData =>
              createUtilityCharge({ ...utilityData, site_id: newSite.id })
            )
          );
        } catch (error) {
          console.error('Error creating utility charges:', error);
          toast({
            title: "Warning",
            description: "Site created but some utility charges failed to save.",
            variant: "destructive",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['utility-charges'] });
      toast({
        title: "Success",
        description: "Site created successfully!",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create site: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: sitesApi.updateSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Success",
        description: "Site updated successfully!",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update site: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors.has(field)) {
      setValidationErrors(prev => new Set([...prev].filter(error => error !== field)));
    }
  };

  const addStaffingSlot = () => {
    setFormData(prev => ({
      ...prev,
      staffing_requirements: [...prev.staffing_requirements, { ...initialStaffingSlot }]
    }));
  };

  const updateStaffingSlot = (index: number, field: keyof typeof initialStaffingSlot, value: any) => {
    setFormData(prev => ({
      ...prev,
      staffing_requirements: prev.staffing_requirements.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const removeStaffingSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      staffing_requirements: prev.staffing_requirements.filter((_, i) => i !== index)
    }));
  };

  const handleEditSite = (site: SiteWithStaffing) => {
    setFormData({
      id: site.id,
      site_name: site.site_name,
      organization_name: site.organization_name,
      gst_number: site.gst_number,
      gst_type: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
      address_line1: site.address_line1 || "",
      address_line2: site.address_line2 || "",
      address_line3: site.address_line3 || "",
      site_category: site.site_category,
      personal_billing_name: site.personal_billing_name || "",
      status: (site.status || "active") as 'active' | 'inactive' | 'temp',
      staffing_requirements: site.staffing_requirements.map(req => ({
        role_type: req.role_type,
        budget_per_slot: req.budget_per_slot,
        day_slots: req.day_slots,
        night_slots: req.night_slots,
        description: req.description || ""
      }))
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setFormData(initialFormState);
    setValidationErrors(new Set());
    setTemporaryUtilityCharges([]);
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors = new Set<string>();
    
    if (!formData.site_name.trim()) errors.add("site_name");
    if (!formData.organization_name.trim()) errors.add("organization_name");
    if (!formData.site_category) errors.add("site_category");

    if (errors.size > 0) {
      setValidationErrors(errors);
      return;
    }

    const submitData = {
      ...formData,
      staffing_requirements: formData.staffing_requirements.filter(req => req.role_type)
    };

    if (isEditMode && formData.id) {
      updateSiteMutation.mutate({ ...submitData, id: formData.id } as UpdateSiteData);
    } else {
      createSiteMutation.mutate(submitData);
    }
  };

  // Site handling functions
  const handleCreateSite = () => {
    setIsEditMode(false);
    setFormData(initialFormState);
    setIsDialogOpen(true);
  };

  const handleEditSiteFromTable = (site: SiteWithStaffing) => {
    handleEditSite(site);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sites Table Component */}
      <SitesTable 
        onCreateSite={handleCreateSite}
        onEditSite={handleEditSiteFromTable}
      />

      {/* Site Creation/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Site" : "Add New Site"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update site information and staffing requirements" : "Enter site details and staffing requirements"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name *</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange("site_name", e.target.value)}
                  placeholder="Enter site name"
                  className={validationErrors.has("site_name") ? "border-destructive" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name *</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => handleInputChange("organization_name", e.target.value)}
                  placeholder="Enter organization name"
                  className={validationErrors.has("organization_name") ? "border-destructive" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => handleInputChange("gst_number", e.target.value)}
                  placeholder="Enter GST number"
                  className={validationErrors.has("gst_number") ? "border-destructive" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_type">GST Type</Label>
                <Select
                  value={formData.gst_type}
                  onValueChange={(value) => handleInputChange("gst_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.gst_type === 'PERSONAL' && (
                <div className="space-y-2">
                  <Label htmlFor="personal_billing_name">Personal Billing Name</Label>
                  <Select
                    value={formData.personal_billing_name}
                    onValueChange={(value) => handleInputChange("personal_billing_name", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personal billing name" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySettings?.personal_billing_names?.map((name, index) => (
                        <SelectItem key={index} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="site_category">Site Category *</Label>
                <Select
                  value={formData.site_category}
                  onValueChange={(value) => handleInputChange("site_category", value)}
                >
                  <SelectTrigger className={validationErrors.has("site_category") ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select site category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Site Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="temp">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleInputChange("address_line1", e.target.value)}
                  placeholder="Street address, building name, floor"
                  className={validationErrors.has("address_line1") ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleInputChange("address_line2", e.target.value)}
                  placeholder="Area, locality, neighborhood"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line3">Address Line 3</Label>
                <Input
                  id="address_line3"
                  value={formData.address_line3}
                  onChange={(e) => handleInputChange("address_line3", e.target.value)}
                  placeholder="City, state, pincode"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Staffing Requirements</h3>
                  <p className="text-sm text-muted-foreground">Define the roles and staffing needs for this site</p>
                </div>
                <Button onClick={addStaffingSlot} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </div>

              {formData.staffing_requirements.map((slot, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Role Type</Label>
                      <Select
                        value={slot.role_type}
                        onValueChange={(value) => updateStaffingSlot(index, "role_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_TYPES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Budget per Slot (₹)</Label>
                      <Input
                        type="number"
                        value={slot.budget_per_slot}
                        onChange={(e) => updateStaffingSlot(index, "budget_per_slot", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Day Slots</Label>
                      <Input
                        type="number"
                        value={slot.day_slots}
                        onChange={(e) => updateStaffingSlot(index, "day_slots", Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Night Slots</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={slot.night_slots}
                          onChange={(e) => updateStaffingSlot(index, "night_slots", Number(e.target.value))}
                          placeholder="0"
                        />
                        <Button 
                          onClick={() => removeStaffingSlot(index)} 
                          variant="outline" 
                          size="sm"
                          className="px-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label>Service Description (Optional)</Label>
                    <Textarea
                      value={slot.description || ""}
                      onChange={(e) => updateStaffingSlot(index, "description", e.target.value)}
                      placeholder="Describe the service scope for this role (will appear on invoices)"
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Utility Charges - visible in both create and edit */}
            <div className="pt-2">
              <UtilityChargesFormSection 
                siteId={isEditMode ? formData.id || null : null}
                siteName={formData.site_name || 'New Site'}
                temporaryCharges={isEditMode ? undefined : temporaryUtilityCharges}
                onTemporaryChargesChange={isEditMode ? undefined : setTemporaryUtilityCharges}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createSiteMutation.isPending || updateSiteMutation.isPending}>
              {isEditMode ? "Update Site" : "Create Site"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}