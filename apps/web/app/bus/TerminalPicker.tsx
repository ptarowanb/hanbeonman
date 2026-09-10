"use client";

import { useState } from "react";
import { filterLookupItems, type LookupItem } from "./lookup";

type TerminalPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: LookupItem[];
  isLoading: boolean;
  error?: string;
};

export default function TerminalPicker({
  label,
  value,
  onChange,
  items,
  isLoading,
  error,
}: TerminalPickerProps) {
  const selectId = `${label}-terminal`;
  const searchId = `${label}-terminal-search`;
  const searchPanelId = `${label}-terminal-search-panel`;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredItems = filterLookupItems(items, search);

  return (
    <div className="bus-form-field bus-terminal-field">
      <label htmlFor={selectId}>{label} 터미널</label>
      <div className="bus-terminal-control">
        <select
          id={selectId}
          aria-label={`${label} 터미널`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading || items.length === 0}
        >
          <option value="">
            {isLoading ? "터미널 불러오는 중…" : "터미널을 선택하세요"}
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.id}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="bus-terminal-search-button"
          aria-label={`${label} 터미널 검색`}
          aria-expanded={isSearchOpen}
          aria-controls={searchPanelId}
          disabled={isLoading}
          onClick={() => {
            setIsSearchOpen((current) => !current);
            setSearch("");
          }}
        >
          검색
        </button>
        {isSearchOpen && (
          <div
            id={searchPanelId}
            className="bus-terminal-search-panel"
            role="dialog"
            aria-label={`${label} 터미널 검색 패널`}
          >
            <label htmlFor={searchId}>{label} 터미널 이름 검색</label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="예: 서울 또는 NAEK010"
              autoComplete="off"
              autoFocus
            />
            {search && filteredItems.length === 0 && (
              <p className="bus-terminal-search-empty">일치하는 터미널이 없습니다.</p>
            )}
            {filteredItems.length > 0 && (
              <ul className="bus-terminal-search-options">
                {filteredItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={item.id === value}
                      onClick={() => {
                        onChange(item.id);
                        setSearch("");
                        setIsSearchOpen(false);
                      }}
                    >
                      {item.name} · {item.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="bus-field-error" role="status">{error}</p>}
    </div>
  );
}
