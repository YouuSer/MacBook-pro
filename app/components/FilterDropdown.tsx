"use client";

import { useEffect, useRef, useState } from "react";

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = selected.size > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
          isActive
            ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 text-[var(--accent-blue)]"
            : "border-[var(--border)] text-[var(--fg)] hover:border-[var(--border-hover)]"
        }`}
      >
        {label}
        {isActive && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-blue)] text-white text-[11px] font-bold">
            {selected.size}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] z-50 overflow-hidden">
          <div className="p-2 space-y-0.5">
            {options.map((option) => {
              const checked = selected.has(option);
              return (
                <button
                  key={option}
                  onClick={() => onToggle(option)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    checked
                      ? "bg-[var(--accent-blue)]/8 text-[var(--accent-blue)]"
                      : "text-[var(--fg)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                      checked
                        ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M2 5L4.5 7.5L8 3" />
                      </svg>
                    )}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
          {isActive && (
            <div className="border-t border-[var(--border)] px-3 py-2">
              <button
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
