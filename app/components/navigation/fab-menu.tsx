"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export function FABMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const menuItems = [
    {
      label: "Record",
      path: "/record",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 2v4m0 12v4M2 12h4m12 0h4"
          />
        </svg>
      ),
    },
    {
      label: "Transcripts",
      path: "/transcripts",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      label: "Settings",
      path: "/settings",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50"
    >
      {isExpanded && (
        <div className="flex flex-col gap-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  router.push(item.path);
                  setIsExpanded(false);
                }}
                className={`
                  flex items-center gap-3 rounded-full px-4 py-3 shadow-lg
                  transition-all transform hover:scale-105
                  ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-white text-foreground hover:bg-muted"
                  }
                `}
                style={{
                  animation: "slideInRight 0.2s ease-out",
                }}
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10">
                  {item.icon}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          transition-all transform hover:scale-110
          ${isExpanded ? "bg-foreground text-background" : "bg-primary text-white"}
        `}
        aria-label="Menu"
      >
        <svg
          className={`w-6 h-6 transition-transform ${
            isExpanded ? "rotate-45" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
