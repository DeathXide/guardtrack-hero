import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Edit, Users, IndianRupee, Calendar } from 'lucide-react';
import { sitesApi } from '@/lib/sitesApi';
import { PageLoader } from '@/components/ui/loader';
import { PageHeader } from '@/components/layout/PageHeader';
import UtilityChargesManagement from '@/components/sites/UtilityChargesManagement';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
    case 'inactive':
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200">Inactive</Badge>;
    case 'temp':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Temporary</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getStatusDescription = (status: string) => {
  switch (status) {
    case 'active':
      return 'Regular site — generates attendance & invoices';
    case 'inactive':
      return 'Paused — no attendance or invoice generation';
    case 'temp':
      return 'Short-term / event-based site';
    default:
      return '';
  }
};

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.getAllSites
  });

  const site = (sites as any[]).find((s: any) => s.id === id);

  // Calculate total budget and slots
  const calculateTotals = () => {
    if (!site?.staffing_requirements) return { totalBudget: 0, totalSlots: 0, daySlots: 0, nightSlots: 0 };

    return site.staffing_requirements.reduce((acc: any, req: any) => ({
      totalBudget: acc.totalBudget + (req.budget_per_slot * (req.day_slots + req.night_slots)),
      totalSlots: acc.totalSlots + req.day_slots + req.night_slots,
      daySlots: acc.daySlots + req.day_slots,
      nightSlots: acc.nightSlots + req.night_slots
    }), { totalBudget: 0, totalSlots: 0, daySlots: 0, nightSlots: 0 });
  };

  const totals = calculateTotals();

  if (isLoading) {
    return <PageLoader />;
  }

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/sites');
  };

  if (!site) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Site Not Found</h1>
        <p className="text-muted-foreground mb-4">The site you're looking for doesn't exist.</p>
        <Button onClick={handleBack}>Back to Sites</Button>
      </div>
    );
  }

  // Build address display from address lines only
  const addressParts = [site.address_line1, site.address_line2, site.address_line3].filter(Boolean);
  const displayAddress = addressParts.length > 0 ? addressParts.join(', ') : site.address;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={site.site_name}
        subtitle={site.organization_name}
        breadcrumbs={[
          { label: 'Sites', href: '/sites' },
          { label: site.site_name },
        ]}
        backButton
        actions={
          <Button onClick={() => navigate('/sites', { state: { editSiteId: id } })} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Site
          </Button>
        }
      />

      {/* Status Banner for inactive/temp sites */}
      {site.status !== 'active' && (
        <Card className={site.status === 'inactive' ? 'border-gray-300 bg-gray-50' : 'border-amber-300 bg-amber-50'}>
          <CardContent className="py-3 flex items-center gap-3">
            {getStatusBadge(site.status)}
            <span className="text-sm text-muted-foreground">
              {getStatusDescription(site.status)}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Site Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Site Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Site Name</label>
              <p className="text-lg font-medium">{site.site_name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Client / Organization</label>
              <p>{site.organization_name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Badge variant="outline" className="mt-1">
                {site.site_category}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">{getStatusBadge(site.status)}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">GST Type</label>
              <p>{site.gst_type}</p>
            </div>

            {site.gst_number && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">GST Number</label>
                <p className="font-mono text-sm">{site.gst_number}</p>
              </div>
            )}

            {site.personal_billing_name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Personal Billing Name</label>
                <p>{site.personal_billing_name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {site.address_line1 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Street / Building</label>
                <p>{site.address_line1}</p>
              </div>
            )}

            {site.address_line2 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Area / Locality</label>
                <p>{site.address_line2}</p>
              </div>
            )}

            {site.address_line3 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">City / State / Pincode</label>
                <p>{site.address_line3}</p>
              </div>
            )}

            {!site.address_line1 && !site.address_line2 && !site.address_line3 && site.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p>{site.address}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(site.created_at)}</span>
              </div>
              {site.updated_at && site.updated_at !== site.created_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDate(site.updated_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{totals.totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold text-secondary-foreground">
                  {totals.totalSlots}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Day Shifts</p>
                <p className="text-xl font-semibold">{totals.daySlots}</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Night Shifts</p>
                <p className="text-xl font-semibold">{totals.nightSlots}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staffing Requirements */}
      {site?.staffing_requirements && site.staffing_requirements.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staffing Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {site.staffing_requirements.map((req: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-sm">
                        {req.role_type}
                      </Badge>
                      <span className="font-semibold text-lg">
                        ₹{req.budget_per_slot.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Day Slots:</span>
                        <span className="ml-2 font-medium">{req.day_slots}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Night Slots:</span>
                        <span className="ml-2 font-medium">{req.night_slots}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Slots:</span>
                        <span className="font-medium">{req.day_slots + req.night_slots}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Total Budget:</span>
                        <span>₹{(req.budget_per_slot * (req.day_slots + req.night_slots)).toLocaleString()}</span>
                      </div>
                    </div>

                    {req.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Description:</span> {req.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Staffing Requirements Message */}
      {(!site?.staffing_requirements || site.staffing_requirements.length === 0) && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staffing Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No staffing requirements defined for this site.</p>
                <p className="text-sm">Edit the site to add staffing requirements.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Utility Charges Section */}
      <div className="mt-6">
        <UtilityChargesManagement
          siteId={site.id}
          siteName={site.site_name}
        />
      </div>
    </div>
  );
};

export default SiteDetail;
