const ICONS = {
  backtest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 17l5-5 4 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  walkforward: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 4v3h-3M7 20v-3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { mode: "backtest", label: "Strategy Explorer" },
  { mode: "walkforward", label: "Walk Forward Engine" },
  { mode: "live", label: "Live Paper Trading" },
  { mode: "settings", label: "Advanced Settings" },
  { mode: "history", label: "History" },
];

const NavRail = ({ mode, onSelect }) => {
  return (
    <div className="nav-rail">
      <div className="nav-rail-panel">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.mode}
            className={`nav-rail-item ${item.mode} ${mode === item.mode ? "active" : ""}`}
            onClick={() => onSelect(item.mode)}
            title={item.label}
          >
            {ICONS[item.mode]}
            <span className="nav-rail-item-label">{item.label}</span>
            <span className="dot" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default NavRail;
