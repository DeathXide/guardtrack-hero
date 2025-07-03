import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building, Edit, Trash, User, IndianRupee, Plus, X } from 'lucide-react';
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
    supervisorId: '',
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
      budgetPerSlot: 0
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
      supervisorId: site.supervisorId,
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
      supervisorId: newSite.supervisorId || '',
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

  const getSupervisorName = (supervisorId: string) => {
    if (!supervisorId) return 'Unassigned';
    const supervisor = users.find(user => user.id === supervisorId);
    return supervisor ? supervisor.name : 'Unassigned';
  };

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
                  
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Supervisor:</span>
                    <span className="font-medium ml-2">{getSupervisorName(site.supervisorId)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                      {getTotalSlots(site)} Total Slots
                    </Badge>
                    
                    <div className="flex items-center text-sm">
                      <IndianRupee className="h-4 w-4 mr-2 text-muted-foreground" />
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Site' : 'Add New Site'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update site details, organization information, and staffing requirements' 
                : 'Create a new security site with organization details and staffing requirements'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="site-name" 
                    placeholder="Enter site name" 
                    value={newSite.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-name">Organization Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="organization-name" 
                    placeholder="Enter organization name" 
                    value={newSite.organizationName}
                    onChange={e => handleInputChange('organizationName', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gst-number">GST Number</Label>
                  <Input 
                    id="gst-number" 
                    placeholder="Enter GST number" 
                    value={newSite.gstNumber}
                    onChange={e => handleInputChange('gstNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst-type">GST Type</Label>
                  <Select value={newSite.gstType} onValueChange={value => handleInputChange('gstType', value)}>
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
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="address-line-1">Address Line 1 <span className="text-destructive">*</span></Label>
                <Input 
                  id="address-line-1" 
                  placeholder="Enter address line 1" 
                  value={newSite.addressLine1}
                  onChange={e => handleInputChange('addressLine1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-line-2">Address Line 2</Label>
                <Input 
                  id="address-line-2" 
                  placeholder="Enter address line 2" 
                  value={newSite.addressLine2}
                  onChange={e => handleInputChange('addressLine2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address-line-3">Address Line 3</Label>
                <Input 
                  id="address-line-3" 
                  placeholder="Enter address line 3" 
                  value={newSite.addressLine3}
                  onChange={e => handleInputChange('addressLine3', e.target.value)}
                />
              </div>
            </div>

            {/* Site Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Site Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-type">Site Type</Label>
                  <Select value={newSite.siteType} onValueChange={value => handleInputChange('siteType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site type" />
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

            {/* Staffing Slots */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Staffing Requirements</h3>
                <Button type="button" variant="outline" size="sm" onClick={addStaffingSlot}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </div>
              
              {newSite.staffingSlots.map((slot, index) => (
                <div key={slot.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Role #{index + 1}</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeStaffingSlot(index)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select 
                        value={slot.role} 
                        onValueChange={value => updateStaffingSlot(index, 'role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget per Slot (₹)</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        value={slot.budgetPerSlot}
                        onChange={e => updateStaffingSlot(index, 'budgetPerSlot', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day Slots</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        value={slot.daySlots}
                        onChange={e => updateStaffingSlot(index, 'daySlots', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Night Slots</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        value={slot.nightSlots}
                        onChange={e => updateStaffingSlot(index, 'nightSlots', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {newSite.staffingSlots.length === 0 && (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  No staffing roles added yet. Click "Add Role" to get started.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? 'Save Changes' : 'Add Site'}
            </Button>
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