import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Filter, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Site, SiteEarnings } from "@/types";
import { formatCurrency } from "@/lib/localService";

interface AttendanceDataTableProps {
  sites: Site[];
  siteEarningsMap: Record<string, SiteEarnings>;
  getSiteAttendanceStatus: (site: Site) => {
    status: string;
    dayStatus: string;
    nightStatus: string;
  };
  onSiteClick: (siteId: string) => void;
}

type SiteWithStatus = Site & {
  attendanceStatus: {
    status: string;
    dayStatus: string;
    nightStatus: string;
  };
  earnings: SiteEarnings;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "fully-marked":
      return <Badge className="bg-green-500">Marked</Badge>;
    case "partially-marked":
      return <Badge className="bg-amber-500">Partially Marked</Badge>;
    case "not-marked":
      return <Badge variant="outline" className="border-red-200 text-red-500">Not Marked</Badge>;
    case "no-shifts":
      return <Badge variant="outline" className="border-gray-200 text-gray-500">No Shifts</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getShiftStatusBadge = (status: string) => {
  switch (status) {
    case "fully-marked":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Marked</Badge>;
    case "partially-marked":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Partial</Badge>;
    case "not-marked":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Marked</Badge>;
    case "no-shifts":
      return <Badge variant="outline" className="text-gray-400">N/A</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export function AttendanceDataTable({
  sites,
  siteEarningsMap,
  getSiteAttendanceStatus,
  onSiteClick,
}: AttendanceDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Transform data to include status and earnings
  const data = useMemo<SiteWithStatus[]>(() => {
    return sites.map((site) => ({
      ...site,
      attendanceStatus: getSiteAttendanceStatus(site),
      earnings: siteEarningsMap[site.id] || {
        totalShifts: 0,
        allocatedAmount: 0,
        guardCosts: 0,
        netEarnings: 0,
      },
    }));
  }, [sites, siteEarningsMap, getSiteAttendanceStatus]);

  const columns: ColumnDef<SiteWithStatus>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Site Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "location",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Location
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue("location")}</div>,
    },
    {
      id: "dayShift",
      header: "Day Shift",
      cell: ({ row }) => {
        const status = row.original.attendanceStatus.dayStatus;
        return getShiftStatusBadge(status);
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.attendanceStatus.dayStatus);
      },
    },
    {
      id: "nightShift",
      header: "Night Shift",
      cell: ({ row }) => {
        const status = row.original.attendanceStatus.nightStatus;
        return getShiftStatusBadge(status);
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.attendanceStatus.nightStatus);
      },
    },
    {
      id: "overallStatus",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.original.attendanceStatus.status;
        return getStatusBadge(status);
      },
      sortingFn: (rowA, rowB, columnId) => {
        const statusOrder = {
          "fully-marked": 4,
          "partially-marked": 3,
          "not-marked": 2,
          "no-shifts": 1,
        };
        const aStatus = rowA.original.attendanceStatus.status;
        const bStatus = rowB.original.attendanceStatus.status;
        return statusOrder[aStatus as keyof typeof statusOrder] - statusOrder[bStatus as keyof typeof statusOrder];
      },
      filterFn: (row, id, value) => {
        return value.includes(row.original.attendanceStatus.status);
      },
    },
    {
      id: "earnings",
      accessorFn: (row) => row.earnings.netEarnings,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Monthly Earnings
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const earnings = row.original.earnings.netEarnings;
        return (
          <div className="flex items-center">
            <span className={earnings > 0 ? "text-green-600" : earnings < 0 ? "text-red-600" : ""}>
              {formatCurrency(earnings)}
            </span>
          </div>
        );
      },
      sortingFn: "basic",
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const site = row.original;

        return (
          <div className="text-right">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onSiteClick(site.id);
              }}
            >
              Mark Attendance
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const site = row.original;
      const searchValue = filterValue.toLowerCase();
      return (
        site.name.toLowerCase().includes(searchValue) ||
        (site.location || "").toLowerCase().includes(searchValue)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <Input
          placeholder="Search by site name or location..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />

        {/* Status Filter */}
        <Select
          value={
            (table.getColumn("overallStatus")?.getFilterValue() as string[])?.join(",") || ""
          }
          onValueChange={(value) => {
            table
              .getColumn("overallStatus")
              ?.setFilterValue(value ? value.split(",") : []);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fully-marked">Fully Marked</SelectItem>
            <SelectItem value="partially-marked">Partially Marked</SelectItem>
            <SelectItem value="not-marked">Not Marked</SelectItem>
            <SelectItem value="no-shifts">No Shifts</SelectItem>
          </SelectContent>
        </Select>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSiteClick(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}