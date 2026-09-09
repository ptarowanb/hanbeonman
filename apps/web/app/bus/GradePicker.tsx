"use client";

import { useState } from "react";

type Grade = { id: string; name: string };

type GradeResponse = {
  status: "OK" | "EMPTY" | "NEEDS_ATTENTION" | "FAILED";
  items?: Grade[];
  error?: { message: string };
};

type GradePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function GradePicker({ value, onChange }: GradePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Grade[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function findGrades() {
    setNotice("");
    setItems([]);
    setIsLoading(true);
    try {
      const response = await fetch("/api/tago/grades?numOfRows=20", {
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as GradeResponse;
      if (!response.ok || payload.status === "NEEDS_ATTENTION" || payload.status === "FAILED") {
        setNotice(payload.error?.message ?? "버스등급을 불러오지 못했습니다.");
        return;
      }
      if (payload.status === "EMPTY" || !payload.items?.length) {
        setNotice("사용할 수 있는 버스등급이 없습니다.");
        return;
      }
      setItems(payload.items);
    } catch {
      setNotice("버스등급을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  function chooseGrade(grade: Grade) {
    onChange(grade.id);
    setSelectedName(grade.name);
    setItems([]);
    setNotice("");
    setIsOpen(false);
  }

  return (
    <div className="bus-grade-field">
      <p className="bus-field-label">버스 등급</p>
      <p className="bus-grade-value">{value ? selectedName || `코드 ${value}` : "전체 등급"}</p>
      <button
        type="button"
        className="bus-lookup-button"
        aria-label="버스등급 검색"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setNotice("");
          setItems([]);
        }}
      >
        등급 선택
      </button>
      {isOpen && (
        <div className="bus-grade-lookup" role="dialog" aria-label="버스등급 검색">
          <button
            type="button"
            className="bus-lookup-submit"
            aria-label="버스등급 찾기"
            onClick={findGrades}
            disabled={isLoading}
          >
            {isLoading ? "불러오는 중…" : "등급 불러오기"}
          </button>
          {notice && <p className="bus-lookup-notice" role="status">{notice}</p>}
          {items.length > 0 && (
            <ul className="bus-terminal-options">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => chooseGrade(item)}>
                    {item.name} · {item.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="bus-grade-reset" onClick={() => { onChange(""); setSelectedName(""); setIsOpen(false); }}>
            전체 등급
          </button>
        </div>
      )}
    </div>
  );
}
