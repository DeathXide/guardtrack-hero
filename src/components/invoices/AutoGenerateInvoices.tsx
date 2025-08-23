import { useState } from 'react';
import { FileText, Calendar, Building2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchSites } from '@/lib/localService';
import { createInvoice } from '@/lib/invoiceData';
import { calculateInvoiceFromSite, formatCurrency } from '@/lib/invoiceUtils';
import { Site } from '@/types';
import { toast } from 'sonner';

interface AutoGenerateInvoicesProps {
  onInvoicesCreated: () => void;
}

export default function AutoGenerateInvoices({ onInvoicesCreated }: AutoGenerateInvoicesProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [companyName, setCompanyName] = useState('SecureGuard Services Pvt Ltd');
  const [loading, setLoading] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);

  // Set default period to current month
  useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setPeriodFrom(firstDay.toISOString().split('T')[0]);
    setPeriodTo(lastDay.toISOString().split('T')[0]);
  });

  const loadSites = async () => {
    try {
      const data = await fetchSites();
      setSites(data);
      setSitesLoaded(true);
      
      if (data.length === 0) {
        toast.info('No sites found. Please create some sites first.');
      } else {
        // Select all sites by default
        setSelectedSites(new Set(data.map(site => site.id)));
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    const newSelection = new Set(selectedSites);
    if (newSelection.has(siteId)) {
      newSelection.delete(siteId);
    } else {
      newSelection.add(siteId);
    }
    setSelectedSites(newSelection);
  };

  const selectAllSites = () => {
    setSelectedSites(new Set(sites.map(site => site.id)));
  };

  const clearSelection = () => {
    setSelectedSites(new Set());
  };

  const generateInvoices = async () => {
    if (selectedSites.size === 0) {
      toast.error('Please select at least one site');
      return;
    }

    if (!periodFrom || !periodTo) {
      toast.error('Please select the billing period');
      return;
    }

    setLoading(true);
    try {
      const selectedSiteData = sites.filter(site => selectedSites.has(site.id));
      let createdCount = 0;

      for (const site of selectedSiteData) {
        // Check if site has staffing slots
        if (!site.staffingSlots || site.staffingSlots.length === 0) {
          console.warn(`Skipping site ${site.name} - no staffing slots defined`);
          continue;
        }

        // Calculate total slots to ensure there's something to bill
        const totalSlots = site.staffingSlots.reduce((sum, slot) => sum + slot.daySlots + slot.nightSlots, 0);
        if (totalSlots === 0) {
          console.warn(`Skipping site ${site.name} - no slots configured`);
          continue;
        }

        const invoiceData = calculateInvoiceFromSite(site, periodFrom, periodTo, companyName);
        const newInvoice = createInvoice({
          ...invoiceData,
          status: 'draft'
        });
        
        createdCount++;
      }

      if (createdCount > 0) {
        toast.success(`Created ${createdCount} invoice(s) successfully`);
        onInvoicesCreated();
      } else {
        toast.warning('No invoices were created. Please ensure sites have staffing slots configured.');
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error('Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const getGstTypeDescription = (gstType: string) => {
    switch (gstType) {
      case 'GST': return 'Standard GST (18%)';
      case 'NGST': return 'No GST (0%)';
      case 'RCM': return 'Reverse Charge Mechanism';
      case 'PERSONAL': return 'Personal Billing (No GST)';
      default: return gstType;
    }
  };

  const calculateSiteTotal = (site: Site) => {
    if (!site.staffingSlots) return 0;
    return site.staffingSlots.reduce((sum, slot) => {
      return sum + (slot.daySlots * slot.budgetPerSlot) + (slot.nightSlots * slot.budgetPerSlot);
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Auto Generate Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!sitesLoaded ? (
          <div className="text-center py-8">
            <Button onClick={loadSites} className="gap-2">
              <Building2 className="h-4 w-4" />
              Load Sites
            </Button>
          </div>
        ) : (
          <>
            {sites.length === 0 ? (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  No sites found. Please create some sites first before generating invoices.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Period Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Billing Period</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodFrom">From Date</Label>
                      <Input
                        id="periodFrom"
                        type="date"
                        value={periodFrom}
                        onChange={(e) => setPeriodFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodTo">To Date</Label>
                      <Input
                        id="periodTo"
                        type="date"
                        value={periodTo}
                        onChange={(e) => setPeriodTo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                    />
                  </div>
                </div>

                {/* Site Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Select Sites ({selectedSites.size} of {sites.length})</Label>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={selectAllSites}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sites.map((site) => {
                      const isSelected = selectedSites.has(site.id);
                      const siteTotal = calculateSiteTotal(site);
                      const hasStaffing = site.staffingSlots && site.staffingSlots.length > 0;

                      return (
                        <div
                          key={site.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          } ${!hasStaffing ? 'opacity-50' : ''}`}
                          onClick={() => hasStaffing && toggleSiteSelection(site.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{site.name}</h4>
                                {isSelected && <Badge variant="secondary">Selected</Badge>}
                                {!hasStaffing && <Badge variant="destructive">No Staffing</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{site.organizationName}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <Badge variant="outline">{getGstTypeDescription(site.gstType)}</Badge>
                                {hasStaffing && (
                                  <span className="text-muted-foreground">
                                    Estimated: {formatCurrency(siteTotal)}
                                  </span>
                                )}
                              </div>
                              {hasStaffing && site.staffingSlots && (
                                <div className="text-xs text-muted-foreground">
                                  {site.staffingSlots.map((slot, index) => (
                                    <span key={index}>
                                      {slot.role}: {slot.daySlots}D + {slot.nightSlots}N
                                      {index < site.staffingSlots!.length - 1 ? ' | ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={generateInvoices} 
                    disabled={selectedSites.size === 0 || loading}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Calendar className="h-4 w-4" />
                    {loading ? 'Generating Invoices...' : `Generate ${selectedSites.size} Invoice(s)`}
                  </Button>
                  {selectedSites.size > 0 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      This will create {selectedSites.size} draft invoice(s) for the selected period
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}