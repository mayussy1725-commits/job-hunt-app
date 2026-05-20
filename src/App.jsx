import { useState, useEffect } from "react";

// ===== 日付ユーティリティ =====
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// 前後月含む6週（42マス）
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

export default function App() {
  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // ===== データ =====
  const [companies, setCompanies] = useState(() => JSON.parse(localStorage.getItem("companies") || "{}"));
  const [events, setEvents] = useState(() => JSON.parse(localStorage.getItem("events") || "[]"));

  useEffect(() => localStorage.setItem("companies", JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem("events", JSON.stringify(events)), [events]);

  // ===== 企業入力 =====
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [editing, setEditing] = useState(null);

  const saveCompany = () => {
    if (!name) return;
    setCompanies({ ...companies, [name]: { status, memo } });
    setName(""); setStatus(""); setMemo(""); setEditing(null);
  };

  const deleteCompany = (company) => {
    const next = { ...companies };
    delete next[company];
    setCompanies(next);
    setEvents(events.filter(e => e.company !== company));
  };

  const addDeadline = (company) => {
    const type = prompt("予定の種類（例：ES締切、面接）");
    const date = prompt("日付（YYYY-MM-DD）");
    if (!type || !date) return;
    setEvents([...events, { id: Date.now(), title: `${company}：${type}`, date, company }]);
  };

  const deleteEvent = (id) => {
    setEvents(events.filter(e => e.id !== id));
  };

  // ===== カレンダー =====
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);
  const [title, setTitle] = useState("");

  const grid = buildMonthGrid(year, month);

  const saveEvent = () => {
    if (!title || !selected) return;
    setEvents([...events, { id: Date.now(), title, date: selected }]);
    setTitle("");
  };

  return (
    <div style={{ padding: 24, maxWidth: "100%", margin: "0 auto", fontFamily: "system-ui", color: "#000" }}>
      <h1 style={{ color: "#000" }}>就活進捗管理アプリ</h1>

      <div style={{ display: "grid", gridTemplateColumns: "480px 1fr", gap: 32 }}>
        {/* ===== 左：企業進捗 ===== */}
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb", color: "#000" }}>
          <h2 style={{ color: "#000" }}>企業進捗</h2>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr", gap: 8, marginBottom: 12 }}>
            <input placeholder="企業名" value={name} onChange={e => setName(e.target.value)} style={{ color: "#000" }} disabled={editing !== null} />
            <input placeholder="進捗" value={status} onChange={e => setStatus(e.target.value)} style={{ color: "#000" }} />
            <input style={{ gridColumn: "1 / -1", color: "#000" }} placeholder="メモ" value={memo} onChange={e => setMemo(e.target.value)} />
            <button style={{ gridColumn: "1 / -1", background: "#2563eb", color: "#fff", borderRadius: 6 }} onClick={saveCompany}>
              {editing ? "更新" : "追加"}
            </button>
          </div>

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {Object.entries(companies).map(([company, info]) => (
              <div key={company} style={{ borderBottom: "1px solid #e5e7eb", padding: "10px 0", color: "#000" }}>
                <div style={{ fontWeight: 600, color: "#000" }}>{company}</div>
                <div style={{ fontSize: 13, color: "#000" }}>進捗：{info.status}</div>
                {info.memo && <div style={{ fontSize: 12, color: "#000" }}>メモ：{info.memo}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => { setEditing(company); setName(company); setStatus(info.status); setMemo(info.memo); }}>編集</button>
                  <button onClick={() => deleteCompany(company)}>削除</button>
                  <button onClick={() => addDeadline(company)}>締切追加</button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ===== 右：カレンダー ===== */}
        <main style={{ color: "#000" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }}>今日</button>
            <button onClick={() => setMonth(m => m === 0 ? (setYear(y => y - 1), 11) : m - 1)}>◀</button>
            <strong style={{ fontSize: 18, color: "#000" }}>{year}年 {month + 1}月</strong>
            <button onClick={() => setMonth(m => m === 11 ? (setYear(y => y + 1), 0) : m + 1)}>▶</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
            {["日","月","火","水","木","金","土"].map((d, i) => (
              <div key={d} style={{ padding: 4, fontSize: 12, fontWeight: 600, color: "#000" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {grid.map((c, i) => {
              const ds = ymd(c.y, c.m, c.d);
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const dayEvents = events.filter(e => e.date === ds);

              return (
                <div
                  key={i}
                  onClick={() => setSelected(ds)}
                  style={{
                    minHeight: 88,
                    border: isSel ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    background: c.inMonth ? (isToday ? "#fff7ed" : "#ffffff") : "#f3f4f6",
                    padding: 4,
                    cursor: "pointer",
                    color: "#000"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#000" }}>{c.d}</div>
                  {dayEvents.map(ev => (
                    <div key={ev.id} style={{ marginTop: 4, fontSize: 11, background: "#e0f2fe", borderRadius: 6, padding: "3px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#000" }}>
                      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#000" }}>{ev.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }}
                        title="予定を削除"
                        style={{ border: "none", background: "transparent", color: "#9ca3af", fontSize: 12, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10 }}>
            <h3 style={{ color: "#000" }}>予定を追加</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="予定" value={title} onChange={e => setTitle(e.target.value)} style={{ color: "#000" }} />
              <input type="date" value={selected} onChange={e => setSelected(e.target.value)} style={{ color: "#000" }} />
              <button onClick={saveEvent} style={{ background: "#16a34a", color: "#fff", borderRadius: 6 }}>追加</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}