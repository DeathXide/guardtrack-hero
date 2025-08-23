import React, { useState } from "react";
import { Building, Mail, Phone, Globe, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { companyApi, UpdateCompanySettingsData } from "@/lib/companyApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CompanySettings() {
  const [formData, setFormData] = useState<UpdateCompanySettingsData>({
    company_name: "",
    company_motto: "",
    company_logo_url: "",
    company_address_line1: "",
    company_address_line2: "",
    company_address_line3: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    gst_number: "",
    pan_number: "",
    company_seal_image_url: "",
  });
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company settings
  const { data: companySettings, isLoading, error } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companyApi.getCompanySettings,
  });

  // Update company settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: companyApi.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({
        title: "Success",
        description: "Company settings updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof UpdateCompanySettingsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors.has(field)) {
      setValidationErrors(prev => new Set([...prev].filter(error => error !== field)));
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors = new Set<string>();
    
    if (!formData.company_name.trim()) errors.add("company_name");

    if (errors.size > 0) {
      setValidationErrors(errors);
      return;
    }

    updateSettingsMutation.mutate(formData);
  };

  // Set form data when company settings are loaded
  React.useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name,
        company_motto: companySettings.company_motto || "",
        company_logo_url: companySettings.company_logo_url || "",
        company_address_line1: companySettings.company_address_line1 || "",
        company_address_line2: companySettings.company_address_line2 || "",
        company_address_line3: companySettings.company_address_line3 || "",
        company_phone: companySettings.company_phone || "",
        company_email: companySettings.company_email || "",
        company_website: companySettings.company_website || "",
        gst_number: companySettings.gst_number || "",
        pan_number: companySettings.pan_number || "",
        company_seal_image_url: companySettings.company_seal_image_url || "",
      });
    }
  }, [companySettings]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading company settings: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Company Settings</h1>
          <p className="text-muted-foreground">Manage your company branding and information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Company name, motto, and logo settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange("company_name", e.target.value)}
                placeholder="Enter company name"
                className={validationErrors.has("company_name") ? "border-destructive" : ""}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_motto">Company Motto</Label>
              <Textarea
                id="company_motto"
                value={formData.company_motto}
                onChange={(e) => handleInputChange("company_motto", e.target.value)}
                placeholder="Enter company motto or tagline"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_logo_url">Company Logo URL</Label>
              <Input
                id="company_logo_url"
                value={formData.company_logo_url}
                onChange={(e) => handleInputChange("company_logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Phone, email, and website details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone Number</Label>
              <Input
                id="company_phone"
                value={formData.company_phone}
                onChange={(e) => handleInputChange("company_phone", e.target.value)}
                placeholder="+91 98765 43210"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_email">Email Address</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => handleInputChange("company_email", e.target.value)}
                placeholder="contact@company.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                id="company_website"
                value={formData.company_website}
                onChange={(e) => handleInputChange("company_website", e.target.value)}
                placeholder="https://www.company.com"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Address Information
            </CardTitle>
            <CardDescription>
              Company address details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_address_line1">Address Line 1</Label>
              <Input
                id="company_address_line1"
                value={formData.company_address_line1}
                onChange={(e) => handleInputChange("company_address_line1", e.target.value)}
                placeholder="Street address, building name, floor"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address_line2">Address Line 2</Label>
              <Input
                id="company_address_line2"
                value={formData.company_address_line2}
                onChange={(e) => handleInputChange("company_address_line2", e.target.value)}
                placeholder="Area, locality, neighborhood"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address_line3">Address Line 3</Label>
              <Input
                id="company_address_line3"
                value={formData.company_address_line3}
                onChange={(e) => handleInputChange("company_address_line3", e.target.value)}
                placeholder="City, state, pincode"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Legal Information
            </CardTitle>
            <CardDescription>
              GST and PAN details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                value={formData.gst_number}
                onChange={(e) => handleInputChange("gst_number", e.target.value)}
                placeholder="GST registration number"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                value={formData.pan_number}
                onChange={(e) => handleInputChange("pan_number", e.target.value)}
                placeholder="PAN card number"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_seal_image_url">Company Seal Image URL</Label>
              <Input
                id="company_seal_image_url"
                value={formData.company_seal_image_url || ''}
                onChange={(e) => handleInputChange("company_seal_image_url", e.target.value)}
                placeholder="Company seal image URL for invoices"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={updateSettingsMutation.isPending || isLoading}
          className="min-w-32"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}