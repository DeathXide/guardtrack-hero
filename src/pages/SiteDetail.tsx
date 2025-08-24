import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Building, Edit } from 'lucide-react';
import { fetchSites } from '@/lib/supabaseService';
import { PageLoader } from '@/components/ui/loader';
import UtilityChargesManagement from '@/components/sites/UtilityChargesManagement';

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites
  });

  const site = (sites as any[]).find((s: any) => s.id === id);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!site) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Site Not Found</h1>
          <p className="text-muted-foreground mb-4">The site you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/sites')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sites
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/sites')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sites
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{site.site_name}</h1>
            <p className="text-muted-foreground">{site.organization_name}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/sites')} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit Site
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <label className="text-sm font-medium text-muted-foreground">Organization</label>
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
              <Badge 
                variant={site.status === 'active' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {site.status}
              </Badge>
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
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Address</label>
              <p>{site.address}</p>
            </div>

            {site.address_line1 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address Line 1</label>
                <p>{site.address_line1}</p>
              </div>
            )}

            {site.address_line2 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address Line 2</label>
                <p>{site.address_line2}</p>
              </div>
            )}

            {site.address_line3 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address Line 3</label>
                <p>{site.address_line3}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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