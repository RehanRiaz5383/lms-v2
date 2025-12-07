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

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (onSearch && searchTerm) {
      const timeoutId = setTimeout(() => {
        onSearch(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, onSearch]);

  const filteredOptions = options.filter((option) =>
    option.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = options.filter((opt) => value.includes(opt.id));

  const toggleOption = (optionId) => {
    const newValue = value.includes(optionId)
      ? value.filter((id) => id !== optionId)
      : [...value, optionId];
    onChange(newValue);
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== optionId));
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
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.id);
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

