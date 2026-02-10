"use client";

interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

export function FilterTabs({ activeTab, onTabChange, tabs }: FilterTabsProps) {
  return (
    <div
      className="flex overflow-x-auto no-scrollbar"
      style={{ gap: 8, padding: "0 24px" }}
    >
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex items-center justify-center whitespace-nowrap shrink-0"
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              backgroundColor: isActive ? "#D4622B" : "#FFFFFF",
              color: isActive ? "#FFFFFF" : "#8B7E74",
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              border: isActive ? "none" : "1px solid #EDE6DD",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
