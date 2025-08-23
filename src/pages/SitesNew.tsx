import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, MapPin, Building, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { sitesApi, CreateSiteData, UpdateSiteData, SiteDB, StaffingRequirementDB } from "@/lib/sitesApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  'Other'
];

interface SiteWithStaffing extends SiteDB {
  staffing_requirements: StaffingRequirementDB[];
}

const initialFormState: Omit<CreateSiteData, 'staffing_requirements'> & { staffing_requirements: CreateSiteData['staffing_requirements'] } = {
  site_name: "",
  organization_name: "",
  gst_number: "",
  gst_type: "GST",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  site_category: "",
  staffing_requirements: []
};

const initialStaffingSlot = {
  role_type: "",
  budget_per_slot: 0,
  day_slots: 0,
  night_slots: 0
};

export default function SitesNew() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(initialFormState);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sites
  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites,
  });

  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: sitesApi.createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
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

  // Delete site mutation
  const deleteSiteMutation = useMutation({
    mutationFn: sitesApi.deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({
        title: "Success",
        description: "Site deleted successfully!",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete site: ${error.message}`,
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
      site_name: site.site_name,
      organization_name: site.organization_name,
      gst_number: site.gst_number,
      gst_type: site.gst_type as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
      address_line1: site.address_line1 || "",
      address_line2: site.address_line2 || "",
      address_line3: site.address_line3 || "",
      site_category: site.site_category,
      staffing_requirements: site.staffing_requirements.map(req => ({
        role_type: req.role_type,
        budget_per_slot: req.budget_per_slot,
        day_slots: req.day_slots,
        night_slots: req.night_slots
      }))
    });
    setSelectedSiteId(site.id);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (siteId: string) => {
    setSelectedSiteId(siteId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteSiteMutation.mutate(selectedSiteId);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedSiteId("");
    setFormData(initialFormState);
    setValidationErrors(new Set());
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors = new Set<string>();
    
    if (!formData.site_name.trim()) errors.add("site_name");
    if (!formData.organization_name.trim()) errors.add("organization_name");
    if (!formData.address_line1.trim()) errors.add("address_line1");
    if (!formData.site_category) errors.add("site_category");
    
    // GST number is required only when GST type is "GST"
    if (formData.gst_type === "GST" && !formData.gst_number.trim()) {
      errors.add("gst_number");
    }

    if (errors.size > 0) {
      setValidationErrors(errors);
      return;
    }

    const submitData = {
      ...formData,
      staffing_requirements: formData.staffing_requirements.filter(req => req.role_type)
    };

    if (isEditMode) {
      updateSiteMutation.mutate({ ...submitData, id: selectedSiteId } as UpdateSiteData);
    } else {
      createSiteMutation.mutate(submitData);
    }
  };

  const filteredSites = sites.filter(site =>
    site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.site_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalSlots = (site: SiteWithStaffing) => {
    return site.staffing_requirements.reduce((total, req) => total + req.day_slots + req.night_slots, 0);
  };

  const getTotalBudget = (site: SiteWithStaffing) => {
    return site.staffing_requirements.reduce((total, req) => 
      total + (req.budget_per_slot * (req.day_slots + req.night_slots)), 0
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading sites: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sites Management</h1>
          <p className="text-muted-foreground">Manage your security sites and staffing requirements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsEditMode(false)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
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
                  <Label htmlFor="gst_number">GST Number {formData.gst_type === "GST" ? "*" : ""}</Label>
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
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address_line1">Address Line 1 *</Label>
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
                  </Card>
                ))}
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

      <div className="flex items-center space-x-2 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => (
            <Card key={site.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      {site.site_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {site.organization_name}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSite(site)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(site.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="truncate">{site.address}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-muted-foreground" />
                    <Badge variant="secondary">{site.gst_type}</Badge>
                  </div>
                  <Badge variant="outline">{site.site_category}</Badge>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      Total Slots
                    </span>
                    <span className="font-semibold">{getTotalSlots(site)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Monthly Budget</span>
                    <span className="font-semibold text-primary">
                      ₹{getTotalBudget(site).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {site.staffing_requirements.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">Roles Required:</div>
                    <div className="flex flex-wrap gap-1">
                      {site.staffing_requirements.map((req, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {req.role_type} ({req.day_slots + req.night_slots})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredSites.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sites found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "No sites match your search criteria." : "Get started by adding your first site."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Site
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the site
              and all associated staffing requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}