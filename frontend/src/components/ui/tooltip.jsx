import * as React from "react";
import { cn } from "../../utils/cn";

const Tooltip = ({ children, content, side = "top" }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const childRef = React.useRef(null);

  React.useEffect(() => {
    if (isVisible && childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (side) {
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case "top":
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        default:
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
      }

      setPosition({ top, left });
    }
  }, [isVisible, side]);

  const arrowPositions = {
    top: "bottom-full left-1/2 -translate-x-1/2 border-t-gray-900",
    bottom: "top-full left-1/2 -translate-x-1/2 border-b-gray-900",
    left: "right-full top-1/2 -translate-y-1/2 border-l-gray-900",
    right: "left-full top-1/2 -translate-y-1/2 border-r-gray-900",
  };

  const arrowTransforms = {
    top: { transform: "translate(-50%, 100%)" },
    bottom: { transform: "translate(-50%, -100%)" },
    left: { transform: "translate(100%, -50%)" },
    right: { transform: "translate(-100%, -50%)" },
  };

  return (
    <div
      ref={childRef}
      className="relative inline-block w-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="fixed px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none z-[10001]"
          style={{ 
            top: side === "top" || side === "bottom" ? `${position.top}px` : `${position.top}px`,
            left: side === "left" || side === "right" ? `${position.left}px` : `${position.left}px`,
            transform: side === "top" || side === "bottom" ? "translate(-50%, -100%)" : side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)",
            zIndex: 10001,
          }}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-4 border-transparent",
              arrowPositions[side]
            )}
            style={arrowTransforms[side]}
          />
        </div>
      )}
    </div>
  );
};

export { Tooltip };

