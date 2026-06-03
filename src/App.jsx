import { useState, useEffect } from "react";

// ===== 日付ユーティリティ =====
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
};

const getDatesInRange = (startDateStr, endDateStr) => {
  const dates = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (start > end) return [startDateStr];
  const current = new Date(start);
  while (current <= end) {
    dates.push(ymd(current.getFullYear(), current.getMonth(), current.getDate()));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const buildMonthGrid = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevDays - i;
    const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
    cells.push({ y: prev.y, m: prev.m, d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ y: year, m: month, d, inMonth: true });
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  let d = 1;
  while (cells.length < 42) cells.push({ y: next.y, m: next.m, d: d++, inMonth: false });
  return cells;
};

// ===== メイン =====
export default function App() {
  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // ⭐️ レスポンシブ追加
  const [viewMode, setViewMode] = useState("auto");
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile =
    viewMode === "mobile" ||
    (viewMode === "auto" && screenWidth < 768);

  // ===== LocalStorage =====
  const [companies, setCompanies] = useState(() =>
    JSON.parse(localStorage.getItem("companies") || "{}")
  );
  const [events, setEvents] = useState(() =>
    JSON.parse(localStorage.getItem("events") || "[]")
  );

  useEffect(() => localStorage.setItem("companies", JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem("events", JSON.stringify(events)), [events]);

  // ===== カレンダー =====
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);
  const grid = buildMonthGrid(year, month);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28 }}>就活進捗管理アプリ</h1>

      {/* ⭐️ 切替ボタン */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button onClick={() => setViewMode("pc")}>PC</button>
        <button onClick={() => setViewMode("mobile")}>スマホ</button>
        <button onClick={() => setViewMode("auto")}>自動</button>
      </div>

      {/* ⭐️ レイアウト */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "460px 1fr",
          gap: isMobile ? 16 : 32
        }}
      >
        {/* ===== 左 ===== */}
        <aside
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 10,
            maxHeight: isMobile ? "none" : "88vh",
            overflow: "auto"
          }}
        >
          <h2>企業管理</h2>
          <div>（元の企業UIここにそのまま入る）</div>
        </aside>

        {/* ===== 右 ===== */}
        <main>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setMonth(month - 1)}>◀</button>
            <strong>{year}年 {month + 1}月</strong>
            <button onClick={() => setMonth(month + 1)}>▶</button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: isMobile ? 2 : 4
            }}
          >
            {grid.map((c, i) => {
              const ds = ymd(c.y, c.m, c.d);
              const dayEvents = events.filter(e => e.date === ds);

              return (
                <div
                  key={i}
                  style={{
                    minHeight: isMobile ? 80 : 110,
                    border: "1px solid #ddd",
                    padding: isMobile ? 4 : 6,
                    fontSize: isMobile ? 11 : 13
                  }}
                >
                  <div>{c.d}</div>
                  {dayEvents.map(e => (
                    <div key={e.id}>{e.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
