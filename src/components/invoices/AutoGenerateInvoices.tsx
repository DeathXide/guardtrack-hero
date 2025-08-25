import { useState, useEffect } from 'react';
import { FileText, Calendar, Building2, Wand2, CheckSquare, X, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sitesApi } from '@/lib/sitesApi';
import { companyApi } from '@/lib/companyApi';
import { createInvoiceInDB, checkSiteHasInvoiceForMonth, checkMultipleSitesHaveInvoiceForMonth } from '@/lib/supabaseInvoiceApiNew';
import { calculateInvoiceFromSite, formatCurrency } from '@/lib/invoiceUtils';
import { toast } from 'sonner';

interface AutoGenerateInvoicesProps {
  onInvoicesCreated: () => void;
  selectedMonth: string;
}

export default function AutoGenerateInvoices({ onInvoicesCreated, selectedMonth }: AutoGenerateInvoicesProps) {
  const [sites, setSites] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any | null>(null);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gstTypeFilter, setGstTypeFilter] = useState<string>('all');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [includeUtilities, setIncludeUtilities] = useState(true);

  // Set default period based on selected month
  useEffect(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    
    setPeriodFrom(formatLocal(firstDay));
    setPeriodTo(formatLocal(lastDay));
  }, [selectedMonth]);

  const loadSites = async () => {
    try {
      const [sitesData, companyData] = await Promise.all([
        sitesApi.getAllSites(),
        companyApi.getCompanySettings()
      ]);
      
      setCompanySettings(companyData);
      
      // Load all sites (don't filter by status here - let UI filters handle it)
      const allSites = sitesData;
      
      // Filter out sites that already have invoices for the selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      
      // Batch check for existing invoices instead of sequential calls
      const siteIds = allSites.map(site => site.id);
      const sitesWithInvoices = await checkMultipleSitesHaveInvoiceForMonth(siteIds, year, month);
      
      const sitesWithoutInvoices = allSites.filter(site => !sitesWithInvoices.has(site.id));
      
      setSites(sitesWithoutInvoices);
      // Don't auto-select all sites - let user choose with filters
      setSelectedSites(new Set());
      setSitesLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load sites and company data');
    }
  };

  // Filter sites based on status and GST type filters
  const filteredSites = sites.filter(site => {
    const matchesStatus = statusFilter === 'all' || (site.status || 'active') === statusFilter;
    const matchesGstType = gstTypeFilter === 'all' || site.gst_type === gstTypeFilter;
    return matchesStatus && matchesGstType;
  });

  // Update selected sites when filters change
  useEffect(() => {
    const filteredIds = filteredSites.map(site => site.id);
    setSelectedSites(prev => new Set([...prev].filter(id => filteredIds.includes(id))));
  }, [statusFilter, gstTypeFilter, sites]);

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
    setSelectedSites(new Set(filteredSites.map(site => site.id)));
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

    if (!companySettings) {
      toast.error('Company settings not loaded. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const selectedSiteData = filteredSites.filter(site => selectedSites.has(site.id));
      let createdCount = 0;
      let skippedCount = 0;

      const processSite = async (siteData: any) => {
        // Check if site has staffing requirements
        if (!siteData.staffing_requirements || siteData.staffing_requirements.length === 0) {
          console.warn(`Skipping site ${siteData.site_name} - no staffing requirements defined`);
          skippedCount++;
          return;
        }

        // Calculate total slots to ensure there's something to bill
        const totalSlots = siteData.staffing_requirements.reduce((sum: number, req: any) => sum + req.day_slots + req.night_slots, 0);
        if (totalSlots === 0) {
          console.warn(`Skipping site ${siteData.site_name} - no slots configured`);
          skippedCount++;
          return;
        }

        try {
          // Create site data compatible with invoice calculation
          const site = {
            id: siteData.id,
            name: siteData.site_name,
            organizationName: siteData.organization_name,
            gstNumber: siteData.gst_number,
            gstType: siteData.gst_type,
            addressLine1: siteData.address_line1,
            addressLine2: siteData.address_line2,
            addressLine3: siteData.address_line3,
            siteType: siteData.site_category,
            staffingSlots: siteData.staffing_requirements?.map((req: any) => ({
              id: req.id,
              role: req.role_type,
              daySlots: req.day_slots,
              nightSlots: req.night_slots,
              budgetPerSlot: req.budget_per_slot,
              rateType: 'monthly' as const,
              description: req.description
            })) || []
          };
          
          const companyData = {
            company_name: companySettings.company_name,
            gst_number: companySettings.gst_number
          };

          const invoiceData = await calculateInvoiceFromSite(
            site,
            periodFrom,
            periodTo,
            companyData,
            undefined,
            includeUtilities
          );
          
          await createInvoiceInDB({
            ...invoiceData,
            status: 'draft' as const
          });
          
          createdCount++;
        } catch (error: any) {
          if (error.message?.includes('An invoice already exists for this site and month period')) {
            console.warn(`Skipping site ${siteData.site_name} - invoice already exists for this month`);
            skippedCount++;
            return;
          }
          throw error; // Re-throw other errors
        }
      };

      // Process in parallel batches to speed up generation without overloading the server
      const concurrency = 5; // tune as needed
      for (let i = 0; i < selectedSiteData.length; i += concurrency) {
        const batch = selectedSiteData.slice(i, i + concurrency);
        await Promise.all(batch.map(processSite));
      }

      if (createdCount > 0) {
        const message = skippedCount > 0 
          ? `Created ${createdCount} invoice(s) successfully. ${skippedCount} site(s) skipped (already have invoices for this month or missing requirements).`
          : `Created ${createdCount} invoice(s) successfully`;
        toast.success(message);
        onInvoicesCreated();
      } else if (skippedCount > 0) {
        toast.warning(`No new invoices were created. ${skippedCount} site(s) either already have invoices for this month or are missing staffing requirements.`);
      } else {
        toast.warning('No invoices were created. Please ensure sites have staffing requirements configured.');
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

  const calculateSiteTotal = (site: any) => {
    if (!site.staffing_requirements) return 0;
    return site.staffing_requirements.reduce((sum, req) => {
      return sum + (req.day_slots * Number(req.budget_per_slot)) + (req.night_slots * Number(req.budget_per_slot));
    }, 0);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'temp', label: 'Temporary' }
  ];

  const gstTypeOptions = [
    { value: 'all', label: 'All GST Types' },
    { value: 'GST', label: 'Standard GST' },
    { value: 'IGST', label: 'Inter-State GST' },
    { value: 'NGST', label: 'No GST' },
    { value: 'RCM', label: 'Reverse Charge' },
    { value: 'PERSONAL', label: 'Personal Billing' }
  ];

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
              Load Sites & Company Data
            </Button>
          </div>
        ) : (
          <>
            {sites.length === 0 ? (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  No active sites found. Please ensure you have active sites with staffing requirements before generating invoices.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Period Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Billing Period</Label>
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
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Label className="text-base font-medium">Filter Sites</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>GST Type</Label>
                      <Select value={gstTypeFilter} onValueChange={setGstTypeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gstTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                 </div>

                {/* Utility Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-utilities"
                      checked={includeUtilities}
                      onChange={(e) => setIncludeUtilities(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="include-utilities" className="text-sm font-medium">
                      Include utility charges (water, electricity, maintenance)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, predefined utility charges for each site will be automatically added to invoices
                  </p>
                </div>

                {/* Sites Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      Select Sites to Generate Invoices 
                      {filteredSites.length !== sites.length && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({filteredSites.length} of {sites.length} sites shown)
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllSites}
                        disabled={filteredSites.length === 0}
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        disabled={selectedSites.size === 0}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredSites.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No sites match the selected filters</p>
                        <p className="text-sm">Try adjusting your status or GST type filters</p>
                      </div>
                    ) : (
                      filteredSites.map((site) => {
                      const isSelected = selectedSites.has(site.id);
                      const siteTotal = calculateSiteTotal(site);
                      const hasStaffing = site.staffing_requirements && site.staffing_requirements.length > 0;

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
                                <h4 className="font-medium">{site.site_name}</h4>
                                {isSelected && <Badge variant="secondary">Selected</Badge>}
                                {!hasStaffing && <Badge variant="destructive">No Staffing</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{site.organization_name}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <Badge variant="outline">{getGstTypeDescription(site.gst_type)}</Badge>
                                {hasStaffing && (
                                  <span className="text-muted-foreground">
                                    Estimated: {formatCurrency(siteTotal)}
                                  </span>
                                )}
                              </div>
                              {hasStaffing && site.staffing_requirements && (
                                <div className="text-xs text-muted-foreground">
                                  {site.staffing_requirements.map((req, index) => (
                                    <span key={index}>
                                      {req.role_type}: {req.day_slots}D + {req.night_slots}N
                                      {index < site.staffing_requirements!.length - 1 ? ' | ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
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