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
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Guard } from "@/types";

const guardSchema = z.object({
  name: z.string().min(1).regex(/^[A-Za-z\s]+$/, "Name should only contain letters and spaces").max(50),
  gender: z.enum(["male", "female", "other"]),
  languagesSpoken: z.array(z.string()).min(1),
  dateOfBirth: z.string().min(1),
  guardPhoto: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  aadhaarCardPhoto: z.string().optional(),
  panCard: z.string().optional(),
  phone: z.string().min(10).max(10).regex(/^\d{10}$/),
  alternatePhone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), {
    message: "Alternate phone number must be exactly 10 digits if provided",
  }),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  type: z.enum(["permanent", "contract"]),
  status: z.enum(["active", "inactive"]),
  payRate: z.number().min(1),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
});

export type GuardFormData = z.infer<typeof guardSchema>;

interface GuardFormProps {
  guard?: Guard; // passed in edit mode, undefined in add mode
  onSubmit: (data: GuardFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

const steps = [
  { id: 1, title: "Essential Info", icon: CheckCircle },
  { id: 2, title: "Compensation", icon: Banknote },
  { id: 3, title: "Additional Details", icon: FileText },
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
  dateOfBirth: "",
  gender: "male",
  languagesSpoken: [],
  guardPhoto: "",
  aadhaarNumber: "",
  aadhaarCardPhoto: "",
  panCard: "",
  phone: "",
  alternatePhone: "",
  currentAddress: "",
  permanentAddress: "",
  type: "permanent",
  status: "active",
  payRate: 15000,
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
  const [currentStep, setCurrentStep] = React.useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const { toast } = useToast();

  // useForm and keep form state in sync with props.guard for edit
  const form = useForm<GuardFormData>({
    resolver: zodResolver(guardSchema),
    defaultValues: guard
      ? {
          ...guard,
          payRate: guard.payRate || 0,
          languagesSpoken:
            guard.languagesSpoken && Array.isArray(guard.languagesSpoken)
              ? guard.languagesSpoken
              : [],
        }
      : defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    if (guard) {
      form.reset({
        ...guard,
        payRate: guard.payRate || 0,
        languagesSpoken: Array.isArray(guard.languagesSpoken)
          ? guard.languagesSpoken
          : [],
      });
    } else {
      form.reset(defaultValues);
    }
    setCurrentStep(1);
  }, [guard]);

  const handleSubmit = async (data: GuardFormData) => {
    await onSubmit(data);
    setShowSuccessDialog(true);
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onCancel();
  };

  // Step-wise validation
  const validateCurrentStep = async () => {
    const fieldsToValidate: (keyof GuardFormData)[] = [];
    let stepName = "";

    switch (currentStep) {
      case 1:
        fieldsToValidate.push(
          "name",
          "gender",
          "languagesSpoken",
          "phone",
          "type",
          "status",
          "dateOfBirth"
        );
        stepName = "Essential Info";
        break;
      case 2:
        fieldsToValidate.push("payRate");
        stepName = "Compensation";
        break;
      case 3:
        return true;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) {
      const errors = form.formState.errors;
      const missingFields: string[] = [];
      fieldsToValidate.forEach((field) => {
        if (errors[field]) {
          switch (field) {
            case "name":
              missingFields.push("Full Name");
              break;
            case "gender":
              missingFields.push("Gender");
              break;
            case "languagesSpoken":
              missingFields.push("Languages Spoken");
              break;
            case "phone":
              missingFields.push("Primary Phone Number");
              break;
            case "type":
              missingFields.push("Guard Type");
              break;
            case "status":
              missingFields.push("Status");
              break;
            case "payRate":
              missingFields.push("Monthly Pay Rate");
              break;
            case "dateOfBirth":
              missingFields.push("Date of Birth");
              break;
          }
        }
      });
      if (missingFields.length > 0) {
        toast({
          title: `${stepName} - Missing Required Information`,
          description: `Please fill in: ${missingFields.join(", ")}`,
          variant: "destructive",
        });
      }
    }
    return isValid;
  };

  const handleNext: React.MouseEventHandler = async (e) => {
    e.preventDefault();
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

const calculateShiftRate = (monthlyRate) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (
    !monthlyRate || // catches null, undefined, 0, "", NaN
    typeof monthlyRate !== "number" ||
    isNaN(monthlyRate) ||
    !daysInMonth // sanity-check for 0 days (which never happens, but just in case)
  ) {
    return 0;
  }

  return Math.round(monthlyRate / daysInMonth);
};


  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  const payRateValue = form.watch("payRate");
  const languagesValue = form.watch("languagesSpoken");

  return (
    <>
      <form
        onKeyDown={e => {
          // Block Enter key from submitting form unless on step 3
          if (e.key === "Enter" && currentStep !== 3) e.preventDefault();
        }}
        onSubmit={e => {
          if (currentStep !== 3) {
            e.preventDefault();
            return;
          }
          form.handleSubmit(handleSubmit)(e);
        }}
        className="space-y-6"
      >
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  currentStep === step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 ml-6 transition-colors duration-300 ${
                    currentStep > step.id ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ==== Step Content ==== */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" /> Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* <---- Same as before, all Input/Label fields for step 1 ----> */}
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Enter full name (letters only)"
                        onInput={e => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^A-Za-z\s]/g, "");
                          form.clearErrors("name");
                        }}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">
                        Date of Birth <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...form.register("dateOfBirth")}
                        onChange={e => {
                          form.setValue("dateOfBirth", e.target.value);
                          form.clearErrors("dateOfBirth");
                        }}
                      />
                      {form.formState.errors.dateOfBirth && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.dateOfBirth.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">
                        Gender <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.watch("gender")}
                        onValueChange={value => {
                          form.setValue("gender", value as "male" | "female" | "other");
                          form.clearErrors("gender");
                        }}
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
                      {form.formState.errors.gender && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.gender.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="languagesSpoken">
                        Languages Spoken <span className="text-destructive">*</span>
                      </Label>
                      <MultiSelect
                        options={languageOptions}
                        selected={languagesValue || []}
                        onChange={selected => {
                          form.setValue("languagesSpoken", selected);
                          form.clearErrors("languagesSpoken");
                        }}
                        placeholder="Select languages..."
                      />
                      {form.formState.errors.languagesSpoken && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.languagesSpoken.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Primary Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                        onInput={e => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^0-9]/g, "");
                          form.clearErrors("phone");
                        }}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternatePhone">Alternate Phone Number</Label>
                      <Input
                        id="alternatePhone"
                        {...form.register("alternatePhone")}
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                        onInput={e => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^0-9]/g, "");
                          form.clearErrors("alternatePhone");
                        }}
                      />
                      {form.formState.errors.alternatePhone && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.alternatePhone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentAddress">Current Address</Label>
                      <Textarea
                        id="currentAddress"
                        {...form.register("currentAddress")}
                        placeholder="Enter current address"
                        rows={2}
                        onChange={() => form.clearErrors("currentAddress")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permanentAddress">Permanent Address</Label>
                      <Textarea
                        id="permanentAddress"
                        {...form.register("permanentAddress")}
                        placeholder="Enter permanent address"
                        rows={2}
                        onChange={() => form.clearErrors("permanentAddress")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" /> Guard Type & Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">
                        Guard Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.watch("type")}
                        onValueChange={value => {
                          form.setValue("type", value as "permanent" | "contract");
                          form.clearErrors("type");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select guard type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.type && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.type.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">
                        Status <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.watch("status")}
                        onValueChange={value => {
                          form.setValue("status", value as "active" | "inactive");
                          form.clearErrors("status");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.status && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.status.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5" /> Pay Rate
                  </CardTitle>
                </CardHeader>
             <CardContent>
  <div className="space-y-2">
    <Label htmlFor="payRate">
      Monthly Pay Rate (INR) <span className="text-destructive">*</span>
    </Label>
    <Input
      id="payRate"
      type="number"
      min="0"
      step="0.01"
      {...form.register("payRate", { valueAsNumber: true })}
      placeholder="Enter monthly pay rate in INR"
      onInput={() => form.clearErrors("payRate")}
    />
    <div className="text-xs text-muted-foreground">
      Per shift rate: {formatCurrency(calculateShiftRate(payRateValue))}
    </div>
    {form.formState.errors.payRate && (
      <p className="text-sm text-destructive">
        {form.formState.errors.payRate.message}
      </p>
    )}
  </div>
</CardContent>

              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" /> Banking & Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        {...form.register("bankName")}
                        placeholder="Enter bank name"
                        onInput={() => form.clearErrors("bankName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        {...form.register("accountNumber")}
                        placeholder="Enter account number"
                        onInput={() => form.clearErrors("accountNumber")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        {...form.register("ifscCode")}
                        placeholder="Enter IFSC code"
                        onInput={() => form.clearErrors("ifscCode")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input
                        id="upiId"
                        {...form.register("upiId")}
                        placeholder="Enter UPI ID"
                        onInput={() => form.clearErrors("upiId")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" /> Identity Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                      <Input
                        id="aadhaarNumber"
                        {...form.register("aadhaarNumber")}
                        placeholder="Enter Aadhaar number"
                        onInput={() => form.clearErrors("aadhaarNumber")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aadhaarCardPhoto">Aadhaar Card Photo URL</Label>
                      <Input
                        id="aadhaarCardPhoto"
                        {...form.register("aadhaarCardPhoto")}
                        placeholder="Enter Aadhaar card photo URL"
                        onInput={() => form.clearErrors("aadhaarCardPhoto")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="panCard">PAN Card</Label>
                      <Input
                        id="panCard"
                        {...form.register("panCard")}
                        placeholder="Enter PAN card number"
                        onInput={() => form.clearErrors("panCard")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" /> Photo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="guardPhoto">Guard Photo URL</Label>
                    <Input
                      id="guardPhoto"
                      {...form.register("guardPhoto")}
                      placeholder="Enter guard photo URL"
                      onInput={() => form.clearErrors("guardPhoto")}
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Badge Number:</span>
                  <span className="text-muted-foreground">
                    {isEditMode && guard?.badgeNumber
                      ? guard.badgeNumber
                      : "Will be auto-generated upon creation"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* --- Navigation --- */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading
                  ? isEditMode ? "Saving..." : "Saving..."
                  : isEditMode ? "Update Guard" : "Add Guard"}
              </Button>
            )}
          </div>
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
              {isEditMode ? "Guard Updated Successfully!" : "Guard Added Successfully!"}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {isEditMode
                ? "The guard's details have been updated."
                : "The new guard has been added to your system and is ready for duty assignment."}
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
