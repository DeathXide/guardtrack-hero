import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Edit, Trash, User, AlertTriangle } from 'lucide-react';
import { Site } from '@/types';
import { sites, users } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Sites = () => {
  const [siteList, setSiteList] = useState<Site[]>(sites);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Form state
  const initialFormState = {
    id: '',
    name: '',
    location: '',
    daySlots: 0,
    nightSlots: 0,
    supervisorId: ''
  };
  
  const [newSite, setNewSite] = useState(initialFormState);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setNewSite({
      ...newSite,
      [id === 'site-name' ? 'name' : id === 'day-slots' ? 'daySlots' : id === 'night-slots' ? 'nightSlots' : id]: 
        (id === 'day-slots' || id === 'night-slots') ? parseInt(value) || 0 : value
    });
  };

  // Open edit dialog
  const handleEditSite = (site: Site) => {
    setNewSite({
      id: site.id,
      name: site.name,
      location: site.location,
      daySlots: site.daySlots,
      nightSlots: site.nightSlots,
      supervisorId: site.supervisorId
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
      setSiteList(siteList.filter(site => site.id !== selectedSiteId));
      toast({
        title: "Site Deleted",
        description: "The site has been successfully removed",
      });
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
    // Validate form - only require name and location
    if (!newSite.name || !newSite.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields: Site Name and Location",
        variant: "destructive"
      });
      return;
    }

    if (isEditMode) {
      // Update existing site
      setSiteList(siteList.map(site => 
        site.id === newSite.id ? newSite : site
      ));
      
      toast({
        title: "Site Updated",
        description: `${newSite.name} has been successfully updated`,
      });
    } else {
      // Create new site
      const newSiteObject: Site = {
        id: `s${siteList.length + 1}`,
        name: newSite.name,
        location: newSite.location,
        supervisorId: newSite.supervisorId,
        daySlots: newSite.daySlots,
        nightSlots: newSite.nightSlots
      };

      // Add to list
      setSiteList([...siteList, newSiteObject]);
      
      // Show success message
      toast({
        title: "Site Added",
        description: `${newSite.name} has been successfully added`,
      });
    }
    
    // Close dialog and reset form
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewSite(initialFormState);
  };
  
  // Filter sites based on search term
  const filteredSites = siteList.filter(site => 
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupervisorName = (supervisorId: string) => {
    if (!supervisorId) return 'Unassigned';
    const supervisor = users.find(user => user.id === supervisorId);
    return supervisor ? supervisor.name : 'Unassigned';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sites</h2>
          <p className="text-muted-foreground">
            Manage security locations and assigned supervisors
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
                  <CardTitle>{site.name}</CardTitle>
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
                <CardDescription>{site.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Supervisor:</span>
                    <span className="font-medium ml-2">{getSupervisorName(site.supervisorId)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {site.daySlots} Day Slots
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      {site.nightSlots} Night Slots
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Site' : 'Add New Site'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update site details and assigned supervisor' 
                : 'Create a new security site with assigned slots and supervisor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name <span className="text-destructive">*</span></Label>
              <Input 
                id="site-name" 
                placeholder="Enter site name" 
                value={newSite.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
              <Input 
                id="location" 
                placeholder="Enter site location" 
                value={newSite.location}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day-slots">Day Slots</Label>
                <Input 
                  id="day-slots" 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  value={newSite.daySlots}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="night-slots">Night Slots</Label>
                <Input 
                  id="night-slots" 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  value={newSite.nightSlots}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisorId">Supervisor (Optional)</Label>
              <select 
                id="supervisorId" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newSite.supervisorId}
                onChange={handleInputChange}
              >
                <option value="">Select a supervisor (optional)</option>
                {users
                  .filter(user => user.role === 'supervisor')
                  .map(supervisor => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.name}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSubmit}>{isEditMode ? 'Save Changes' : 'Add Site'}</Button>
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

export default Sites;
