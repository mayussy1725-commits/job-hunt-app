import React, { useState } from "react";
// 🌟 Google Gemini APIの部品を読み込む
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css";

// 🌟 Geminiの初期設定
// ⚠️ 開発の初期テスト用としてここに直接貼り付けます。
// (GitHubに公開する際は、環境変数 .env を使うのが安全です)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

function App() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");
  const [selectedSteps, setSelectedSteps] = useState([]);
  const [memo, setMemo] = useState("");
  const [editing, setEditing] = useState(null);

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
      setCompanies(companies.map((c) => c.id === editing ? { ...c, name, steps: selectedSteps, memo } : c));
      setEditing(null);
    } else {
      const newCompany = { id: Date.now(), name, steps: selectedSteps, memo };
      setCompanies([...companies, newCompany]);
    }
    setName("");
    setSelectedSteps([]);
    setMemo("");
    setAiResult("");
  };

  const handleEdit = (company) => {
    setEditing(company.id);
    setName(company.name);
    setSelectedSteps(company.steps);
    setMemo(company.memo);
    setAiResult("");
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

  // 🌟 本物のAI企業研究機能
  const handleAiResearch = async () => {
    if (!name.trim()) {
      alert("企業名を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResult("");

    try {
      // 最新の軽量・高速モデル「gemini-2.5-flash」を使用
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `あなたは優秀な就職活動のアシスタントです。「${name}」という企業について、以下の形式で300文字程度で企業研究レポートを作成してください。
      
【${name} の企業研究レポート】
■ 企業概要と強み:
■ 求められる人物像:
■ 面接対策アドバイス:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // メモ欄に結果を追記
      setMemo((prev) => (prev ? prev + "\n\n" + text : text));
      setAiResult("✨ 本物のAIが企業研究データをメモ欄に追加しました！");
    } catch (error) {
      console.error(error);
      setAiResult("❌ AIの呼び出しに失敗しました。APIキーを確認してください。");
    } finally {
      setAiLoading(false);
    }
  };

  // 🌟 本物のAI ES添削機能
  const handleAiEsCheck = async () => {
    if (!memo.trim()) {
      alert("メモ欄に添削したいES（志望動機や自己PR）を入力してください！");
      return;
    }
    setAiLoading(true);
    setAiResult("");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `あなたはプロの就活キャリアアドバイザーです。以下のメモ欄に書かれたエントリーシート（ES）の文章を読み、就活生の強みがより人事担当者に伝わるように添削してください。
良い点と、具体的な改善アドバイス（ビフォーアフターの文章例など）を分かりやすく回答してください。

【添削するES文章】
${memo}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setAiResult(text);
    } catch (error) {
      console.error(error);
      setAiResult("❌ AIの呼び出しに失敗しました。APIキーを確認してください。");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h1>就活管理 AIアシスタント (本物接続版)</h1>

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

        <div style={{ marginBottom: "15px" }}>
          <button
            type="button"
            onClick={handleAiResearch}
            disabled={aiLoading}
            style={{ background: "#6200ee", color: "white", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            {aiLoading ? "Geminiが分析中..." : "🔍 AIで本物の企業研究"}
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
            placeholder="ここに自己PRや志望動機を書いて下の添削ボタンを押すか、AI企業研究の結果をここに残せます"
            rows="6"
            style={{ width: "95%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <button
            type="button"
            onClick={handleAiEsCheck}
            disabled={aiLoading}
            style={{ background: "#03dac6", color: "black", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            {aiLoading ? "Geminiが添削中..." : "✍️ メモ欄のESを本物のAI添削"}
          </button>
        </div>

        {aiResult && (
          <div style={{ whiteSpace: "pre-wrap", background: "#f0f4f9", padding: "10px", borderRadius: "4px", marginBottom: "15px", fontSize: "14px", borderLeft: "4px solid #6200ee" }}>
            {aiResult}
          </div>
        )}

        <button type="submit" style={{ background: "#222", color: "white", padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {editing !== null ? "更新する" : "企業を追加する"}
        </button>
      </form>

      <h2>企業一覧</h2>
      {companies.length === 0 ? (
        <p>まだ登録されている企業はありません。</p>
      ) : (
        companies.map((company) => (
          <div key={company.id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "8px", marginBottom: "15px", background: "#fafafa" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>{company.name}</h4>
            <p style={{ margin: "5px 0" }}>
              <strong>選考フロー:</strong> {company.steps.length > 0 ? company.steps.join(" → ") : "未選択"}
            </p>
            {company.memo && (
              <div style={{ background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #eee", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                <strong>メモ:</strong><br />{company.memo}
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