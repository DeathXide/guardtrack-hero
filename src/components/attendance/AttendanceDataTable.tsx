import React, { useState, useMemo, useEffect } from "react";
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
import { Site, SiteEarnings } from "@/types";
import { guardUtils } from "@/lib/guardsApi";

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
  
  // Load saved table state from sessionStorage
  const [pagination, setPagination] = useState(() => {
    const saved = sessionStorage.getItem('attendance-table-pagination');
    console.log('Loading saved pagination:', saved);
    const parsed = saved ? JSON.parse(saved) : { pageIndex: 0, pageSize: 10 };
    console.log('Parsed pagination:', parsed);
    return parsed;
  });

  // Load other saved states
  useEffect(() => {
    const savedSorting = sessionStorage.getItem('attendance-table-sorting');
    const savedFilters = sessionStorage.getItem('attendance-table-filters');
    const savedGlobalFilter = sessionStorage.getItem('attendance-table-global-filter');
    const savedVisibility = sessionStorage.getItem('attendance-table-visibility');

    if (savedSorting) setSorting(JSON.parse(savedSorting));
    if (savedFilters) setColumnFilters(JSON.parse(savedFilters));
    if (savedGlobalFilter) setGlobalFilter(JSON.parse(savedGlobalFilter));
    if (savedVisibility) setColumnVisibility(JSON.parse(savedVisibility));
  }, []);

  // Prevent pagination reset when data changes
  const stablePagination = useMemo(() => pagination, [pagination.pageIndex, pagination.pageSize]);

  // Save table state to sessionStorage whenever it changes
  useEffect(() => {
    console.log('Saving pagination to sessionStorage:', pagination);
    sessionStorage.setItem('attendance-table-pagination', JSON.stringify(pagination));
  }, [pagination]);

  useEffect(() => {
    sessionStorage.setItem('attendance-table-sorting', JSON.stringify(sorting));
  }, [sorting]);

  useEffect(() => {
    sessionStorage.setItem('attendance-table-filters', JSON.stringify(columnFilters));
  }, [columnFilters]);

  useEffect(() => {
    sessionStorage.setItem('attendance-table-global-filter', JSON.stringify(globalFilter));
  }, [globalFilter]);

  useEffect(() => {
    sessionStorage.setItem('attendance-table-visibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

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
              {guardUtils.formatCurrency(earnings)}
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
            // Save current table state before navigating
            console.log('Clicking Mark Attendance - Current pagination:', pagination);
            sessionStorage.setItem('attendance-table-return-flag', 'true');
            sessionStorage.setItem('attendance-table-pagination', JSON.stringify(pagination));
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
    manualPagination: false,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
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
      pagination: stablePagination,
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

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-[70px] rounded border border-input bg-background px-2 py-1 text-sm"
            >
              {[5, 10, 20, 30, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {"<"}
            </Button>
            
            {/* Page Numbers */}
            {(() => {
              const pageCount = table.getPageCount();
              const currentPage = table.getState().pagination.pageIndex;
              const maxVisiblePages = 5;
              
              let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(pageCount - 1, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(0, endPage - maxVisiblePages + 1);
              }
              
              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={i === currentPage ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => table.setPageIndex(i)}
                  >
                    {i + 1}
                  </Button>
                );
              }
              return pages;
            })()}
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}