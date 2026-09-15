import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MetricCard = ({ title, value, suffix = "", isColorCoded = false, info }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [coords, setCoords] = useState(null);
  const wrapperRef = useRef(null);

  const hasValue = value !== null && value !== undefined;

  let colorClass = "";
  if (isColorCoded && hasValue) {
    colorClass = parseFloat(value) >= 0 ? "positive" : "negative";
  }

  // The metrics grid clips overflow (for its rounded corners / hairline
  // borders), so the tooltip can't just be positioned relative to the icon —
  // it gets cut off. Instead we portal it to <body> and position it with
  // fixed coordinates from the icon's own bounding box.
  const openTooltip = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
    setShowInfo(true);
  };

  const closeTooltip = () => setShowInfo(false);

  // Close on outside click so a tap on mobile doesn't leave the tooltip stuck open.
  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closeTooltip();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  return (
    <div className="metric-card">
      <h3>
        {title}
        {info && (
          <span
            className="metric-info"
            ref={wrapperRef}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
            onClick={() => (showInfo ? closeTooltip() : openTooltip())}
          >
            <span className="metric-info-icon" aria-label={`About ${title}`}>
              i
            </span>
            {showInfo &&
              coords &&
              createPortal(
                <span
                  className="metric-info-tooltip"
                  style={{ top: coords.top, left: coords.left }}
                >
                  {info}
                </span>,
                document.body
              )}
          </span>
        )}
      </h3>
      <div className={`value ${colorClass}`}>
        {hasValue ? (
          <>
            {value}
            {suffix}
          </>
        ) : (
          "N/A"
        )}
      </div>
    </div>
  );
};

export default MetricCard;
