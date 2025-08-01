import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TemporaryStaffingDialogProps {
  sites: Array<{
    id: string;
    site_name: string;
    address: string;
  }>;
  onSuccess?: () => void;
}

export const TemporaryStaffingDialog: React.FC<TemporaryStaffingDialogProps> = ({ sites, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [requestDate, setRequestDate] = useState<Date>();
  const [dayTempSlots, setDayTempSlots] = useState<number>(0);
  const [nightTempSlots, setNightTempSlots] = useState<number>(0);
  const [daySlotPayRate, setDaySlotPayRate] = useState<string>("");
  const [nightSlotPayRate, setNightSlotPayRate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSite || !requestDate) {
      toast({
        title: "Missing Information",
        description: "Please select a site and date.",
        variant: "destructive",
      });
      return;
    }

    if (dayTempSlots === 0 && nightTempSlots === 0) {
      toast({
        title: "No Slots Requested",
        description: "Please specify at least one temporary slot.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('temporary_staffing_requests')
        .insert({
          site_id: selectedSite,
          request_date: format(requestDate, 'yyyy-MM-dd'),
          day_temp_slots: dayTempSlots,
          night_temp_slots: nightTempSlots,
          day_slot_pay_rate: daySlotPayRate ? parseFloat(daySlotPayRate) : null,
          night_slot_pay_rate: nightSlotPayRate ? parseFloat(nightSlotPayRate) : null,
          notes: notes || null,
          requested_by: 'System User', // You can replace this with actual user info when auth is implemented
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Created",
        description: "Temporary staffing request has been submitted successfully.",
      });

      // Reset form
      setSelectedSite("");
      setRequestDate(undefined);
      setDayTempSlots(0);
      setNightTempSlots(0);
      setDaySlotPayRate("");
      setNightSlotPayRate("");
      setNotes("");
      setOpen(false);
      
      onSuccess?.();
    } catch (error) {
      console.error('Error creating temporary staffing request:', error);
      toast({
        title: "Error",
        description: "Failed to create temporary staffing request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Request Temporary Guards
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Request Temporary Guards
          </DialogTitle>
          <DialogDescription>
            Request additional temporary guards for a specific site and date. Specify the number of slots needed and pay rates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site">Site *</Label>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    <div>
                      <div className="font-medium">{site.site_name}</div>
                      <div className="text-sm text-muted-foreground">{site.address}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Request Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !requestDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {requestDate ? format(requestDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={requestDate}
                  onSelect={setRequestDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Temporary Slots */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daySlots">Day Shift Slots</Label>
              <Input
                id="daySlots"
                type="number"
                min="0"
                value={dayTempSlots}
                onChange={(e) => setDayTempSlots(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nightSlots">Night Shift Slots</Label>
              <Input
                id="nightSlots"
                type="number"
                min="0"
                value={nightTempSlots}
                onChange={(e) => setNightTempSlots(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Pay Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dayPayRate">Day Slot Pay Rate (₹)</Label>
              <Input
                id="dayPayRate"
                type="number"
                step="0.01"
                min="0"
                value={daySlotPayRate}
                onChange={(e) => setDaySlotPayRate(e.target.value)}
                placeholder="0.00"
                disabled={dayTempSlots === 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nightPayRate">Night Slot Pay Rate (₹)</Label>
              <Input
                id="nightPayRate"
                type="number"
                step="0.01"
                min="0"
                value={nightSlotPayRate}
                onChange={(e) => setNightSlotPayRate(e.target.value)}
                placeholder="0.00"
                disabled={nightTempSlots === 0}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information or special requirements..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};