
import React, { useEffect, useMemo, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas";
import { MapPin, IndianRupee, RefreshCw, Search } from "lucide-react";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

function getName(item) {
  if (typeof item === "string") return item;
  return item?.name || item?.district || item?.block || item?.tehsil || "";
}

function getBlocksForDistrict(district) {
  if (!district || !BLOCKS) return [];

  if (!Array.isArray(BLOCKS)) {
    const selected = BLOCKS[district] || BLOCKS[getName(district)];
    if (Array.isArray(selected)) return selected.map(getName).filter(Boolean);
    return [];
  }

  return BLOCKS
    .filter(item => {
      if (typeof item === "string") return false;
      return (
        item.district === district ||
        item.district_name === district ||
        item.parent === district
      );
    })
    .map(getName)
    .filter(Boolean);
}

export default function RateList() {
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [services, setServices] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const districtList = useMemo(
    () => (Array.isArray(DISTRICTS) ? DISTRICTS.map(getName).filter(Boolean) : []),
    []
  );

  const blockList = useMemo(
    () => getBlocksForDistrict(district),
    [district]
  );

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch(`${API}/services`);
        const data = await response.json();

        if (!response.ok) throw new Error("Services à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤ˆà¤‚");

        setServices(Array.isArray(data) ? data : data.services || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setServiceLoading(false);
      }
    }

    loadServices();
  }, []);

  async function loadRates() {
    if (!district || !block) {
      setError("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    setLoading(true);
    setError("");
    setRates([]);

    try {
      const params = new URLSearchParams({ district, block });
      const response = await fetch(`${API}/rates?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤");
      }

      setRates(Array.isArray(data) ? data : data.rates || []);
    } catch (err) {
      setError(err.message || "Server à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾");
    } finally {
      setLoading(false);
    }
  }

  const filteredRates = rates.filter(item => {
    const name = item.service_name || item.service || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const css = `
    .rl-page{min-height:100vh;background:#f3f6fb;padding:20px;font-family:Arial,sans-serif;color:#172033}
    .rl-wrap{max-width:1000px;margin:auto}
    .rl-header{background:linear-gradient(120deg,#073b75,#087fc0);padding:27px;border-radius:16px;color:white}
    .rl-card{background:white;padding:20px;border-radius:13px;margin-top:18px;box-shadow:0 3px 14px #0000000b}
    .rl-label{font-weight:bold;font-size:14px;display:block;margin-bottom:7px}
    .rl-select,.rl-input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:15px;background:white;font-size:15px}
    .rl-btn{width:100%;padding:13px;background:#0878bd;color:white;border:0;border-radius:9px;font-weight:bold;cursor:pointer}
    .rl-table{width:100%;border-collapse:collapse;min-width:450px}
    .rl-table th,.rl-table td{padding:13px;border-bottom:1px solid #e5e7eb;text-align:left}
    .rl-table th{background:#eef5fb}
    .rl-price{font-weight:bold;color:#0878bd}
    .rl-error{background:#fff1f2;color:#b91c1c;padding:12px;border-radius:8px;margin-top:15px}
    @media(max-width:600px){.rl-page{padding:10px}.rl-header{padding:20px}.rl-card{padding:15px}}
  `;

  return (
    <div className="rl-page">
      <style>{css}</style>

      <div className="rl-wrap">
        <header className="rl-header">
          <IndianRupee size={35} />
          <h2>Borewell Mitra MP - Rate List</h2>
          <p>à¤…à¤ªà¤¨à¥‡ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° Borewell à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥€ à¤¦à¤° à¤¦à¥‡à¤–à¥‡à¤‚à¥¤</p>
        </header>

        <section className="rl-card">
          <h3><MapPin size={19} /> à¤…à¤ªà¤¨à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤šà¥à¤¨à¥‡à¤‚</h3>

          <label className="rl-label">à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚</label>
          <select
            className="rl-select"
            value={district}
            onChange={e => {
              setDistrict(e.target.value);
              setBlock("");
              setRates([]);
              setError("");
            }}
          >
            <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>
            {districtList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label className="rl-label">à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</label>
          <select
            className="rl-select"
            value={block}
            onChange={e => {
              setBlock(e.target.value);
              setRates([]);
              setError("");
            }}
            disabled={!district}
          >
            <option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>
            {blockList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <button className="rl-btn" onClick={loadRates} disabled={loading}>
            {loading ? "à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚..." : "à¤°à¥‡à¤Ÿ à¤¦à¥‡à¤–à¥‡à¤‚"}
          </button>

          {error && <div className="rl-error">{error}</div>}
        </section>

        <section className="rl-card">
          <h3><IndianRupee size={19} /> à¤¸à¥‡à¤µà¤¾ à¤¦à¤° à¤¸à¥‚à¤šà¥€</h3>

          {district && block && (
            <p>
              <b>à¤šà¤¯à¤¨à¤¿à¤¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤°:</b> {district} / {block}
            </p>
          )}

          {rates.length > 0 && (
            <input
              className="rl-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="à¤¸à¥‡à¤µà¤¾ à¤–à¥‹à¤œà¥‡à¤‚..."
            />
          )}

          {loading && <p>à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...</p>}

          {!loading && rates.length === 0 && (
            <p>à¤°à¥‡à¤Ÿ à¤¦à¥‡à¤–à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¤•à¤° à¤¬à¤Ÿà¤¨ à¤¦à¤¬à¤¾à¤à¤à¥¤</p>
          )}

          {!loading && rates.length > 0 && filteredRates.length === 0 && (
            <p>à¤‡à¤¸ à¤¨à¤¾à¤® à¤•à¥€ à¤•à¥‹à¤ˆ à¤¸à¥‡à¤µà¤¾ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤</p>
          )}

          {filteredRates.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="rl-table">
                <thead>
                  <tr>
                    <th>à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤¨à¤¾à¤®</th>
                    <th>à¤¦à¤°</th>
                    <th>à¤‡à¤•à¤¾à¤ˆ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.service_name || item.service || "à¤¸à¥‡à¤µà¤¾"}</td>
                      <td className="rl-price">â‚¹{item.rate ?? "â€”"}</td>
                      <td>{item.unit || "â€”"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!serviceLoading && services.length > 0 && rates.length === 0 && (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¸à¥‡à¤µà¤¾à¤à¤: {services.map(s => s.name).filter(Boolean).join(", ")}
            </p>
          )}
        </section>

        <footer style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
          Borewell Mitra MP
        </footer>
      </div>
    </div>
  );
}
