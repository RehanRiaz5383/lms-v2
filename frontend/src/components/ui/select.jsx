import * as React from "react";
import { cn } from "../../utils/cn";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "./button";

const Select = ({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = "Select items...",
  searchable = true,
  onSearch,
  loading = false,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const selectRef = React.useRef(null);
  
  // Reset search term when dropdown closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track if this is the initial mount to prevent empty search on mount
  const isInitialMount = React.useRef(true);
  const lastSearchTerm = React.useRef('');
  
  // Debounced search effect
  React.useEffect(() => {
    if (!onSearch) return;
    
    // Skip search on initial mount if searchTerm is empty
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Only call onSearch on initial mount if searchTerm is not empty
      if (!searchTerm) {
        lastSearchTerm.current = '';
        return;
      }
    }
    
    // Skip if search term hasn't actually changed
    if (lastSearchTerm.current === searchTerm) {
      return;
    }
    
    lastSearchTerm.current = searchTerm;
    
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm || '');
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);
  
  // Reset initial mount when component is remounted (when key changes)
  React.useEffect(() => {
    isInitialMount.current = true;
    lastSearchTerm.current = '';
  }, [options.length]);

  // Get selected options - use useMemo to prevent unnecessary recalculations
  const selectedOptions = React.useMemo(() => {
    return options.filter((opt) => {
      // Handle both number and string IDs
      const optId = typeof opt.id === 'number' ? opt.id : Number(opt.id);
      return value.some(val => {
        const valId = typeof val === 'number' ? val : Number(val);
        return optId === valId;
      });
    });
  }, [options, value]);
  
  // Filter options - use useMemo to prevent unnecessary recalculations
  const filteredOptions = React.useMemo(() => {
    if (onSearch) {
      // When using API search, always show selected items and items matching search
      return options.filter((option) => {
        const isSelected = value.some(val => {
          const optId = typeof option.id === 'number' ? option.id : Number(option.id);
          const valId = typeof val === 'number' ? val : Number(val);
          return optId === valId;
        });
        const matchesSearch = !searchTerm || option.title?.toLowerCase().includes(searchTerm.toLowerCase());
        return isSelected || matchesSearch;
      });
    } else {
      // Local filtering: show selected items or items matching search
      return options.filter((option) => {
        const matchesSearch = !searchTerm || option.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const isSelected = value.some(val => {
          const optId = typeof option.id === 'number' ? option.id : Number(option.id);
          const valId = typeof val === 'number' ? val : Number(val);
          return optId === valId;
        });
        return isSelected || matchesSearch;
      });
    }
  }, [options, value, searchTerm, onSearch]);

  const toggleOption = (optionId) => {
    // Normalize IDs for comparison
    const normalizedOptionId = typeof optionId === 'number' ? optionId : Number(optionId);
    const newValue = value.some(id => {
      const normalizedId = typeof id === 'number' ? id : Number(id);
      return normalizedId === normalizedOptionId;
    })
      ? value.filter((id) => {
          const normalizedId = typeof id === 'number' ? id : Number(id);
          return normalizedId !== normalizedOptionId;
        })
      : [...value, optionId];
    onChange(newValue);
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    // Normalize IDs for comparison
    const normalizedOptionId = typeof optionId === 'number' ? optionId : Number(optionId);
    onChange(value.filter((id) => {
      const normalizedId = typeof id === 'number' ? id : Number(id);
      return normalizedId !== normalizedOptionId;
    }));
  };

  return (
    <div ref={selectRef} className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-auto min-h-10"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded"
              >
                {option.title}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={(e) => removeOption(option.id, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg">
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions
                .sort((a, b) => {
                  // Sort selected items first
                  const aSelected = value.some(val => {
                    const aId = typeof a.id === 'number' ? a.id : Number(a.id);
                    const valId = typeof val === 'number' ? val : Number(val);
                    return aId === valId;
                  });
                  const bSelected = value.some(val => {
                    const bId = typeof b.id === 'number' ? b.id : Number(b.id);
                    const valId = typeof val === 'number' ? val : Number(val);
                    return bId === valId;
                  });
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  return 0;
                })
                .map((option) => {
                  const isSelected = value.some(val => {
                    const optId = typeof option.id === 'number' ? option.id : Number(option.id);
                    const valId = typeof val === 'number' ? val : Number(val);
                    return optId === valId;
                  });
                  return (
                    <div
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm">{option.title}</span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { Select };

