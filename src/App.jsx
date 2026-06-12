import { useState } from "react";

const CATEGORIES = {
  mutual: { label: "Mutual", color: "#4ade80", bg: "#052e16", desc: "Following each other" },
  notFollowBack: { label: "Not Following Back", color: "#f87171", bg: "#2d0707", desc: "You follow, they don't" },
  notFollowing: { label: "Not Followed Back", color: "#facc15", bg: "#1c1500", desc: "They follow you, you don't" },
};

async function fetchAllPages(url, token) {
  let results = [];
  let page = 1;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  while (true) {
    const res = await fetch(`${url}?per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    results = results.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

function UserCard({ user, category }) {
  const cat = CATEGORIES[category];
  return (
    <a
      href={`https://github.com/${user.login}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 12px", background: "#0d1117",
        border: "1px solid #21262d", borderRadius: "8px",
        textDecoration: "none", transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = cat.color}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
    >
      <img src={user.avatar_url} alt={user.login}
        style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
      <span style={{ color: "#e6edf3", fontSize: "14px", fontFamily: "monospace" }}>
        {user.login}
      </span>
      <span style={{
        marginLeft: "auto", fontSize: "11px", color: cat.color,
        background: cat.bg, padding: "2px 8px", borderRadius: "20px",
        whiteSpace: "nowrap", fontFamily: "sans-serif",
      }}>
        {cat.label}
      </span>
    </a>
  );
}

function HowToToken({ onClose }) {
  const steps = [
    { n: "1", text: "Go to", link: "https://github.com/settings/tokens", linkText: "github.com/settings/tokens" },
    { n: "2", text: 'Click "Generate new token" → "Generate new token (classic)"' },
    { n: "3", text: 'Give it any name, e.g. "follow-analyzer"' },
    { n: "4", text: 'Under "Select scopes", check only read:user' },
    { n: "5", text: 'Scroll down → click "Generate token"' },
    { n: "6", text: "Copy the token (starts with ghp_...) and paste it here" },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px",
    }}>
      <div style={{
        background: "#0d1117", border: "1px solid #30363d", borderRadius: "12px",
        padding: "24px", maxWidth: "460px", width: "100%",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: "#e6edf3", fontWeight: 700, fontSize: "16px" }}>How to get a GitHub PAT</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{
                background: "#238636", color: "#fff", borderRadius: "50%",
                width: "20px", height: "20px", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0, marginTop: "1px",
              }}>{s.n}</span>
              <span style={{ color: "#c9d1d9", fontSize: "13px", lineHeight: 1.5 }}>
                {s.text}{" "}
                {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>{s.linkText}</a>}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          background: "#161b22", border: "1px solid #30363d", borderRadius: "8px",
          padding: "10px 14px", fontSize: "12px", color: "#8b949e", lineHeight: 1.6,
        }}>
          🔒 <strong style={{ color: "#c9d1d9" }}>Privacy note:</strong> Your token is only used in your browser to call the GitHub API directly. It is never sent to any server or stored anywhere.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("mutual");
  const [search, setSearch] = useState("");

  async function analyze() {
    const u = username.trim();
    if (!u) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSearch("");
    try {
      setLoadingMsg("Fetching following list...");
      const followingRaw = await fetchAllPages(`https://api.github.com/users/${u}/following`, token.trim());
      setLoadingMsg("Fetching followers list...");
      const followersRaw = await fetchAllPages(`https://api.github.com/users/${u}/followers`, token.trim());
      setLoadingMsg("Analyzing...");

      const followingMap = new Map(followingRaw.map(x => [x.login, x]));
      const followersMap = new Map(followersRaw.map(x => [x.login, x]));

      const mutual = [], notFollowBack = [], notFollowing = [];
      for (const [login, user] of followingMap) {
        if (followersMap.has(login)) mutual.push(user);
        else notFollowBack.push(user);
      }
      for (const [login, user] of followersMap) {
        if (!followingMap.has(login)) notFollowing.push(user);
      }

      setResult({ mutual, notFollowBack, notFollowing });
      setActiveTab("mutual");
    } catch (e) {
      if (e.message.includes("401")) setError("Invalid token. Please check your PAT and try again.");
      else if (e.message.includes("404")) setError("Username not found.");
      else setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  const tabData = result ? {
    mutual: result.mutual,
    notFollowBack: result.notFollowBack,
    notFollowing: result.notFollowing,
  } : null;

  const filtered = tabData
    ? tabData[activeTab].filter(u => u.login.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <div style={{
      minHeight: "100vh", background: "#010409", color: "#e6edf3",
      fontFamily: "'Segoe UI', sans-serif", padding: "32px 16px",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {showGuide && <HowToToken onClose={() => setShowGuide(false)} />}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "26px", fontWeight: 700, marginBottom: "6px", letterSpacing: "-0.5px" }}>
          ⚡ GitHub Follow Analyzer
        </div>
        <div style={{ color: "#8b949e", fontSize: "14px" }}>
          See who's mutual, who ghosted you, and who you haven't followed back.
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "480px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Username input */}
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="GitHub username..."
            style={{
              flex: 1, padding: "10px 14px", background: "#0d1117",
              border: "1px solid #30363d", borderRadius: "8px", color: "#e6edf3",
              fontSize: "15px", outline: "none", fontFamily: "monospace",
            }}
          />
          <button
            onClick={analyze}
            disabled={loading || !username.trim()}
            style={{
              padding: "10px 20px",
              background: loading ? "#21262d" : "#238636",
              border: "none", borderRadius: "8px", color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px", fontWeight: 600, transition: "background 0.15s", whiteSpace: "nowrap",
            }}
          >
            {loading ? "Loading..." : "Analyze"}
          </button>
        </div>

        {/* PAT section */}
        <div style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: "8px", overflow: "hidden" }}>
          <button
            onClick={() => setShowToken(p => !p)}
            style={{
              width: "100%", background: "none", border: "none", padding: "10px 14px",
              color: "#8b949e", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "space-between", fontSize: "13px",
            }}
          >
            <span>🔑 Personal Access Token <span style={{ color: "#3d444d" }}>(optional — for 600+ accounts)</span></span>
            <span style={{ fontSize: "10px" }}>{showToken ? "▲" : "▼"}</span>
          </button>
          {showToken && (
            <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{
                  padding: "8px 12px", background: "#161b22",
                  border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3",
                  fontSize: "13px", outline: "none", fontFamily: "monospace", width: "100%", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "#3d444d" }}>
                  🔒 Never stored. Used only in your browser.
                </span>
                <button
                  onClick={() => setShowGuide(true)}
                  style={{
                    background: "none", border: "1px solid #30363d", borderRadius: "5px",
                    color: "#58a6ff", fontSize: "11px", cursor: "pointer", padding: "3px 8px",
                  }}
                >
                  How to get a token?
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
      {loading && <div style={{ color: "#8b949e", fontSize: "14px" }}>{loadingMsg}</div>}

      {/* Results */}
      {result && (
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div
                key={key}
                onClick={() => { setActiveTab(key); setSearch(""); }}
                style={{
                  flex: "1 1 120px", background: "#0d1117",
                  border: `1px solid ${activeTab === key ? cat.color : "#21262d"}`,
                  borderRadius: "10px", padding: "14px", cursor: "pointer", transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: 700, color: cat.color }}>{tabData[key].length}</div>
                <div style={{ fontSize: "12px", color: "#8b949e", marginTop: "2px" }}>{cat.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: CATEGORIES[activeTab].color, fontWeight: 600, fontSize: "14px" }}>
              {CATEGORIES[activeTab].label} ({tabData[activeTab].length})
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter username..."
              style={{
                marginLeft: "auto", padding: "5px 10px", background: "#0d1117",
                border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3",
                fontSize: "13px", outline: "none", fontFamily: "monospace", width: "160px",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ color: "#8b949e", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                {search ? "No results found." : "Nothing here."}
              </div>
            ) : (
              filtered.map(user => <UserCard key={user.login} user={user} category={activeTab} />)
            )}
          </div>
        </div>
      )}

      <div style={{ color: "#3d444d", fontSize: "11px", marginTop: "40px", textAlign: "center" }}>
        Uses GitHub public API · 60 req/hr unauthenticated · 5000 req/hr with PAT
      </div>
    </div>
  );
}
