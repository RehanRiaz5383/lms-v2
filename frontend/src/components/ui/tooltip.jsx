import * as React from "react";
import { cn } from "../../utils/cn";

const Tooltip = ({ children, content, side = "top" }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrows = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-border",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-border",
    left: "left-full top-1/2 -translate-y-1/2 border-l-border",
    right: "right-full top-1/2 -translate-y-1/2 border-r-border",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap",
            positions[side]
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-4 border-transparent",
              arrows[side]
            )}
          />
        </div>
      )}
    </div>
  );
};

export { Tooltip };

