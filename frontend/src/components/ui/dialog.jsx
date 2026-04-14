import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";
import { Button } from "./button";

/** Above sidebar (50) and chat shells (~10000); portaled so not clipped by main stacking. */
const DIALOG_Z = "z-[10250]";

const Dialog = ({ isOpen, onClose, title, children, className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center bg-black/50 p-4 animate-backdrop-in",
          DIALOG_Z
        )}
        onClick={onClose}
      >
        {/* Dialog */}
        <div
          className={cn(
            'w-full rounded-lg border border-border bg-card shadow-xl animate-dialog-in',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export { Dialog };

