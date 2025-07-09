import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  RefreshCw,
  Settings,
  Users,
  MapPin
} from 'lucide-react';

interface ErrorMessageProps {
  type: 'no-site' | 'no-guards' | 'no-shifts' | 'slot-limit' | 'guard-conflict' | 'network-error' | 'permission-denied';
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  details?: string;
}

const ErrorMessages: React.FC<ErrorMessageProps> = ({ type, message, action, details }) => {
  const getErrorConfig = (errorType: string) => {
    switch (errorType) {
      case 'no-site':
        return {
          icon: MapPin,
          title: 'No Site Selected',
          description: 'Please select a site from the dropdown to mark attendance.',
          variant: 'default' as const,
          actionSuggestion: 'Select a site from the dropdown above to continue.'
        };
        
      case 'no-guards':
        return {
          icon: Users,
          title: 'No Guards Available',
          description: 'No guards are assigned to this site. Please add guards to shifts first.',
          variant: 'default' as const,
          actionSuggestion: 'Go to Shift Allocation tab to assign guards to this site.'
        };
        
      case 'no-shifts':
        return {
          icon: Settings,
          title: 'No Shifts Configured',
          description: 'This site has no shift slots configured. Please update the site settings.',
          variant: 'default' as const,
          actionSuggestion: 'Configure day and night shift slots in the site settings.'
        };
        
      case 'slot-limit':
        return {
          icon: AlertTriangle,
          title: 'Slot Limit Reached',
          description: message || 'Cannot mark more guards present than available slots.',
          variant: 'destructive' as const,
          actionSuggestion: 'Remove some guards from attendance or increase shift slots.'
        };
        
      case 'guard-conflict':
        return {
          icon: XCircle,
          title: 'Guard Conflict',
          description: message || 'This guard is already marked present at another site.',
          variant: 'destructive' as const,
          actionSuggestion: 'Check the guard\'s attendance at other sites first.'
        };
        
      case 'network-error':
        return {
          icon: RefreshCw,
          title: 'Connection Error',
          description: message || 'Unable to save attendance. Please check your connection.',
          variant: 'destructive' as const,
          actionSuggestion: 'Check your internet connection and try again.'
        };
        
      case 'permission-denied':
        return {
          icon: XCircle,
          title: 'Permission Denied',
          description: message || 'You don\'t have permission to perform this action.',
          variant: 'destructive' as const,
          actionSuggestion: 'Contact your administrator for access permissions.'
        };
        
      default:
        return {
          icon: Info,
          title: 'Information',
          description: message || 'An error occurred.',
          variant: 'default' as const,
          actionSuggestion: ''
        };
    }
  };

  const config = getErrorConfig(type);
  const IconComponent = config.icon;

  return (
    <Alert variant={config.variant} className="my-4">
      <IconComponent className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{config.description}</p>
        
        {details && (
          <p className="text-sm text-muted-foreground">{details}</p>
        )}
        
        {config.actionSuggestion && (
          <p className="text-sm font-medium text-primary">
            💡 {config.actionSuggestion}
          </p>
        )}
        
        {action && (
          <div className="pt-2">
            <Button
              variant={config.variant === 'destructive' ? 'outline' : 'default'}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

// Specific error components for common scenarios
export const NoSiteSelectedError: React.FC<{ onSelectSite?: () => void }> = ({ onSelectSite }) => (
  <ErrorMessages
    type="no-site"
    action={onSelectSite ? { label: 'Select Site', onClick: onSelectSite } : undefined}
  />
);

export const NoGuardsError: React.FC<{ onManageGuards?: () => void }> = ({ onManageGuards }) => (
  <ErrorMessages
    type="no-guards"
    action={onManageGuards ? { label: 'Manage Guards', onClick: onManageGuards } : undefined}
  />
);

export const NoShiftsError: React.FC<{ siteName?: string; onConfigureShifts?: () => void }> = ({ 
  siteName, 
  onConfigureShifts 
}) => (
  <ErrorMessages
    type="no-shifts"
    details={siteName ? `Site: ${siteName}` : undefined}
    action={onConfigureShifts ? { label: 'Configure Shifts', onClick: onConfigureShifts } : undefined}
  />
);

export const SlotLimitError: React.FC<{ 
  currentCount: number; 
  maxSlots: number; 
  shiftType: 'day' | 'night' 
}> = ({ currentCount, maxSlots, shiftType }) => (
  <ErrorMessages
    type="slot-limit"
    message={`Cannot mark more than ${maxSlots} guards present for ${shiftType} shift. Currently ${currentCount} guards are marked present.`}
  />
);

export const GuardConflictError: React.FC<{ 
  guardName: string; 
  conflictSite: string;
  onViewConflict?: () => void;
}> = ({ guardName, conflictSite, onViewConflict }) => (
  <ErrorMessages
    type="guard-conflict"
    message={`${guardName} is already marked present at ${conflictSite}.`}
    action={onViewConflict ? { label: 'View Conflict', onClick: onViewConflict } : undefined}
  />
);

export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorMessages
    type="network-error"
    action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
  />
);

export default ErrorMessages;