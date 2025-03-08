
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, User, Edit, Trash } from 'lucide-react';
import { Site } from '@/types';
import { sites, users } from '@/lib/data';

const Sites = () => {
  const [siteList, setSiteList] = useState<Site[]>(sites);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter sites based on search term
  const filteredSites = siteList.filter(site => 
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupervisorName = (supervisorId: string) => {
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
          <Plus className="h-4 w-4 mr-2" />
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
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
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
            <DialogTitle>Add New Site</DialogTitle>
            <DialogDescription>
              Create a new security site with assigned slots and supervisor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name</Label>
              <Input id="site-name" placeholder="Enter site name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Enter site location" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day-slots">Day Slots</Label>
                <Input id="day-slots" type="number" min="0" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="night-slots">Night Slots</Label>
                <Input id="night-slots" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supervisor">Supervisor</Label>
              <select 
                id="supervisor" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a supervisor</option>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button>Add Site</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sites;
