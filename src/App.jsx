import React, { useState } from "react";
import "./App.css"; // 必要に応じてスタイルを調整してください

function App() {
  // 既存のステート
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [memo, setMemo] = useState("");
  const [editing, setEditing] = useState(null);

  // 🌟 AI機能用のステート
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const stepsList = ["検討中", "ES提出", "1次面接", "最終面接", "内定"];

  const handleStepChange = (step) => {
    if (selectedSteps.includes(step)) {
      setSelectedSteps(selectedSteps.filter((s) => s !== step));
    } else {
      setSelectedSteps([...selectedSteps, step]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editing !== null) {
      setCompanies(
        companies.map((c) =>
          c.id === editing
            ? { ...c, name, steps: selectedSteps, memo }
            : c
        )
      );
      setEditing(null);
    } else {
      const newCompany = {
        id: Date.now(),
        name,
        steps: selectedSteps,
        memo,
      };
      setCompanies([...companies, newCompany]);
    }

    setName("");
    setSelectedSteps([]);
    setMemo("");
    // AIの結果エリアもリセット
    setAiResult("");
  };

  const handleEdit = (company) => {
    setEditing(company.id);
    setName(company.name);
    setSelectedSteps(company.steps);
    setMemo(company.memo);
    setAiResult(""); // 編集時もリセット
  };

  const handleDelete = (id) => {
    setCompanies(companies.filter((c) => c.id !== id));
    if (editing === id) {
      setEditing(null);
      setName("");
      setSelectedSteps([]);
      setMemo("");
      setAiResult("");
    }
  };

  // 🌟 AI企業研究の模擬関数
  const handleAiResearch = () => {
    if (!name.trim()) {
      alert("企業名を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResult("");

    // 本物のAIを呼ぶ代わりに、1.5秒後にサンプルを返す（本実装時にGemini APIと差し替えます）
    setTimeout(() => {
      const sampleResearch = `【${name} の企業研究レポート（AI生成サンプル）】
■ 企業概要と強み:
主要ターゲット層に強みを持つ業界大手企業です。近年はDX推進と海外展開に注力しています。
■ 求められる人物像:
主体的に行動し、周囲を巻き込んで新しい価値を作れる人材が評価される傾向にあります。
■ 面接対策アドバイス:
「なぜ同業他社ではなく、この会社なのか」の言語化が非常に重要になります。`;
      
      setMemo((prev) => (prev ? prev + "\n\n" + sampleResearch : sampleResearch));
      setAiResult("✨ 企業研究データをメモ欄に追加しました！");
      setAiLoading(false);
    }, 1500);
  };

  // 🌟 AI ES添削の模擬関数
  const handleAiEsCheck = () => {
    if (!memo.trim()) {
      alert("メモ欄に添削したいES（志望動機や自己PR）を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResult("");

    setTimeout(() => {
      const sampleFeedback = `【AIによるES添削フィードバック】
🟢 良かった点:
エピソードが具体的で、あなたの行動力がとてもよく伝わります。

🔶 改善アドバイス:
1. 冒頭の「結論（私の強みは〜）」をもっと簡潔にすると、面接官がパッと理解しやすくなります。
2. その強みを使って「入社後にどう貢献できるか」の記述を最後に2文ほど付け足すと完璧です！`;
      
      setAiResult(sampleFeedback);
      setAiLoading(false);
    }, 1500);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1>就活管理 AIアシスタント</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: "30px", border: "1px solid #ccc", padding: "15px", borderRadius: "8px" }}>
        <h3>{editing !== null ? "企業情報の編集" : "新規企業の追加"}</h3>
        
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>企業名:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 株式会社ライフ"
            style={{ width: "95%", padding: "8px" }}
          />
        </div>

        {/* 🌟 AI企業研究ボタンを追加 */}
        <div style={{ marginBottom: "15px" }}>
          <button
            type="button"
            onClick={handleAiResearch}
            disabled={aiLoading}
            style={{ background: "#6200ee", color: "white", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            {aiLoading ? "AI分析中..." : "🔍 AIで企業研究"}
          </button>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>選考フロー (複数選択可):</label>
          {stepsList.map((step) => (
            <label key={step} style={{ marginRight: "10px", display: "inline-block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selectedSteps.includes(step)}
                onChange={() => handleStepChange(step)}
              />
              {step}
            </label>
          ))}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>メモ (ESや企業情報):</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="志望動機、自己PR、またはAIの分析結果がここに残ります"
            rows="6"
            style={{ width: "95%", padding: "8px" }}
          />
        </div>

        {/* 🌟 AI ES添削ボタンを追加 */}
        <div style={{ marginBottom: "15px" }}>
          <button
            type="button"
            onClick={handleAiEsCheck}
            disabled={aiLoading}
            style={{ background: "#03dac6", color: "black", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            {aiLoading ? "AI添削中..." : "✍️ メモ欄のESをAI添削"}
          </button>
        </div>

        {/* 🌟 AIの結果表示エリア */}
        {aiResult && (
          <div style={{ whiteSpace: "pre-wrap", background: "#f0f4f9", padding: "10px", borderRadius: "4px", marginBottom: "15px", fontSize: "14px", borderLeft: "4px solid #6200ee" }}>
            {aiResult}
          </div>
        )}

        <button type="submit" style={{ background: "#222", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {editing !== null ? "更新する" : "企業を追加する"}
        </button>
        {editing !== null && (
          <button type="button" onClick={() => { setEditing(null); setName(""); setSelectedSteps([]); setMemo(""); setAiResult(""); }} style={{ marginLeft: "10px", background: "#eee", padding: "10px" }}>
            キャンセル
          </button>
        )}
      </form>

      <h2>企業一覧</h2>
      {companies.length === 0 ? (
        <p>まだ登録されている企業はありません。</p>
      ) : (
        companies.map((company) => (
          <div key={company.id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "8px", marginBottom: "15px", background: "#fafafa" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>{company.name}</h4>
            <p style={{ margin: "5px 0" }}>
              <strong>選考フロー:</strong>{" "}
              {company.steps.length > 0 ? company.steps.join(" → ") : "未選択"}
            </p>
            {company.memo && (
              <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #eee", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                <strong>メモ:</strong>
                <br />
                {company.memo}
              </div>
            )}
            <div style={{ marginTop: "10px" }}>
              <button onClick={() => handleEdit(company)} style={{ marginRight: "5px", padding: "4px 8px" }}>編集</button>
              <button onClick={() => handleDelete(company.id)} style={{ padding: "4px 8px", background: "#ff4d4f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>削除</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default App;