import * as React from "react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const PRESETS = [
  {
    label: "All Time",
    getValue: () => null, // Returns null to reset the filter
  },
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      return {
        start: format(startOfDay(today), "yyyy-MM-dd"),
        end: format(endOfDay(today), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        start: format(startOfDay(yesterday), "yyyy-MM-dd"),
        end: format(endOfDay(yesterday), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "Last 7 Days",
    getValue: () => {
      const today = new Date();
      const last7Days = subDays(today, 6);
      return {
        start: format(startOfDay(last7Days), "yyyy-MM-dd"),
        end: format(endOfDay(today), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const today = new Date();
      const last30Days = subDays(today, 29);
      return {
        start: format(startOfDay(last30Days), "yyyy-MM-dd"),
        end: format(endOfDay(today), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "This Week",
    getValue: () => {
      const today = new Date();
      return {
        start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "Last Week",
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        start: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        end: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date();
      return {
        start: format(startOfMonth(today), "yyyy-MM-dd"),
        end: format(endOfMonth(today), "yyyy-MM-dd"),
      };
    },
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    },
  },
];

const DateRangePicker = ({ value, onChange, className }) => {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => {
    if (value?.start && value?.end) {
      try {
        const fromDate = value.start ? new Date(value.start + 'T00:00:00') : undefined;
        const toDate = value.end ? new Date(value.end + 'T00:00:00') : undefined;
        return {
          from: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
          to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
        };
      } catch (e) {
        return { from: undefined, to: undefined };
      }
    }
    return { from: undefined, to: undefined };
  });

  React.useEffect(() => {
    // Only sync with external value if both dates are present
    // This prevents resetting when user is in the middle of selecting a range
    if (value?.start && value?.end) {
      const fromDate = value.start ? new Date(value.start + 'T00:00:00') : undefined;
      const toDate = value.end ? new Date(value.end + 'T00:00:00') : undefined;
      const newFrom = fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined;
      const newTo = toDate && !isNaN(toDate.getTime()) ? toDate : undefined;
      
      setDate((prevDate) => {
        // Only update if the dates are actually different to avoid unnecessary re-renders
        if (
          (newFrom?.getTime() !== prevDate.from?.getTime()) ||
          (newTo?.getTime() !== prevDate.to?.getTime())
        ) {
          return {
            from: newFrom,
            to: newTo,
          };
        }
        return prevDate;
      });
    } else if (!value || (!value.start && !value.end)) {
      // Only reset if we don't have a partial selection in progress
      setDate((prevDate) => {
        if (prevDate.from && !prevDate.to) {
          // User is selecting a range, don't reset
          return prevDate;
        }
        return { from: undefined, to: undefined };
      });
    }
  }, [value]);

  const handleSelect = (range) => {
    if (!range) {
      // User cleared selection
      setDate({ from: undefined, to: undefined });
      return;
    }
    
    // Update local state for visual feedback (this doesn't trigger onChange)
    setDate(range);
    
    // CRITICAL: Only call onChange when BOTH dates are selected (complete range)
    // This prevents triggering filters/reloads when only the first date is clicked
    if (range?.from && range?.to && range.from !== range.to) {
      // Both dates selected and they're different - apply the filter
      onChange({
        start: format(range.from, "yyyy-MM-dd"),
        end: format(range.to, "yyyy-MM-dd"),
      });
      // Close after a small delay to show the selection
      setTimeout(() => setOpen(false), 100);
    } else if (range?.from && range?.to && range.from === range.to) {
      // Same date selected twice - treat as single day range
      onChange({
        start: format(range.from, "yyyy-MM-dd"),
        end: format(range.to, "yyyy-MM-dd"),
      });
      setTimeout(() => setOpen(false), 100);
    }
    // If only start date is selected (range.from exists but range.to doesn't),
    // DON'T call onChange - wait for the second date selection
    // The calendar will stay open waiting for the end date
  };

  const handlePreset = (preset) => {
    const presetValue = preset.getValue();
    
    // Handle "All Time" - reset the filter
    if (presetValue === null) {
      onChange(null);
      setDate({ from: undefined, to: undefined });
    } else {
      // Handle date range presets
      onChange(presetValue);
      setDate({
        from: new Date(presetValue.start + 'T00:00:00'),
        to: new Date(presetValue.end + 'T00:00:00'),
      });
    }
    setTimeout(() => setOpen(false), 100);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setDate({ from: undefined, to: undefined });
    onChange(null);
    setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date.from && !date.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
            {(date.from || date.to) && (
              <X
                className="ml-auto h-4 w-4 cursor-pointer hover:opacity-70"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-w-none" align="start">
          <div className="flex">
            <div className="border-r border-border">
              <div className="p-3">
                <p className="text-sm font-medium mb-2 text-foreground">Quick Filters</p>
                <div className="grid gap-1 min-w-[140px]">
                  {PRESETS.map((preset, index) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal h-8 text-sm hover:bg-accent",
                        index === 0 && "border-b border-border mb-1 pb-2 font-semibold"
                      )}
                      onClick={() => handlePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from || new Date()}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                disabled={false}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { DateRangePicker };
