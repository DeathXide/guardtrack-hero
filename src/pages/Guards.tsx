
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Plus, Search, Phone, Mail, Shield, Edit, Trash } from 'lucide-react';
import { guards } from '@/lib/data';
import { Guard } from '@/types';

const Guards = () => {
  const [guardList] = useState<Guard[]>(guards);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter guards based on search term
  const filteredGuards = guardList.filter(guard => 
    guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guard.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guard.badgeNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Guards</h2>
          <p className="text-muted-foreground">
            Manage security personnel and their details
          </p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guard
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email or badge number..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuards.length === 0 ? (
          <p className="col-span-full text-center py-10 text-muted-foreground">
            No guards found. Try a different search term or add a new guard.
          </p>
        ) : (
          filteredGuards.map(guard => (
            <Card key={guard.id} className="overflow-hidden border border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium">{guard.name}</CardTitle>
                <Badge 
                  variant={guard.status === 'active' ? 'default' : 'secondary'}
                  className={`${guard.status === 'active' ? 'bg-success/80 hover:bg-success/70' : 'bg-muted text-muted-foreground'}`}
                >
                  {guard.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Badge:</span>
                    <span className="font-medium ml-2">{guard.badgeNumber}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{guard.phone}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{guard.email}</span>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                      <Trash className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
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
            <DialogTitle>Add New Guard</DialogTitle>
            <DialogDescription>
              Create a new security guard profile with contact details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="Enter phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge">Badge Number</Label>
              <Input id="badge" placeholder="Enter badge number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select 
                id="status" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button>Add Guard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Guards;
