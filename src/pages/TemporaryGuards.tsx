import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Users, Calendar, TrendingUp } from "lucide-react";
import { TemporaryStaffingDialog } from "@/components/temporary-guards/TemporaryStaffingDialog";
import { TemporaryStaffingTable } from "@/components/temporary-guards/TemporaryStaffingTable";
import { PageLoader } from "@/components/ui/loader";
import { supabase } from "@/integrations/supabase/client";

export default function TemporaryGuards() {
  // Fetch sites for the dialog
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, site_name, address')
        .order('site_name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch temporary staffing statistics
  const { data: stats } = useQuery({
    queryKey: ["temporary-staffing-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('temporary_staffing_requests')
        .select('status, day_temp_slots, night_temp_slots');

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(r => r.status === 'pending').length,
        approved: data.filter(r => r.status === 'approved').length,
        totalSlots: data.reduce((sum, r) => sum + r.day_temp_slots + r.night_temp_slots, 0),
      };

      return stats;
    },
  });

  if (sitesLoading) {
    return <PageLoader text="Loading temporary guards management..." />;
  }

  if (!sites || sites.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No sites available</AlertTitle>
          <AlertDescription>
            Please create sites first before managing temporary guards. Go to Sites page to add a new site.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Temporary Guards</h1>
          <p className="text-muted-foreground">
            Request and manage temporary guard assignments for additional staffing needs
          </p>
        </div>
        <TemporaryStaffingDialog sites={sites} />
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Ready to assign</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <p className="text-xs text-muted-foreground">Requested slots</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Temporary Staffing Table */}
      <TemporaryStaffingTable />
    </div>
  );
}