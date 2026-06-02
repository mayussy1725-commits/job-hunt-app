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

// メモのURL自動リンクコンポーネント
const FormatMemoWithLinks = ({ text }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <div style={{ fontSize: 13, color: "#4b5563", background: "#f9fafb", padding: "6px 10px", borderRadius: 6, marginBottom: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 500 }}>
              {part}
            </a>
          );
        }
        return part;
      })}
    </div>
  );
};

// 🌟 タイムライン表示コンポーネント
const CustomSelectionTimeline = ({ steps, currentStatus }) => {
  const isEnd = currentStatus === "辞退" || currentStatus === "お祈り";
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", marginBottom: 10, border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {steps.map((stepLabel, index) => {
          const isCleared = !isEnd && currentIndex !== -1 && index <= currentIndex;
          
          return (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isCleared ? "#059669" : "#94a3b8", fontWeight: isCleared ? 600 : 400 }}>
              <span>{isCleared ? "✅" : "⬜"}</span>
              <span style={{ textDecoration: isEnd ? "line-through" : "none" }}>{stepLabel}</span>
              {index < steps.length - 1 && <span style={{ color: "#cbd5e1", margin: "0 2px" }}>➔</span>}
            </div>
          );
        })}
        {isEnd && (
          <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
            ⚠️ 選考終了 ({currentStatus})
          </div>
        )}
      </div>
    </div>
  );
};

// デフォルトのマスター選択肢
const DEFAULT_MASTER_STEPS = [
  "検討中",
  "説明会参加",
  "ES提出",
  "適性検査/Webテスト",
  "動画選考",
  "1次面接",
  "2次面接",
  "最終面接",
  "内定"
];

const DEFAULT_EVENT_TYPES = [
  "インターン",
  "会社説明会",
  "ES締切",
  "適性検査/Webテスト",
  "動画選考締切",
  "1次面接",
  "2次面接",
  "最終面接",
  "面談/OB訪問"
];

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

export default function App() {
  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // 各種LocalStorage
  const [masterSteps, setMasterSteps] = useState(() => JSON.parse(localStorage.getItem("master_steps") || JSON.stringify(DEFAULT_MASTER_STEPS)));
  const [eventTypeOptions, setEventTypeOptions] = useState(() => JSON.parse(localStorage.getItem("custom_event_types") || JSON.stringify(DEFAULT_EVENT_TYPES)));
  const [companies, setCompanies] = useState(() => JSON.parse(localStorage.getItem("companies") || "{}"));
  const [events, setEvents] = useState(() => JSON.parse(localStorage.getItem("events") || "[]"));

  useEffect(() => localStorage.setItem("master_steps", JSON.stringify(masterSteps)), [masterSteps]);
  useEffect(() => localStorage.setItem("custom_event_types", JSON.stringify(eventTypeOptions)), [eventTypeOptions]);
  useEffect(() => localStorage.setItem("companies", JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem("events", JSON.stringify(events)), [events]);

  // ===== フォーム用の状態 =====
  const [name, setName] = useState("");
  // 🌟 選択した「順番」を保持するため、初期値を配列で並べる
  const [selectedSteps, setSelectedSteps] = useState(["検討中", "ES提出", "1次面接", "最終面接", "内定"]);
  const [memo, setMemo] = useState("");
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("active");

  // 🌟 クリックした順に配列の末尾に追加・削除する処理
  const handleCheckboxChange = (step) => {
    if (selectedSteps.includes(step)) {
      // 既に選択されている場合は、配列から取り除く
      setSelectedSteps(selectedSteps.filter(s => s !== step));
    } else {
      // 選択されていない場合は、クリックされた順に「末尾に合流」させる
      setSelectedSteps([...selectedSteps, step]);
    }
  };

  const saveCompany = () => {
    if (!name) return;
    const dateStr = getTodayString();
    
    // 🌟 選択された順序（selectedSteps）をそのままフローとして採用する
    const finalSteps = selectedSteps.filter(Boolean);
    if (finalSteps.length === 0) finalSteps.push("検討中");

    if (editing) {
      setCompanies({ 
        ...companies, 
        [name]: { 
          ...companies[name], 
          memo: memo, 
          steps: finalSteps, 
          updatedAt: dateStr 
        } 
      });
    } else {
      setCompanies({ 
        ...companies, 
        [name]: { 
          status: finalSteps[0], 
          steps: finalSteps, 
          memo: memo, 
          createdAt: dateStr, 
          updatedAt: dateStr 
        } 
      });
    }
    setName(""); 
    setSelectedSteps(["検討中", "ES提出", "1次面接", "最終面接", "内定"]); 
    setMemo(""); 
    setEditing(null);
  };

  const handleStatusChange = (company, newStatus) => {
    const info = companies[company];
    setCompanies({
      ...companies,
      [company]: { ...info, status: newStatus, updatedAt: getTodayString() }
    });
  };

  const deleteCompany = (company) => {
    if(!confirm(`${company} のデータを削除しますか？`)) return;
    const next = { ...companies };
    delete next[company];
    setCompanies(next);
    setEvents(events.filter(e => e.company !== company));
  };

  // 選択肢マスターに新しいステップを追加
  const addNewMasterStep = () => {
    const newStep = prompt("新しい選考ステップ候補を入力してください（例: AI面接, グループディスカッション）");
    if (!newStep) return;
    if (masterSteps.includes(newStep)) return alert("既に存在します。");
    setMasterSteps([...masterSteps, newStep]);
    setSelectedSteps([...selectedSteps, newStep]); 
  };

  // ===== カレンダー状態 =====
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);
  const grid = buildMonthGrid(year, month);

  const deleteEvent = (groupId) => {
    setEvents(events.filter(e => String(e.groupId) !== String(groupId)));
  };

  // ===== 予定モーダル状態 =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null); 
  const [modalCompany, setModalCompany] = useState("");
  const [modalType, setModalType] = useState(eventTypeOptions[0] || "");
  const [modalStartDate, setModalStartDate] = useState(todayStr);
  const [modalEndDate, setModalEndDate] = useState(todayStr);
  
  const [isTimeEnabled, setIsTimeEnabled] = useState(true);
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");

  useEffect(() => {
    if (eventTypeOptions.length > 0 && !eventTypeOptions.includes(modalType)) {
      setModalType(eventTypeOptions[0]);
    }
  }, [eventTypeOptions]);

  const openAddModal = (dateStr, companyName = "") => {
    setEditingGroupId(null); 
    setModalStartDate(dateStr); setModalEndDate(dateStr);
    setModalCompany(companyName); setModalType(eventTypeOptions[0] || "");
    setStartHour("09"); setStartMinute("00"); setEndHour("17"); setEndMinute("00");
    setIsTimeEnabled(true); setIsModalOpen(true);
  };

  const openEditModal = (eventItem) => {
    const targetGroupId = String(eventItem.groupId);
    setEditingGroupId(targetGroupId);
    const groupEvents = events.filter(e => String(e.groupId) === targetGroupId);
    const sortedDates = groupEvents.map(e => e.date).sort();
    
    setModalStartDate(sortedDates[0] || eventItem.date);
    setModalEndDate(sortedDates[sortedDates.length - 1] || eventItem.date);
    setModalCompany(eventItem.company || "");
    
    let originalType = eventItem.title;
    if (eventItem.company && eventItem.title.startsWith(`${eventItem.company}：`)) {
      originalType = eventItem.title.replace(`${eventItem.company}：`, "");
    }
    setModalType(eventTypeOptions.includes(originalType) ? originalType : eventTypeOptions[0]);

    if (eventItem.time) {
      const [start, end] = eventItem.time.split("-\u301C");
      if (start?.includes(":")) { const [sh, sm] = start.split(":"); setStartHour(sh); setStartMinute(sm); }
      if (end?.includes(":")) { const [eh, em] = end.split(":"); setEndHour(eh); setEndMinute(em); }
      setIsTimeEnabled(true);
    } else {
      setIsTimeEnabled(false);
    }
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    if (!modalType) return;
    const finalTitle = modalCompany ? `${modalCompany}：${modalType}` : modalType;
    const finalTime = isTimeEnabled ? `${startHour}:${startMinute}〜${endHour}:${endMinute}` : "";
    const groupId = editingGroupId ? String(editingGroupId) : String(Date.now());
    const dateList = getDatesInRange(modalStartDate, modalEndDate);

    const newEntries = dateList.map(date => ({
      id: `${groupId}-${date}`, groupId: groupId, title: finalTitle, date: date, time: finalTime, company: modalCompany
    }));

    if (editingGroupId) {
      setEvents([...events.filter(e => String(e.groupId) !== String(editingGroupId)), ...newEntries]);
    } else {
      setEvents([...events, ...newEntries]);
    }
    setIsModalOpen(false);
  };

  const addNewEventType = () => {
    const newType = prompt("新しい選考予定の種類を入力してください");
    if (!newType) return;
    if (eventTypeOptions.includes(newType)) return alert("既に存在します。");
    setEventTypeOptions([...eventTypeOptions, newType]);
    setModalType(newType);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui", color: "#1f2937" }}>
      <h1 style={{ color: "#111827", marginBottom: 24, fontSize: 28, fontWeight: 800 }}>就活進捗管理アプリ</h1>

      <div style={{ display: "grid", gridTemplateColumns: "460px 1fr", gap: 32 }}>
        {/* ===== 左：企業進捗 ===== */}
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, background: "#f9fafb", display: "flex", flexDirection: "column", maxHeight: "88vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: "#111827", margin: 0, fontSize: 20, fontWeight: 700 }}>企業進捗</h2>
            <button onClick={addNewMasterStep} style={{ fontSize: 11, background: "#fff", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#4b5563" }}>⚙️ 選択肢を増やす</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, padding: 12, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <input placeholder="企業名" value={name} onChange={e => setName(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} disabled={editing !== null} />
            
            {/* ステップをチェックボックスでポチポチ選ぶエリア */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#4b5563", fontWeight: 600, marginBottom: 2 }}>
                この企業にある選考ステップを【順に】選択：
              </label>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6 }}>※クリックした順番でフローが構築されます</div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", maxHeight: "130px", overflowY: "auto", padding: "8px", border: "1px solid #f3f4f6", borderRadius: 6, background: "#fafafa" }}>
                {masterSteps.map((step) => {
                  const orderIndex = selectedSteps.indexOf(step);
                  const isChecked = orderIndex !== -1;
                  
                  return (
                    <label key={step} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", userSelect: "none", background: isChecked ? "#eff6ff" : "transparent", padding: "2px 6px", borderRadius: 4, border: isChecked ? "1px solid #bfdbfe" : "1px solid transparent" }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => handleCheckboxChange(step)} 
                      />
                      <span>{step}</span>
                      {/* 🌟 選択順のインデックス番号を丸数字等で表示 */}
                      {isChecked && (
                        <span style={{ fontSize: 10, background: "#2563eb", color: "#fff", borderRadius: "10px", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <input placeholder="メモ（職種、URLなど）" value={memo} onChange={e => setMemo(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
            
            <button style={{ background: editing ? "#4b5563" : "#2563eb", color: "#fff", borderRadius: 6, padding: "10px", fontWeight: 600, border: "none", cursor: "pointer" }} onClick={saveCompany}>
              {editing ? "変更を確定" : "企業を追加"}
            </button>
            {editing && <button style={{ background: "transparent", color: "#6b7280", border: "none", cursor: "pointer", fontSize: 13 }} onClick={() => { setName(""); setSelectedSteps(["検討中", "ES提出", "1次面接", "最終面接", "内定"]); setMemo(""); setEditing(null); }}>キャンセル</button>}
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#e5e7eb", padding: 4, borderRadius: 8 }}>
            <button onClick={() => setFilter("active")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "active" ? "#fff" : "transparent" }}>選考中</button>
            <button onClick={() => setFilter("archive")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "archive" ? "#fff" : "transparent" }}>終了</button>
            <button onClick={() => setFilter("all")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "all" ? "#fff" : "transparent" }}>すべて</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {Object.entries(companies)
              .filter(([_, info]) => {
                const isEnd = info.status === "辞退" || info.status === "お祈り" || info.status?.includes("内定承諾");
                if (filter === "active") return !isEnd;
                if (filter === "archive") return isEnd;
                return true;
              })
              .map(([company, info]) => {
                const thisCompanySteps = Array.isArray(info.steps) ? info.steps : ["検討中", "内定"];
                const dropdownOptions = [...thisCompanySteps, "辞退", "お祈り"];

                let badgeStyle = { bg: "#e0f2fe", text: "#0369a1" };
                if (info.status === "お祈り") badgeStyle = { bg: "#fee2e2", text: "#b91c1c" };
                if (info.status === "辞退") badgeStyle = { bg: "#e5e7eb", text: "#6b7280" };
                if (info.status?.includes("内定")) badgeStyle = { bg: "#dcfce7", text: "#166534" };

                return (
                  <div key={company} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 2 }}>{company}</div>
                      
                      {(info.createdAt || info.updatedAt) && (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, display: "flex", gap: 12 }}>
                          {info.createdAt && <span>登録: {info.createdAt}</span>}
                          {info.updatedAt && info.updatedAt !== info.createdAt && (
                            <span style={{ color: "#6b7280", fontWeight: 500 }}>更新: {info.updatedAt}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>現在の状況:</span>
                      <select
                        value={info.status}
                        onChange={(e) => handleStatusChange(company, e.target.value)}
                        style={{ fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 20, border: "none", background: badgeStyle.bg, color: badgeStyle.text, cursor: "pointer" }}
                      >
                        {dropdownOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    {/* タイムライン表示 */}
                    <CustomSelectionTimeline steps={thisCompanySteps} currentStatus={info.status} />

                    <FormatMemoWithLinks text={info.memo} />
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 8, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                      <button onClick={() => openAddModal(selected, company)} style={{ fontSize: 12, background: "#eff6ff", color: "#2563eb", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>📅 選考予定を追加</button>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditing(company); setName(company); setSelectedSteps(thisCompanySteps); setMemo(info.memo || ""); }} style={{ fontSize: 12, background: "transparent", color: "#4b5563", border: "none", cursor: "pointer" }}>編集</button>
                        <button onClick={() => deleteCompany(company)} style={{ fontSize: 12, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </aside>

        {/* ===== 右：カレンダー ===== */}
        <main style={{ color: "#000" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
            <button onClick={() => {setYear(today.getFullYear());setMonth(today.getMonth());setSelected(todayStr);}} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>今日</button>
            <button onClick={() => {if (month === 0) {setYear(year - 1);setMonth(11);} else {setMonth(month - 1);}}} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>◀</button>
            <strong style={{ fontSize: 20, color: "#111827", minWidth: 120, textAlign: "center" }}>{year}年 {month + 1}月</strong>
            <button onClick={() => {if (month === 11) {setYear(year + 1);setMonth(0);} else {setMonth(month + 1);}}} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>▶</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 4 }}>
            {["日","月","火","水","木","金","土"].map((d, i) => (
              <div key={d} style={{ padding: 6, fontSize: 13, fontWeight: 600, color: i === 0 ? "#ef4444" : i === 6 ? "#2563eb" : "#4b5563" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {grid.map((c, i) => {
              const ds = ymd(c.y, c.m, c.d);
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const dayEvents = events.filter(e => e.date === ds);

              return (
                <div
                  key={i}
                  onClick={() => setSelected(ds)}
                  onDoubleClick={() => openAddModal(ds)}
                  style={{
                    minHeight: 110,
                    border: isSel ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: c.inMonth ? (isToday ? "#fff7ed" : "#ffffff") : "#f3f4f6",
                    padding: 6,
                    cursor: "pointer",
                    color: c.inMonth ? "#1f2937" : "#9ca3af",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.d}</span>
                    {c.inMonth && (
                      <span onClick={(e) => { e.stopPropagation(); openAddModal(ds); }} style={{ fontSize: 11, color: "#2563eb", opacity: 0.6, cursor: "pointer" }}>＋</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={(e) => { e.stopPropagation(); openEditModal(ev); }} 
                        style={{ fontSize: 11, background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "2px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#bae6fd"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#e0f2fe"}
                      >
                        <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginRight: 4 }} title="クリックして編集">
                          {ev.time ? `${ev.time} ` : ""}{ev.title}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEvent(ev.groupId); }}
                          style={{ border: "none", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer", padding: "0 2px" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ===== モーダル ===== */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: 480, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>
              {editingGroupId ? "📝 選考予定の編集" : "📅 選考予定の追加"}
            </h3>
            
            {/* 期間設定 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>期間設定</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" value={modalStartDate} onChange={e => { setModalStartDate(e.target.value); if(e.target.value > modalEndDate) setModalEndDate(e.target.value); }} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
                <span style={{ color: "#6b7280" }}>〜</span>
                <input type="date" value={modalEndDate} min={modalStartDate} onChange={e => setModalEndDate(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} />
              </div>
            </div>

            {/* 対象企業 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>企業名</label>
              <input placeholder="フリー入力（空欄でもOK）" value={modalCompany} onChange={e => setModalCompany(e.target.value)} style={{ width: "100%", padding: "8px 12px", boxSizing: "border-box", borderRadius: 6, border: "1px solid #d1d5db" }} />
            </div>

            {/* 予定の種類 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>予定の種類</label>
                <button onClick={addNewEventType} style={{ fontSize: 11, background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, padding: 0 }}>＋ 新しい種類を追加</button>
              </div>
              <select value={modalType} onChange={e => setModalType(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff" }}>
                {eventTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* 🕒 時間指定セクション */}
            <div style={{ marginBottom: 20, padding: 14, background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <input type="checkbox" checked={isTimeEnabled} onChange={e => setIsTimeEnabled(e.target.checked)} />
                時間を指定する ({startHour}:{startMinute} 〜 {endHour}:{endMinute})
              </label>

              {isTimeEnabled && (
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", background: "#fff", padding: "10px 0", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  {/* 開始時間 */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>開始</div>
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <select value={startHour} onChange={e => setStartHour(e.target.value)} style={{ padding: "6px 4px", fontSize: 14, fontWeight: "bold", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6", cursor: "pointer" }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}時</option>)}
                      </select>
                      <select value={startMinute} onChange={e => setStartMinute(e.target.value)} style={{ padding: "6px 4px", fontSize: 14, fontWeight: "bold", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6", cursor: "pointer" }}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ color: "#9ca3af", fontSize: 18, fontWeight: "bold", marginTop: 14 }}>〜</div>

                  {/* 終了時間 */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>終了</div>
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <select value={endHour} onChange={e => setEndHour(e.target.value)} style={{ padding: "6px 4px", fontSize: 14, fontWeight: "bold", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6", cursor: "pointer" }}>
                        {HOURS.map(h => <option key={h} value={h}>{h}時</option>)}
                      </select>
                      <select value={endMinute} onChange={e => setStartMinute(e.target.value)} style={{ padding: "6px 4px", fontSize: 14, fontWeight: "bold", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6", cursor: "pointer" }}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}分</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ボタン関係 */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#4b5563", cursor: "pointer", fontWeight: 500 }}>キャンセル</button>
              <button onClick={handleModalSave} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                {editingGroupId ? "変更を保存" : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}