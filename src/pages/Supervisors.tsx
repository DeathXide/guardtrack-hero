
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Edit, Trash, Mail, Phone } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { User as UserType } from '@/types';
import { users } from '@/lib/data';

const Supervisors = () => {
  const [supervisorList, setSupervisorList] = useState<UserType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  // Initialize form state
  const initialFormState = {
    id: '',
    name: '',
    email: '',
    role: 'supervisor' as const,
    avatar: ''
  };
  
  const [newSupervisor, setNewSupervisor] = useState<Partial<UserType>>(initialFormState);

  // Load supervisors on component mount
  useEffect(() => {
    // Filter users to get only supervisors
    const supervisors = users.filter(user => user.role === 'supervisor');
    setSupervisorList(supervisors);
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewSupervisor({
      ...newSupervisor,
      [id]: value
    });
  };

  // Open edit dialog
  const handleEditSupervisor = (supervisor: UserType) => {
    setNewSupervisor({
      id: supervisor.id,
      name: supervisor.name,
      email: supervisor.email,
      role: 'supervisor',
      avatar: supervisor.avatar || ''
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (supervisorId: string) => {
    setSelectedSupervisorId(supervisorId);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedSupervisorId) {
      // Remove supervisor from list
      setSupervisorList(supervisorList.filter(s => s.id !== selectedSupervisorId));
      
      toast({
        title: "Supervisor Removed",
        description: "The supervisor has been successfully removed",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedSupervisorId(null);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewSupervisor(initialFormState);
  };

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (!newSupervisor.name || !newSupervisor.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (isEditMode) {
      // Update existing supervisor
      setSupervisorList(supervisorList.map(supervisor => 
        supervisor.id === newSupervisor.id ? { ...supervisor, ...newSupervisor, role: 'supervisor' } as UserType : supervisor
      ));
      
      toast({
        title: "Supervisor Updated",
        description: `${newSupervisor.name} has been successfully updated`,
      });
    } else {
      // Create new supervisor
      const newSupervisorObject: UserType = {
        id: `supervisor-${Date.now()}`,
        name: newSupervisor.name!,
        email: newSupervisor.email!,
        role: 'supervisor',
        avatar: newSupervisor.avatar
      };

      // Add to list
      setSupervisorList([...supervisorList, newSupervisorObject]);
      
      toast({
        title: "Supervisor Added",
        description: `${newSupervisor.name} has been successfully added as a supervisor`,
      });
    }
    
    // Close dialog and reset form
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewSupervisor(initialFormState);
  };
  
  // Filter supervisors based on search term
  const filteredSupervisors = supervisorList.filter(supervisor => 
    supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supervisor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If user is not admin, show access denied message
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">
              Only administrators can manage supervisors. Please contact an administrator for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supervisors</h2>
          <p className="text-muted-foreground">
            Manage site supervisors and their access
          </p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <User className="h-4 w-4 mr-2" />
          Add Supervisor
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search supervisors..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSupervisors.length === 0 ? (
          <p className="col-span-full text-center py-10 text-muted-foreground">
            No supervisors found. Try a different search term or add a new supervisor.
          </p>
        ) : (
          filteredSupervisors.map(supervisor => (
            <Card key={supervisor.id} className="overflow-hidden border border-border/60">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="flex items-center">
                    {supervisor.avatar ? (
                      <img 
                        src={supervisor.avatar} 
                        alt={supervisor.name} 
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <User className="h-6 w-6 mr-2 text-primary" />
                    )}
                    {supervisor.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditSupervisor(supervisor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteClick(supervisor.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    Supervisor
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{supervisor.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Add/Edit Supervisor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Supervisor' : 'Add New Supervisor'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update supervisor details' 
                : 'Create a new supervisor account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                placeholder="Enter supervisor name" 
                value={newSupervisor.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="Enter supervisor email" 
                value={newSupervisor.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL (optional)</Label>
              <Input 
                id="avatar" 
                placeholder="https://example.com/avatar.jpg" 
                value={newSupervisor.avatar}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSubmit}>{isEditMode ? 'Save Changes' : 'Add Supervisor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this supervisor and remove their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Supervisors;
