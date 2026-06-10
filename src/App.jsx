import { useState, useEffect } from "react";
// 🌟 Google Gemini APIの部品を読み込む
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🌟 APIキーの設定（環境変数から安全に読み込みます）
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6LD4UyOGM7uDLCV3UqZpzSb_5na6OYka-poeCSC0ERrIA";
const genAI = new GoogleGenerativeAI(API_KEY);

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
    cells.push({ y: prev.y, m: prev.m, d, inMonth: false, dow: (new Date(prev.y, prev.m, d)).getDay() });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d, inMonth: true, dow: (new Date(year, month, d)).getDay() });
  }
  const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
  let d = 1;
  while (cells.length < 42) {
    cells.push({ y: next.y, m: next.m, d: d++, inMonth: false, dow: (new Date(next.y, next.m, d - 1)).getDay() });
  }
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

// タイムライン表示コンポーネント
const CustomSelectionTimeline = ({ steps = [], currentStatus }) => {
  const isEnd = currentStatus === "辞退" || currentStatus === "お祈り" || currentStatus?.includes("内定");
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", marginBottom: 10, border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {steps.map((stepLabel, index) => {
          const isCleared = currentIndex !== -1 && index <= currentIndex;

          return (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: isCleared ? "#059669" : "#94a3b8", fontWeight: isCleared ? 600 : 400 }}>
              <span>{isCleared ? "✅" : "⬜"}</span>
              <span>{stepLabel}</span>
              {index < steps.length - 1 && <span style={{ color: "#cbd5e1", margin: "0 2px" }}>➔</span>}
            </div>
          );
        })}
        {(currentStatus === "辞退" || currentStatus === "お祈り") && (
          <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
            ⚠️ 選考終了 ({currentStatus})
          </div>
        )}
        {currentStatus?.includes("内定") && (
          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>
            🎉 内定獲得！おめでとうございます！
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

// ===== メイン =====
export default function App() {
  const today = new Date();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // 各種LocalStorage
  const [masterSteps, setMasterSteps] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("master_steps") || JSON.stringify(DEFAULT_MASTER_STEPS));
    }
    return DEFAULT_MASTER_STEPS;
  });
  const [eventTypeOptions, setEventTypeOptions] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("custom_event_types") || JSON.stringify(DEFAULT_EVENT_TYPES));
    }
    return DEFAULT_EVENT_TYPES;
  });
  const [companies, setCompanies] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("companies") || "{}");
    }
    return {};
  });
  const [events, setEvents] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("events") || "[]");
    }
    return [];
  });
  
  // 画面幅による自動レスポンシブ
  const [screenWidth, setScreenWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screenWidth < 768;

  // LocalStorageへの同期
  useEffect(() => localStorage.setItem("master_steps", JSON.stringify(masterSteps)), [masterSteps]);
  useEffect(() => localStorage.setItem("custom_event_types", JSON.stringify(eventTypeOptions)), [eventTypeOptions]);
  useEffect(() => localStorage.setItem("companies", JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem("events", JSON.stringify(events)), [events]);

  // ===== フォーム用の状態 =====
  const [name, setName] = useState("");
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [memo, setMemo] = useState("");
  const [aiResearchResult, setAiResearchResult] = useState(""); // 🌟企業研究の一時保存用
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("active");

  // 🌟 AI用のローディング・結果表示用
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(""); // 🌟 ES添削の一時保存用

  // 🌟 アコーディオンの開閉管理（開いている企業の名前を保存する）
  const [expandedCompanyName, setExpandedCompanyName] = useState(null);

  const handleCheckboxChange = (step) => {
    if (selectedSteps.includes(step)) {
      setSelectedSteps(selectedSteps.filter(s => s !== step));
    } else {
      setSelectedSteps([...selectedSteps, step]);
    }
  };

  const saveCompany = () => {
    if (!name) return;
    const dateStr = getTodayString();
    const finalSteps = selectedSteps.filter(Boolean);
    if (finalSteps.length === 0) finalSteps.push("検討中");

    const nextCompanies = { ...companies };

    if (editing) {
      if (editing !== name) {
        delete nextCompanies[editing];
      }
      nextCompanies[name] = {
        ...companies[editing],
        steps: finalSteps,
        memo: memo,
        aiResearch: aiResearchResult, // 🌟 企業研究を保存
        aiEsCheck: aiResult,          // 🌟 ES添削結果を保存
        updatedAt: dateStr
      };
    } else {
      nextCompanies[name] = {
        status: finalSteps[0],
        steps: finalSteps,
        memo: memo,
        aiResearch: aiResearchResult, // 🌟 企業研究を保存
        aiEsCheck: aiResult,          // 🌟 ES添削結果を保存
        createdAt: dateStr,
        updatedAt: dateStr
      };
    }

    setCompanies(nextCompanies);
    setName("");
    setSelectedSteps([]);
    setMemo("");
    setAiResearchResult("");
    setAiResult("");
    setEditing(null);
  };

  const handleStatusChange = (e, company, newStatus) => {
    e.stopPropagation(); // アコーディオンの開閉を防止
    const info = companies[company];
    setCompanies({
      ...companies,
      [company]: { ...info, status: newStatus, updatedAt: getTodayString() }
    });
  };

  const deleteCompany = (e, company) => {
    e.stopPropagation(); // アコーディオンの開閉を防止
    if(!confirm(`${company} のデータを削除しますか？`)) return;
    const next = { ...companies };
    delete next[company];
    setCompanies(next);
    setEvents(events.filter(e => e.company !== company));
  };

  const handleEditClick = (e, company, info, thisCompanySteps) => {
    e.stopPropagation(); // アコーディオンの開閉を防止
    setEditing(company);
    setName(company);
    setSelectedSteps(thisCompanySteps);
    setMemo(info.memo || "");
    setAiResearchResult(info.aiResearch || "");
    setAiResult(info.aiEsCheck || ""); // 🌟 編集時に保存されているES添削結果を展開
  };

  const addNewMasterStep = () => {
    const newStep = prompt("新しい選考ステップ候補を入力してください（例: AI面接, グループディスカッション）");
    if (!newStep) return;
    if (masterSteps.includes(newStep)) return alert("既に存在します。");
    setMasterSteps([...masterSteps, newStep]);
    setSelectedSteps([...selectedSteps, newStep]);
  };

  // 🌟 本物のAI企業研究機能
  const handleAiResearch = async () => {
    if (!name.trim()) {
      alert("企業名を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResearchResult("");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `あなたは優秀な就職活動のアシスタントです。「${name}」という企業について、以下の形式で300文字程度で企業研究レポートを作成してください。
      
【${name} の企業研究レポート】
■ 企業概要と強み:
■ 求められる人物像:
■ 面接対策アドバイス:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResearchResult(response.text());
    } catch (error) {
      console.error(error);
      alert("❌ AI企業研究の呼び出しに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setAiLoading(false);
    }
  };

  // 🌟 本物のAI ES添削機能
  const handleAiEsCheck = async () => {
    if (!memo.trim()) {
      alert("メモ欄に、添削したいES（志望動機や自己PR）を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResult("");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `あなたはプロの就活キャリアアドバイザーです。以下の文章を読み、就活生の強みがより人事担当者に伝わるように添削してください。
良い点と、具体的な改善アドバイス（ビフォーアフターの文章例など）を分かりやすく回答してください。

【添削する文章】
${memo}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResult(response.text());
    } catch (error) {
      console.error(error);
      setAiResult("❌ AI添削の呼び出しに失敗しました。");
    } finally {
      setAiLoading(false);
    }
  };

  // アコーディオン開閉トグル
  const toggleAccordion = (companyName) => {
    if (expandedCompanyName === companyName) {
      setExpandedCompanyName(null);
    } else {
      setExpandedCompanyName(companyName);
    }
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
  const [modalType, setModalType] = useState("");
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
  }, [eventTypeOptions, modalType]);

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
      const [start, end] = eventItem.time.split("〜");
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
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1400, margin: "0 auto", fontFamily: "system-ui", color: "#1f2937" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#111827", margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>就活進捗管理アプリ</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "460px 1fr", gap: isMobile ? 16 : 32 }}>
        
        {/* ===== 左：企業管理サイドバー ===== */}
        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, background: "#f9fafb", display: "flex", flexDirection: "column", maxHeight: isMobile ? "none" : "88vh" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: "#111827", margin: 0, fontSize: 18, fontWeight: 700 }}>企業管理</h2>
            <button onClick={addNewMasterStep} style={{ fontSize: 11, background: "#fff", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#4b5563" }}>⚙️ 選択肢を増やす</button>
          </div>

          {/* フォーム入力 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, padding: 12, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <input placeholder="企業名" value={name} onChange={e => setName(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db" }} disabled={editing !== null} />

            <div style={{ marginTop: 4, marginBottom: 4 }}>
              <button
                type="button"
                onClick={handleAiResearch}
                disabled={aiLoading}
                style={{ width: "100%", background: "#6200ee", color: "white", padding: "8px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 12 }}
              >
                {aiLoading ? "Geminiが分析中..." : "🔍 入力した企業名で本物のAI企業研究"}
              </button>
            </div>

            {/* 🌟 企業研究結果の独立表示枠 */}
            {aiResearchResult && (
              <div style={{ background: "#f0f4f9", padding: "10px", borderRadius: 6, borderLeft: "4px solid #6200ee", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto", textAlign: "left" }}>
                {aiResearchResult}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 11, color: "#4b5563", fontWeight: 600, marginBottom: 2 }}>
                この企業にある選考ステップを【順に】選択：
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", maxHeight: "110px", overflowY: "auto", padding: "8px", border: "1px solid #f3f4f6", borderRadius: 6, background: "#fafafa" }}>
                {masterSteps.map((step) => {
                  const orderIndex = selectedSteps.indexOf(step);
                  const isChecked = orderIndex !== -1;

                  return (
                    <label key={step} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", userSelect: "none", background: isChecked ? "#eff6ff" : "transparent", padding: "2px 6px", borderRadius: 4, border: isChecked ? "1px solid #bfdbfe" : "1px solid transparent" }}>
                      <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxChange(step)} />
                      <span>{step}</span>
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

            <textarea placeholder="自由メモ（職種、URL、ESなど）" value={memo} onChange={e => setMemo(e.target.value)} rows="3" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontFamily: "inherit", fontSize: 13 }} />

            <div style={{ marginBottom: 4 }}>
              <button
                type="button"
                onClick={handleAiEsCheck}
                disabled={aiLoading}
                style={{ width: "100%", background: "#03dac6", color: "black", padding: "6px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 11 }}
              >
                {aiLoading ? "Geminiが添削中..." : "✍️ メモ欄の文章を本物のAI添削"}
              </button>
            </div>

            {/* 🌟 ES添削結果の表示枠 */}
            {aiResult && (
              <div style={{ background: "#e6fffa", padding: "10px", borderRadius: 6, borderLeft: "4px solid #03dac6", fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto", textAlign: "left" }}>
                <strong>【AIの添削結果】</strong><br/>{aiResult}
              </div>
            )}

            <button style={{ background: editing ? "#4b5563" : "#2563eb", color: "#fff", borderRadius: 6, padding: "10px", fontWeight: 600, border: "none", cursor: "pointer" }} onClick={saveCompany}>
              {editing ? "変更を確定" : "企業を追加"}
            </button>
            {editing && <button style={{ background: "transparent", color: "#6b7280", border: "none", cursor: "pointer", fontSize: 13 }} onClick={() => { setName(""); setSelectedSteps([]); setMemo(""); setAiResearchResult(""); setAiResult(""); setEditing(null); }}>キャンセル</button>}
          </div>

          {/* フィルター切り替え */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#e5e7eb", padding: 4, borderRadius: 8 }}>
            <button onClick={() => setFilter("active")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "active" ? "#fff" : "transparent" }}>選考中</button>
            <button onClick={() => setFilter("archive")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "archive" ? "#fff" : "transparent" }}>終了</button>
            <button onClick={() => setFilter("all")} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filter === "all" ? "#fff" : "transparent" }}>すべて</button>
          </div>

          {/* 企業リスト表示 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {Object.entries(companies)
              .filter(([_, info]) => {
                // 🌟 修正点：「内定」を選んだ場合も選考終了（アーカイブ）扱いにする
                const isEnd = info.status === "辞退" || info.status === "お祈り" || info.status?.includes("内定");
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

                const isExpanded = expandedCompanyName === company;

                return (
                  <div 
                    key={company} 
                    onClick={() => toggleAccordion(company)}
                    style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 10, cursor: "pointer", textAlign: "left" }}
                  >
                    {/* アコーディオンヘッダー */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                        {isExpanded ? "▼ " : "▶ "} {company}
                      </div>
                      <select
                        value={info.status || ""}
                        onChange={(e) => handleStatusChange(e, company, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: "none", background: badgeStyle.bg, color: badgeStyle.text, cursor: "pointer" }}
                      >
                        {dropdownOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    {/* アコーディオンの中身（開いている時だけ表示） */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                        {(info.createdAt || info.updatedAt) && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8, display: "flex", gap: 12 }}>
                            {info.createdAt && <span>登録: {info.createdAt}</span>}
                            {info.updatedAt && info.updatedAt !== info.createdAt && (
                              <span style={{ color: "#6b7280", fontWeight: 500 }}>更新: {info.updatedAt}</span>
                            )}
                          </div>
                        )}

                        <CustomSelectionTimeline steps={thisCompanySteps} currentStatus={info.status} />
                        
                        {/* 🌟 独立したAI企業研究結果の表示 */}
                        {info.aiResearch && (
                          <div style={{ background: "#f0f4f9", padding: "8px 10px", borderRadius: 6, borderLeft: "4px solid #6200ee", fontSize: "12px", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                            <strong>🔍 AI企業研究レポート:</strong><br/>{info.aiResearch}
                          </div>
                        )}

                        {/* 🌟 独立したAI ES添削結果の表示 */}
                        {info.aiEsCheck && (
                          <div style={{ background: "#e6fffa", padding: "8px 10px", borderRadius: 6, borderLeft: "4px solid #03dac6", fontSize: "12px", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                            <strong>✍️ AIによるES添削結果:</strong><br/>{info.aiEsCheck}
                          </div>
                        )}

                        <FormatMemoWithLinks text={info.memo} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 8, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                          <button onClick={() => openAddModal(selected, company)} style={{ fontSize: 12, background: "#eff6ff", color: "#2563eb", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>📅 予定追加</button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={(e) => handleEditClick(e, company, info, thisCompanySteps)} style={{ fontSize: 12, background: "transparent", color: "#4b5563", border: "none", cursor: "pointer" }}>編集</button>
                            <button onClick={(e) => deleteCompany(e, company)} style={{ fontSize: 12, background: "transparent", color: "#ef4444", border: "none", cursor: "pointer" }}>削除</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </aside>

        {/* ===== 右：カレンダーエリア ===== */}
        <main style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
          {/* カレンダーコントロール */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}>今日</button>
              <button onClick={() => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>◀</button>
            </div>
            <strong style={{ fontSize: isMobile ? 16 : 20, color: "#111827", textAlign: "center" }}>{year}年 {month + 1}月</strong>
            <button onClick={() => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 6 }}>
            {["日","月","火","水","木","金","土"].map((d, i) => (
              <div key={d} style={{ padding: 6, fontSize: 13, fontWeight: 600, color: i === 0 ? "#ef4444" : i === 6 ? "#2563eb" : "#4b5563" }}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 2 : 6 }}>
            {grid.map((c, i) => {
              const ds = ymd(c.y, c.m, c.d);
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const dayEvents = events.filter(e => e.date === ds);

              let dayColor = c.inMonth ? "#1f2937" : "#9ca3af";
              if (c.inMonth) {
                if (c.dow === 0) dayColor = "#ef4444";
                if (c.dow === 6) dayColor = "#2563eb";
              }

              return (
                <div
                  key={i}
                  onClick={() => setSelected(ds)}
                  onDoubleClick={() => openAddModal(ds)}
                  style={{
                    minHeight: isMobile ? 70 : 105,
                    border: isSel ? "2px solid #2563eb" : "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: c.inMonth ? (isToday ? "#fff7ed" : "#ffffff") : "#f3f4f6",
                    padding: isMobile ? 2 : 6,
                    cursor: "pointer",
                    color: dayColor,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: isMobile ? 11 : 13 }}>{c.d}</span>
                    {c.inMonth && (
                      <span onClick={(e) => { e.stopPropagation(); openAddModal(ds); }} style={{ fontSize: 12, color: "#2563eb", opacity: 0.6, cursor: "pointer", padding: "0 4px" }}>＋</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto" }}>
                    {dayEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openEditModal(ev); }}
                        style={{ fontSize: 10, background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "2px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginRight: 2 }} title={`${ev.time || ""} ${ev.title}`}>
                          {ev.time ? `${ev.time.split("〜")[0]} ` : ""}{ev.title}
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

      {/* ===== モーダルポップアップ ===== */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "100%", maxWidth: 460, boxSizing: "border-box", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>
              {editingGroupId ? "予定を編集" : "予定を追加"}
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>関連する企業（任意）</label>
                <select value={modalCompany} onChange={e => setModalCompany(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}>
                  <option value="">なし（共通の予定）</option>
                  {Object.keys(companies).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>予定の種類</label>
                  <button onClick={addNewEventType} style={{ fontSize: 11, background: "transparent", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>＋ 種類を追加</button>
                </div>
                <select value={modalType} onChange={e => setModalType(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}>
                  {eventTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>開始日</label>
                  <input type="date" value={modalStartDate} onChange={e => setModalStartDate(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>終了日</label>
                  <input type="date" value={modalEndDate} onChange={e => setModalEndDate(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#4b5563", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={isTimeEnabled} onChange={e => setIsTimeEnabled(e.target.checked)} />
                  時間を指定する
                </label>
                
                {isTimeEnabled && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "#f9fafb", padding: 8, borderRadius: 6, border: "1px solid #e5e7eb" }}>
                    <select value={startHour} onChange={e => setStartHour(e.target.value)} style={{ padding: "4px 6px", borderRadius: 4 }}>{HOURS.map(h => <option key={h} value={h}>{h}</option>)}</select>
                    <span>:</span>
                    <select value={startMinute} onChange={e => setStartMinute(e.target.value)} style={{ padding: "4px 6px", borderRadius: 4 }}>{MINUTES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <span style={{ margin: "0 4px", color: "#9ca3af" }}>〜</span>
                    <select value={endHour} onChange={e => setEndHour(e.target.value)} style={{ padding: "4px 6px", borderRadius: 4 }}>{HOURS.map(h => <option key={h} value={h}>{h}</option>)}</select>
                    <span>:</span>
                    <select value={endMinute} onChange={e => setEndMinute(e.target.value)} style={{ padding: "4px 6px", borderRadius: 4 }}>{MINUTES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#4b5563" }}>キャンセル</button>
              <button onClick={handleModalSave} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}