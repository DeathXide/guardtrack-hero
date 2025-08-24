import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building, Edit, Trash, User, Plus, X } from 'lucide-react';
import { Site, StaffingSlot } from '@/types';
import { users, sites, addSite, updateSiteLocal, deleteSiteLocal, formatCurrency } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const SITE_TYPES = [
  'Real Estate / Construction',
  'Industrial Unit',
  'Corporate Office',
  'Automobile Showroom / Service',
  'Café / Restaurant',
  'Cinema / Theatre',
  'Residential',
  'Farmhouse',
  'School',
  'Pharmacy',
  'Preschool'
];

const ROLES = ['Security Guard', 'Supervisor', 'Housekeeping'] as const;
const GST_TYPES = ['GST', 'NGST', 'RCM', 'PERSONAL'] as const;

const SitesEnhanced = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteList, setSiteList] = useState(sites);
  const { toast } = useToast();
  
  // Form state
  const initialFormState = {
    id: '',
    name: '',
    organizationName: '',
    gstNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    gstType: 'GST' as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
    siteType: '',
    
    staffingSlots: [] as StaffingSlot[]
  };
  
  const [newSite, setNewSite] = useState(initialFormState);

  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setNewSite({
      ...newSite,
      [field]: value
    });
  };

  // Handle staffing slots
  const addStaffingSlot = () => {
    const newSlot: StaffingSlot = {
      id: Date.now().toString(),
      role: 'Security Guard',
      daySlots: 0,
      nightSlots: 0,
      budgetPerSlot: 0,
      rateType: 'monthly'
    };
    setNewSite({
      ...newSite,
      staffingSlots: [...newSite.staffingSlots, newSlot]
    });
  };

  const updateStaffingSlot = (index: number, field: keyof StaffingSlot, value: any) => {
    const updatedSlots = [...newSite.staffingSlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setNewSite({
      ...newSite,
      staffingSlots: updatedSlots
    });
  };

  const removeStaffingSlot = (index: number) => {
    setNewSite({
      ...newSite,
      staffingSlots: newSite.staffingSlots.filter((_, i) => i !== index)
    });
  };

  // Open edit dialog
  const handleEditSite = (site: Site) => {
    setNewSite({
      id: site.id,
      name: site.name,
      organizationName: site.organizationName || '',
      gstNumber: site.gstNumber || '',
      addressLine1: site.addressLine1 || '',
      addressLine2: site.addressLine2 || '',
      addressLine3: site.addressLine3 || '',
      gstType: (site.gstType || 'GST') as 'GST' | 'NGST' | 'RCM' | 'PERSONAL',
      siteType: site.siteType || '',
      
      staffingSlots: site.staffingSlots || []
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (siteId: string) => {
    setSelectedSiteId(siteId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedSiteId) {
      const success = deleteSiteLocal(selectedSiteId);
      if (success) {
        setSiteList([...sites]);
        toast({
          title: "Site Deleted",
          description: "The site has been successfully removed",
        });
      }
      setDeleteDialogOpen(false);
      setSelectedSiteId(null);
    }
  };


  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewSite(initialFormState);
  };

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (!newSite.name || !newSite.organizationName || !newSite.addressLine1) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields: Site Name, Organization Name, and Address Line 1",
        variant: "destructive"
      });
      return;
    }

    if (newSite.staffingSlots.length === 0) {
      toast({
        title: "Missing Staffing Requirements",
        description: "Please add at least one staffing role to create the site",
        variant: "destructive"
      });
      return;
    }

    const siteData = {
      name: newSite.name,
      organizationName: newSite.organizationName,
      gstNumber: newSite.gstNumber,
      addressLine1: newSite.addressLine1,
      addressLine2: newSite.addressLine2,
      addressLine3: newSite.addressLine3,
      gstType: newSite.gstType,
      siteType: newSite.siteType,
      
      staffingSlots: newSite.staffingSlots,
      // Legacy compatibility
      location: `${newSite.addressLine1}${newSite.addressLine2 ? ', ' + newSite.addressLine2 : ''}${newSite.addressLine3 ? ', ' + newSite.addressLine3 : ''}`,
      daySlots: newSite.staffingSlots.reduce((sum, slot) => sum + slot.daySlots, 0),
      nightSlots: newSite.staffingSlots.reduce((sum, slot) => sum + slot.nightSlots, 0),
      payRate: newSite.staffingSlots.reduce((sum, slot) => sum + (slot.budgetPerSlot * (slot.daySlots + slot.nightSlots)), 0)
    };

    if (isEditMode) {
      const updated = updateSiteLocal(newSite.id, siteData);
      if (updated) {
        setSiteList([...sites]);
        toast({
          title: "Site Updated",
          description: `${newSite.name} has been successfully updated`,
        });
        handleDialogClose();
      }
    } else {
      const created = addSite(siteData);
      setSiteList([...sites]);
      toast({
        title: "Site Added",
        description: `${newSite.name} has been successfully added`,
      });
      handleDialogClose();
    }
  };
  
  // Filter sites based on search term
  const filteredSites = siteList.filter(site => 
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (site.organizationName && site.organizationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (site.location && site.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  const getTotalSlots = (site: Site) => {
    if (site.staffingSlots && site.staffingSlots.length > 0) {
      return site.staffingSlots.reduce((sum, slot) => sum + slot.daySlots + slot.nightSlots, 0);
    }
    return (site.daySlots || 0) + (site.nightSlots || 0);
  };

  const getTotalBudget = (site: Site) => {
    if (site.staffingSlots && site.staffingSlots.length > 0) {
      return site.staffingSlots.reduce((sum, slot) => sum + (slot.budgetPerSlot * (slot.daySlots + slot.nightSlots)), 0);
    }
    return site.payRate || 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sites Management</h2>
          <p className="text-muted-foreground">
            Manage security locations with detailed organization and staffing information
          </p>
        </div>
        
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <Building className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sites..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSites.length === 0 ? (
          <p className="col-span-full text-center py-10 text-muted-foreground">
            No sites found. Try a different search term or add a new site.
          </p>
        ) : (
          filteredSites.map(site => (
            <Card key={site.id} className="overflow-hidden border border-border/60">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditSite(site)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteClick(site.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{site.organizationName || 'Organization'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {site.addressLine1 || site.location}
                    {site.addressLine2 && <><br />{site.addressLine2}</>}
                    {site.addressLine3 && <><br />{site.addressLine3}</>}
                  </div>
                  
                  
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                      {getTotalSlots(site)} Total Slots
                    </Badge>
                    
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Total Budget:</span>
                      <span className="font-medium ml-2">{formatCurrency(getTotalBudget(site))}</span>
                    </div>
                    
                    {site.siteType && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium ml-2">{site.siteType}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {isEditMode ? 'Edit Site' : 'Create New Site'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {isEditMode 
                ? 'Update site details and staffing requirements' 
                : 'Fill in the site information and staffing requirements to get started'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-8 py-6">
              {/* Step 1: Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold">Basic Information</h3>
                </div>
                
                <div className="ml-11 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="site-name" className="text-sm font-medium">
                        Site Name <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="site-name" 
                        placeholder="e.g., Downtown Office Complex" 
                        value={newSite.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization-name" className="text-sm font-medium">
                        Organization Name <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="organization-name" 
                        placeholder="e.g., ABC Corporation" 
                        value={newSite.organizationName}
                        onChange={e => handleInputChange('organizationName', e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gst-number" className="text-sm font-medium">
                        GST Number
                      </Label>
                      <Input 
                        id="gst-number" 
                        placeholder="e.g., 22ABCDE1234F1Z5" 
                        value={newSite.gstNumber}
                        onChange={e => handleInputChange('gstNumber', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gst-type" className="text-sm font-medium">
                        GST Type
                      </Label>
                      <Select value={newSite.gstType} onValueChange={value => handleInputChange('gstType', value)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select GST type" />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold">Address Details</h3>
                </div>
                
                <div className="ml-11 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address-line-1" className="text-sm font-medium">
                      Address Line 1 <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="address-line-1" 
                      placeholder="Building/House number, Street name" 
                      value={newSite.addressLine1}
                      onChange={e => handleInputChange('addressLine1', e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address-line-2" className="text-sm font-medium">
                        Address Line 2
                      </Label>
                      <Input 
                        id="address-line-2" 
                        placeholder="Area, Locality" 
                        value={newSite.addressLine2}
                        onChange={e => handleInputChange('addressLine2', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-line-3" className="text-sm font-medium">
                        Address Line 3
                      </Label>
                      <Input 
                        id="address-line-3" 
                        placeholder="City, State, PIN code" 
                        value={newSite.addressLine3}
                        onChange={e => handleInputChange('addressLine3', e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Site Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold">Site Category</h3>
                </div>
                
                <div className="ml-11">
                  <div className="space-y-2">
                    <Label htmlFor="site-type" className="text-sm font-medium">
                      Site Type
                    </Label>
                    <Select value={newSite.siteType} onValueChange={value => handleInputChange('siteType', value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose the type of site" />
                      </SelectTrigger>
                      <SelectContent>
                        {SITE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Step 4: Staffing Requirements */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <h3 className="text-xl font-semibold">Staffing Requirements</h3>
                  <div className="flex-1"></div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addStaffingSlot}
                    className="ml-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </div>
                
                <div className="ml-11 space-y-4">
                  {newSite.staffingSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-lg bg-muted/20">
                      <div className="max-w-sm mx-auto">
                        <h4 className="font-medium mb-2">No staffing roles added yet</h4>
                        <p className="text-sm mb-4">Add at least one role to define your staffing requirements</p>
                        <Button type="button" variant="outline" onClick={addStaffingSlot}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Role
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newSite.staffingSlots.map((slot, index) => (
                        <div key={slot.id} className="border rounded-lg p-4 space-y-4 bg-card">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-lg">Role #{index + 1}</h4>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeStaffingSlot(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                          
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-2">
                               <Label className="text-sm font-medium">Role Type</Label>
                               <Select 
                                 value={slot.role} 
                                 onValueChange={value => updateStaffingSlot(index, 'role', value)}
                               >
                                 <SelectTrigger className="h-11">
                                   <SelectValue placeholder="Select role" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {ROLES.map(role => (
                                     <SelectItem key={role} value={role}>{role}</SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </div>
                             <div className="space-y-2">
                               <Label className="text-sm font-medium">Billing Type</Label>
                               <Select 
                                 value={slot.rateType} 
                                 onValueChange={value => updateStaffingSlot(index, 'rateType', value)}
                               >
                                 <SelectTrigger className="h-11">
                                   <SelectValue placeholder="Select billing type" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="shift">Per Shift</SelectItem>
                                   <SelectItem value="monthly">Monthly</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>
                             <div className="space-y-2">
                               <Label className="text-sm font-medium">
                                 {slot.rateType === 'monthly' ? 'Monthly Rate (₹)' : 'Rate per Slot (₹)'}
                               </Label>
                               <Input 
                                 type="number" 
                                 min="0" 
                                 placeholder={slot.rateType === 'monthly' ? 'e.g., 25000' : 'e.g., 1500'}
                                 value={slot.budgetPerSlot}
                                 onChange={e => updateStaffingSlot(index, 'budgetPerSlot', parseInt(e.target.value) || 0)}
                                 className="h-11"
                               />
                             </div>
                           </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Day Slots</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="Number of day shifts"
                                value={slot.daySlots}
                                onChange={e => updateStaffingSlot(index, 'daySlots', parseInt(e.target.value) || 0)}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Night Slots</Label>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="Number of night shifts"
                                value={slot.nightSlots}
                                onChange={e => updateStaffingSlot(index, 'nightSlots', parseInt(e.target.value) || 0)}
                                className="h-11"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t bg-background">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDialogClose} className="flex-1 md:flex-none">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 md:flex-none">
                {isEditMode ? 'Save Changes' : 'Create Site'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the site and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SitesEnhanced;