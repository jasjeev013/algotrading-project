import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  suffix?: string;
  isColorCoded?: boolean;
  info?: string;
}

const MetricCard = ({ title, value, suffix = "", isColorCoded = false, info }: MetricCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  const hasValue = value !== null && value !== undefined;

  let colorClass = "";
  if (isColorCoded && hasValue) {
    colorClass = value >= 0 ? "text-positive" : "text-negative";
  }

  const openTooltip = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShowInfo(true);
  };
  const closeTooltip = () => setShowInfo(false);

  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) closeTooltip();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-1.5 border-b-0 pb-0">
        <CardTitle className="flex items-center gap-1.5">
          {title}
          {info && (
            <span
              className="relative inline-flex"
              ref={wrapperRef}
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
              onClick={() => (showInfo ? closeTooltip() : openTooltip())}
            >
              <span
                className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-muted-foreground text-[9px] font-bold not-italic text-muted-foreground"
                aria-label={`About ${title}`}
              >
                i
              </span>
              {showInfo &&
                coords &&
                createPortal(
                  <span
                    className="fixed z-[1000] w-[200px] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border border-border bg-background p-2 text-[11px] font-normal leading-relaxed text-foreground shadow-md"
                    style={{ top: coords.top, left: coords.left }}
                  >
                    {info}
                  </span>,
                  document.body,
                )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={cn("text-xl font-bold tabular-nums", colorClass)}>
          {hasValue ? (
            <>
              {value}
              {suffix}
            </>
          ) : (
            "N/A"
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
