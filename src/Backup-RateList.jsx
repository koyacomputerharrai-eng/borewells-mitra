
import React, { useEffect, useMemo, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas";
import { MapPin, IndianRupee, RefreshCw, Search } from "lucide-react";

const API = "http://localhost:4000/api";

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

        if (!response.ok) throw new Error("Services लोड नहीं हुईं");

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
      setError("कृपया पहले जिला और ब्लॉक चुनें।");
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
        throw new Error(data.message || "रेट लोड नहीं हो पाए");
      }

      setRates(Array.isArray(data) ? data : data.rates || []);
    } catch (err) {
      setError(err.message || "Server से संपर्क नहीं हो पाया");
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
          <p>अपने क्षेत्र के अनुसार Borewell सेवाओं की दर देखें।</p>
        </header>

        <section className="rl-card">
          <h3><MapPin size={19} /> अपना क्षेत्र चुनें</h3>

          <label className="rl-label">जिला चुनें</label>
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
            <option value="">-- जिला चुनें --</option>
            {districtList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label className="rl-label">ब्लॉक चुनें</label>
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
            <option value="">-- ब्लॉक चुनें --</option>
            {blockList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <button className="rl-btn" onClick={loadRates} disabled={loading}>
            {loading ? "रेट लोड हो रहे हैं..." : "रेट देखें"}
          </button>

          {error && <div className="rl-error">{error}</div>}
        </section>

        <section className="rl-card">
          <h3><IndianRupee size={19} /> सेवा दर सूची</h3>

          {district && block && (
            <p>
              <b>चयनित क्षेत्र:</b> {district} / {block}
            </p>
          )}

          {rates.length > 0 && (
            <input
              className="rl-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="सेवा खोजें..."
            />
          )}

          {loading && <p>रेट लोड हो रहे हैं...</p>}

          {!loading && rates.length === 0 && (
            <p>रेट देखने के लिए जिला और ब्लॉक चुनकर बटन दबाएँ।</p>
          )}

          {!loading && rates.length > 0 && filteredRates.length === 0 && (
            <p>इस नाम की कोई सेवा नहीं मिली।</p>
          )}

          {filteredRates.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="rl-table">
                <thead>
                  <tr>
                    <th>सेवा का नाम</th>
                    <th>दर</th>
                    <th>इकाई</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.service_name || item.service || "सेवा"}</td>
                      <td className="rl-price">₹{item.rate ?? "—"}</td>
                      <td>{item.unit || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!serviceLoading && services.length > 0 && rates.length === 0 && (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              उपलब्ध सेवाएँ: {services.map(s => s.name).filter(Boolean).join(", ")}
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
