import * as React from "react";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";
import { Button } from "./button";

const Drawer = ({ isOpen, onClose, title, children, className, size = 'lg' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    '50%': 'w-1/2',
    '60%': 'w-3/5',
    '70%': 'w-[70%]',
    '80%': 'w-[80%]',
    full: 'w-full',
  };

  const [isMounted, setIsMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      document.body.style.overflow = 'hidden';
      // Small delay to ensure the drawer starts from closed position before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      document.body.style.overflow = '';
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isMounted && !isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-card border-l border-border z-50 shadow-2xl transform transition-all duration-300 ease-out",
          sizeClasses[size],
          isAnimating && isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
          className
        )}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform, opacity',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export { Drawer };

