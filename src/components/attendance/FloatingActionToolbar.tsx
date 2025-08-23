import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Copy, 
  RefreshCw, 
  Settings, 
  Filter,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';

interface FloatingActionToolbarProps {
  onCopyPreviousDay: () => void;
  onRegenerateSlots: () => void;
  onOpenTemporarySlots: () => void;
  onBulkMarkPresent?: () => void;
  onBulkMarkAbsent?: () => void;
  onMarkAllAttendance?: () => void;
  isLoading?: {
    copy?: boolean;
    regenerate?: boolean;
    markAll?: boolean;
  };
  selectedCount?: number;
  disabled?: boolean;
  allGuardsAssigned?: boolean;
}

const FloatingActionToolbar: React.FC<FloatingActionToolbarProps> = ({
  onCopyPreviousDay,
  onRegenerateSlots,
  onOpenTemporarySlots,
  onBulkMarkPresent,
  onBulkMarkAbsent,
  onMarkAllAttendance,
  isLoading = {},
  selectedCount = 0,
  disabled = false,
  allGuardsAssigned = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const primaryActions = [
    {
      key: 'copy',
      icon: Copy,
      label: 'Copy Yesterday',
      onClick: onCopyPreviousDay,
      loading: isLoading.copy,
      variant: 'outline' as const
    },
    {
      key: 'refresh',
      icon: RefreshCw,
      label: 'Refresh Slots',
      onClick: onRegenerateSlots,
      loading: isLoading.regenerate,
      variant: 'outline' as const
    },
    {
      key: 'settings',
      icon: Settings,
      label: 'Temporary Slots',
      onClick: onOpenTemporarySlots,
      loading: false,
      variant: 'outline' as const
    }
  ];

  // Mark all attendance action (only show when all guards are assigned)
  const markAllAction = allGuardsAssigned && onMarkAllAttendance ? {
    key: 'mark-all',
    icon: Users,
    label: 'Mark All Present',
    onClick: onMarkAllAttendance,
    loading: isLoading.markAll,
    variant: 'default' as const,
    className: 'bg-green-600 hover:bg-green-700 text-white'
  } : null;

  const bulkActions = [
    {
      key: 'bulk-present',
      icon: CheckCircle,
      label: 'Mark Present',
      onClick: onBulkMarkPresent,
      loading: false,
      variant: 'default' as const,
      className: 'bg-green-600 hover:bg-green-700'
    },
    {
      key: 'bulk-absent',
      icon: XCircle,
      label: 'Mark Absent',
      onClick: onBulkMarkAbsent,
      loading: false,
      variant: 'destructive' as const
    }
  ];

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Bulk Actions (shown when items are selected) */}
        {selectedCount > 0 && (
          <div className="flex flex-col items-end gap-2 animate-slide-in">
            <div className="bg-background/95 backdrop-blur-md rounded-lg border border-border/50 shadow-lg p-2">
              <div className="flex items-center gap-2 mb-2 px-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedCount} selected
                </Badge>
              </div>
              <div className="flex gap-1">
                {bulkActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Tooltip key={action.key}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={action.variant}
                          onClick={action.onClick}
                          disabled={disabled || action.loading}
                          className={`h-8 px-3 ${action.className || ''}`}
                        >
                          <Icon className={`h-3 w-3 mr-1 ${action.loading ? 'animate-spin' : ''}`} />
                          <span className="text-xs">{action.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {action.label} ({selectedCount} slots)
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Action Toolbar */}
        <div className="flex flex-col items-end gap-2">
          {/* Expanded Actions */}
          {isExpanded && (
            <div className="bg-background/95 backdrop-blur-md rounded-lg border border-border/50 shadow-lg p-2 animate-slide-in">
              <div className="flex flex-col gap-1">
                {/* Mark All Attendance (priority button when all guards assigned) */}
                {markAllAction && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={markAllAction.variant}
                        onClick={markAllAction.onClick}
                        disabled={disabled || markAllAction.loading}
                        className={`h-10 px-4 justify-start ${markAllAction.className || ''}`}
                      >
                        <markAllAction.icon className={`h-4 w-4 mr-2 ${markAllAction.loading ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium">{markAllAction.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Mark all assigned guards as present
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {/* Regular Actions */}
                {primaryActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Tooltip key={action.key}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={action.variant}
                          onClick={action.onClick}
                          disabled={disabled || action.loading}
                          className="h-10 px-4 justify-start"
                        >
                          <Icon className={`h-4 w-4 mr-2 ${action.loading ? 'animate-spin' : ''}`} />
                          <span className="text-sm">{action.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {action.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className="fab shadow-lg"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isExpanded ? 'Hide Actions' : 'Show Actions'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FloatingActionToolbar;