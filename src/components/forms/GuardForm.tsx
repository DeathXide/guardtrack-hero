import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Banknote,
  CreditCard,
  FileText,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Guard } from "@/types";
import { guardUtils } from "@/lib/guardsApi";

// --- Schema: only name + phone + pay required ---
const guardSchema = z.object({
  // Required
  name: z.string().min(1, "Name is required").regex(/^[A-Za-z\s]+$/, "Name should only contain letters and spaces").max(50),
  phone: z.string().min(10, "Phone must be 10 digits").max(10).regex(/^\d{10}$/, "Phone must be 10 digits"),
  payType: z.enum(["monthly", "per_shift"]),
  payRate: z.number().nullable().optional(),
  perShiftRate: z.number().nullable().optional(),
  // Defaults
  type: z.enum(["permanent", "contract"]),
  status: z.enum(["active", "inactive", "terminated", "resigned"]),
  staffRole: z.string().default("Security Guard"),
  gender: z.enum(["male", "female", "other"]),
  // Uniform
  uniformIssued: z.boolean().optional(),
  uniformIssuedDate: z.string().optional(),
  // Optional
  dateOfBirth: z.string().optional(),
  languagesSpoken: z.array(z.string()).optional(),
  guardPhoto: z.string().optional(),
  alternatePhone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), {
    message: "Alternate phone must be 10 digits if provided",
  }),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  aadhaarCardPhoto: z.string().optional(),
  panCard: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
}).refine(
  (data) => {
    if (data.payType === "monthly") return (data.payRate ?? 0) > 0;
    return (data.perShiftRate ?? 0) > 0;
  },
  {
    message: "Pay rate is required",
    path: ["payRate"],
  }
);

export type GuardFormData = z.infer<typeof guardSchema>;

interface GuardFormProps {
  guard?: Guard;
  onSubmit: (data: GuardFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

const STAFF_ROLE_OPTIONS = [
  "Security Guard",
  "Supervisor",
  "Housekeeping",
  "Receptionist",
  "Maintenance",
  "Office Boy",
  "Other",
];

const languageOptions = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "telugu", label: "Telugu" },
  { value: "bihari", label: "Bihari" },
  { value: "other", label: "Other" },
];

const defaultValues: GuardFormData = {
  name: "",
  phone: "",
  payType: "monthly",
  payRate: 15000,
  perShiftRate: null,
  type: "permanent",
  status: "active",
  staffRole: "Security Guard",
  gender: "male",
  uniformIssued: false,
  uniformIssuedDate: "",
  dateOfBirth: "",
  languagesSpoken: [],
  guardPhoto: "",
  alternatePhone: "",
  currentAddress: "",
  permanentAddress: "",
  aadhaarNumber: "",
  aadhaarCardPhoto: "",
  panCard: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
};

const GuardForm: React.FC<GuardFormProps> = ({
  guard,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditMode = false,
}) => {
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [personalOpen, setPersonalOpen] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  const [docsOpen, setDocsOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<GuardFormData>({
    resolver: zodResolver(guardSchema),
    defaultValues: guard
      ? {
          ...defaultValues,
          ...guard,
          payType: guard.perShiftRate ? "per_shift" : "monthly",
          payRate: guard.payRate || null,
          perShiftRate: guard.perShiftRate || null,
          languagesSpoken: Array.isArray(guard.languagesSpoken) ? guard.languagesSpoken : [],
          staffRole: guard.staffRole || "Security Guard",
          uniformIssued: guard.uniformIssued || false,
          uniformIssuedDate: guard.uniformIssuedDate || "",
        }
      : defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (guard) {
      form.reset({
        ...defaultValues,
        ...guard,
        payType: guard.perShiftRate ? "per_shift" : "monthly",
        payRate: guard.payRate || null,
        perShiftRate: guard.perShiftRate || null,
        languagesSpoken: Array.isArray(guard.languagesSpoken) ? guard.languagesSpoken : [],
        uniformIssued: guard.uniformIssued || false,
        uniformIssuedDate: guard.uniformIssuedDate || "",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [guard]);

  const handleSubmit = async (data: GuardFormData) => {
    try {
      await onSubmit(data);
      setShowSuccessDialog(true);
    } catch {
      // onSubmit threw — don't show success dialog
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onCancel();
  };

  const formatCurrency = guardUtils.formatCurrency;

  const calculateShiftRate = (monthlyRate: number | null | undefined) => {
    if (!monthlyRate || typeof monthlyRate !== "number" || isNaN(monthlyRate)) return 0;
    const date = new Date();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return Math.round(monthlyRate / daysInMonth);
  };

  const payType = form.watch("payType");
  const payRateValue = form.watch("payRate");
  const languagesValue = form.watch("languagesSpoken");

  return (
    <>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* === REQUIRED: Essential Info === */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Essential Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter full name"
                  onInput={e => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/[^A-Za-z\s]/g, "");
                    form.clearErrors("name");
                  }}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="10-digit phone number"
                  maxLength={10}
                  onInput={e => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/[^0-9]/g, "");
                    form.clearErrors("phone");
                  }}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Pay Section */}
            <div className="space-y-3">
              <Label>
                Pay Rate <span className="text-destructive">*</span>
              </Label>
              {/* Monthly / Per Shift toggle */}
              <div className="flex items-center border rounded-md w-fit">
                <Button
                  type="button"
                  size="sm"
                  variant={payType === "monthly" ? "default" : "ghost"}
                  onClick={() => {
                    form.setValue("payType", "monthly");
                    form.clearErrors("payRate");
                  }}
                  className="rounded-r-none h-9 px-4 text-sm"
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={payType === "per_shift" ? "default" : "ghost"}
                  onClick={() => {
                    form.setValue("payType", "per_shift");
                    form.clearErrors("payRate");
                  }}
                  className="rounded-l-none h-9 px-4 text-sm border-l"
                >
                  Per Shift
                </Button>
              </div>

              {payType === "monthly" ? (
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Monthly pay rate in INR"
                    {...form.register("payRate", { valueAsNumber: true })}
                    onInput={() => form.clearErrors("payRate")}
                  />
                  {payRateValue && payRateValue > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Per shift: {formatCurrency(calculateShiftRate(payRateValue))}
                    </p>
                  )}
                </div>
              ) : (
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Per shift rate in INR"
                  {...form.register("perShiftRate", { valueAsNumber: true })}
                  onInput={() => form.clearErrors("payRate")}
                />
              )}
              {form.formState.errors.payRate && (
                <p className="text-sm text-destructive">{form.formState.errors.payRate.message}</p>
              )}
            </div>

            {/* Staff Role, Employment Type & Status */}
            <div className="space-y-2">
              <Label>Staff Role</Label>
              <Select
                value={form.watch("staffRole") || "Security Guard"}
                onValueChange={value => form.setValue("staffRole", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={value => form.setValue("type", value as "permanent" | "contract")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={value => form.setValue("status", value as "active" | "inactive" | "terminated" | "resigned")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Badge number info */}
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Badge Number:</span>
                <span className="text-muted-foreground">
                  {isEditMode && guard?.badgeNumber
                    ? guard.badgeNumber
                    : "Auto-generated on creation"}
                </span>
              </div>
            </div>

            {/* Uniform tracking */}
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Uniform Issued
                </Label>
                <input
                  type="checkbox"
                  checked={form.watch("uniformIssued") || false}
                  onChange={e => {
                    form.setValue("uniformIssued", e.target.checked);
                    if (e.target.checked && !form.getValues("uniformIssuedDate")) {
                      form.setValue("uniformIssuedDate", new Date().toISOString().split('T')[0]);
                    }
                    if (!e.target.checked) {
                      form.setValue("uniformIssuedDate", "");
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
              {form.watch("uniformIssued") && (
                <div className="space-y-2">
                  <Label htmlFor="uniformIssuedDate">Date Issued</Label>
                  <Input
                    id="uniformIssuedDate"
                    type="date"
                    {...form.register("uniformIssuedDate")}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* === OPTIONAL: Personal Details (collapsible) === */}
        <Collapsible open={personalOpen} onOpenChange={setPersonalOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Personal Details
                  <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${personalOpen ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={form.watch("gender")}
                      onValueChange={value => form.setValue("gender", value as "male" | "female" | "other")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...form.register("dateOfBirth")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Languages Spoken</Label>
                    <MultiSelect
                      options={languageOptions}
                      selected={languagesValue || []}
                      onChange={selected => form.setValue("languagesSpoken", selected)}
                      placeholder="Select languages..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      {...form.register("alternatePhone")}
                      placeholder="10-digit phone number"
                      maxLength={10}
                      onInput={e => {
                        const target = e.target as HTMLInputElement;
                        target.value = target.value.replace(/[^0-9]/g, "");
                      }}
                    />
                    {form.formState.errors.alternatePhone && (
                      <p className="text-sm text-destructive">{form.formState.errors.alternatePhone.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentAddress">Current Address</Label>
                    <Textarea
                      id="currentAddress"
                      {...form.register("currentAddress")}
                      placeholder="Enter current address"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permanentAddress">Permanent Address</Label>
                    <Textarea
                      id="permanentAddress"
                      {...form.register("permanentAddress")}
                      placeholder="Enter permanent address"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* === OPTIONAL: Banking Details (collapsible) === */}
        <Collapsible open={bankOpen} onOpenChange={setBankOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Banking Details
                  <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${bankOpen ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" {...form.register("bankName")} placeholder="Enter bank name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" {...form.register("accountNumber")} placeholder="Enter account number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input id="ifscCode" {...form.register("ifscCode")} placeholder="Enter IFSC code" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input id="upiId" {...form.register("upiId")} placeholder="Enter UPI ID" />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* === OPTIONAL: ID Documents (collapsible) === */}
        <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  ID Documents & Photo
                  <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${docsOpen ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                    <Input id="aadhaarNumber" {...form.register("aadhaarNumber")} placeholder="Enter Aadhaar number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarCardPhoto">Aadhaar Card Photo URL</Label>
                    <Input id="aadhaarCardPhoto" {...form.register("aadhaarCardPhoto")} placeholder="Aadhaar card photo URL" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panCard">PAN Card</Label>
                    <Input id="panCard" {...form.register("panCard")} placeholder="Enter PAN card number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardPhoto">Guard Photo URL</Label>
                    <Input id="guardPhoto" {...form.register("guardPhoto")} placeholder="Guard photo URL" />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* --- Actions --- */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isEditMode ? "Update Staff" : "Add Staff"}
          </Button>
        </div>
      </form>

      {/* --- Success Dialog --- */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold">
              {isEditMode ? "Staff Updated Successfully!" : "Staff Added Successfully!"}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {isEditMode
                ? "The staff member's details have been updated."
                : "The new staff member has been added and is ready for assignment."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-6">
            <Button onClick={handleSuccessClose} className="px-8">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GuardForm;
