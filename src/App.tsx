
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SitesNew from "./pages/SitesNew";
import SiteDetail from "./pages/SiteDetail";
import Guards from "./pages/Guards";
import Attendance from "./pages/Attendance";
import Schedule from "./pages/Schedule";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceView from "./pages/InvoiceView";
import InvoiceEdit from "./pages/InvoiceEdit";
import CustomInvoiceForm from "./components/invoices/CustomInvoiceForm";
import CompanySettings from "./pages/CompanySettings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute><DashboardLayout><SitesNew /></DashboardLayout></ProtectedRoute>} />
            <Route path="/sites/:id" element={<ProtectedRoute><DashboardLayout><SiteDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/guards" element={<ProtectedRoute><DashboardLayout><Guards /></DashboardLayout></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><DashboardLayout><Attendance /></DashboardLayout></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><DashboardLayout><Schedule /></DashboardLayout></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><DashboardLayout><Invoices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/invoices/create" element={<ProtectedRoute><DashboardLayout><InvoiceCreate /></DashboardLayout></ProtectedRoute>} />
            <Route path="/invoices/create-custom" element={<ProtectedRoute><DashboardLayout><CustomInvoiceForm /></DashboardLayout></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><DashboardLayout><InvoiceView /></DashboardLayout></ProtectedRoute>} />
            <Route path="/invoices/:id/edit" element={<ProtectedRoute><DashboardLayout><InvoiceEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/company-settings" element={<ProtectedRoute><DashboardLayout><CompanySettings /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default App;
