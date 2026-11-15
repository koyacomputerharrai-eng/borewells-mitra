
import React, { useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  UserRound,
  RefreshCw,
  AlertCircle,
  Search,
  Image as ImageIcon
} from "lucide-react";

import { DISTRICTS, BLOCKS } from "./areas.js";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

function getBlocks(district) {
  const list = BLOCKS?.[district];
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return Object.keys(list);
  return [];
}

function isApprovedAndActive(agent) {
  const status = String(agent.status || "").toLowerCase();
  const approved = status === "approved" || status === "approve";

  const activeValue = agent.is_active ?? agent.active;
  const active =
    activeValue === true ||
    activeValue === 1 ||
    ["true", "1", "active"].includes(
      String(activeValue).toLowerCase()
    );

  return approved && active;
}

function phoneDigits(mobile) {
  let digits = String(mobile || "").replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits;
}

async function readJSON(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Server Error (${response.status})`);
  }

  return data;
}

export default function AgentContact() {
  const districtList = useMemo(
    () =>
      [...DISTRICTS].sort((a, b) =>
        String(a).localeCompare(String(b), "hi")
      ),
    []
  );

  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [agents, setAgents] = useState([]);
  const [banner, setBanner] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bannerError, setBannerError] = useState("");

  const blocks = useMemo(() => getBlocks(district), [district]);

  const handleDistrictChange = value => {
    setDistrict(value);
    setBlock("");
    setAgents([]);
    setBanner("");
    setSearched(false);
    setError("");
    setBannerError("");
  };

  const handleBlockChange = value => {
    setBlock(value);
    setAgents([]);
    setBanner("");
    setSearched(false);
    setError("");
    setBannerError("");
  };

  const searchAgents = async () => {
    if (!district) {
      setError("à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    if (!block) {
      setError("à¤ªà¤¹à¤²à¥‡ à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    setLoading(true);
    setError("");
    setBannerError("");
    setAgents([]);
    setBanner("");
    setSearched(false);

    const params = new URLSearchParams({ district, block });

    try {
      // à¤šà¥à¤¨à¥‡ à¤¹à¥à¤ District à¤”à¤° Block à¤•à¥‡ Agents
      const agentResponse = await fetch(
        `${API}/public/agents?${params.toString()}`
      );

      const agentData = await readJSON(agentResponse);

      const agentList = Array.isArray(agentData)
        ? agentData
        : agentData.agents || [];

      const filteredAgents = agentList.filter(agent => {
        if (
          agent.status == null &&
          agent.is_active == null &&
          agent.active == null
        ) {
          return true;
        }

        return isApprovedAndActive(agent);
      });

      setAgents(filteredAgents);

      // à¤‡à¤¸à¥€ Block à¤•à¤¾ à¤…à¤²à¤— Banner
      try {
        const bannerResponse = await fetch(
          `${API}/public/block-banner?${params.toString()}`
        );

        const bannerData = await readJSON(bannerResponse);
        const image = bannerData.banner?.image_data || "";

        setBanner(image);

        if (!image) {
          setBannerError("à¤‡à¤¸ Block à¤•à¤¾ Banner à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤");
        }
      } catch (bannerErr) {
        setBanner("");
        setBannerError(
          bannerErr.message || "Banner à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾à¥¤"
        );
      }

      setSearched(true);
    } catch (err) {
      setError(err.message || "Agent à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤¸à¤•à¥€à¥¤");
      setSearched(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-page">
      <style>{`
        .agent-page {
          max-width: 1100px;
          width: 100%;
          margin: auto;
          padding: 24px 18px;
          box-sizing: border-box;
          color: #172033;
          font-family: Arial, sans-serif;
        }

        .agent-page * {
          box-sizing: border-box;
        }

        .agent-heading {
          text-align: center;
          margin-bottom: 25px;
        }

        .agent-heading h2 {
          margin: 0 0 9px;
          color: #123b70;
          font-size: 28px;
        }

        .agent-heading p {
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }

        .agent-search-box {
          max-width: 720px;
          margin: 0 auto 25px;
          padding: 22px;
          background: #fff;
          border: 1px solid #dce5f0;
          border-radius: 16px;
          box-shadow: 0 6px 22px rgba(15, 35, 65, .06);
        }

        .agent-search-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .agent-field label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #263b57;
          margin-bottom: 8px;
        }

        .agent-field select {
          width: 100%;
          min-height: 48px;
          padding: 11px 13px;
          border: 1px solid #cbd8e8;
          border-radius: 10px;
          background: #f8fafc;
          color: #172033;
          font-size: 15px;
          outline: none;
        }

        .agent-field select:focus {
          border-color: #1769aa;
        }

        .agent-search-button {
          width: 100%;
          min-height: 49px;
          margin-top: 17px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          background: #123b70;
          color: #fff;
          border: 0;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .agent-search-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .agent-state {
          text-align: center;
          padding: 28px 15px;
          margin: 18px 0;
          border-radius: 12px;
          background: #f8fafc;
          color: #64748b;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .agent-error {
          color: #b42318;
          background: #fff5f5;
          border: 1px solid #fecaca;
        }

        .agent-banner {
          width: 100%;
          margin: 20px 0 25px;
          overflow: hidden;
          border-radius: 14px;
          background: #f1f5f9;
          border: 1px solid #dbe4ef;
        }

        .agent-banner img {
          display: block;
          width: 100%;
          max-height: 360px;
          object-fit: contain;
        }

        .agent-banner-placeholder {
          padding: 22px;
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          border-radius: 12px;
          margin: 18px 0;
        }

        .agent-results-title {
          margin: 22px 0 16px;
          padding: 14px 17px;
          border-radius: 10px;
          background: #123b70;
          color: white;
          font-size: 19px;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%, 270px), 1fr)
          );
          gap: 16px;
        }

        .agent-card {
          min-width: 0;
          padding: 18px;
          background: #fff;
          border: 1px solid #dbe4ef;
          border-radius: 14px;
          box-shadow: 0 4px 15px rgba(15, 35, 65, .06);
        }

        .agent-agency {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          color: #123b70;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.4;
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .agent-agency svg {
          flex-shrink: 0;
          margin-top: 3px;
        }

        .agent-name {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #263b57;
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 13px;
        }

        .agent-info {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          color: #526174;
          font-size: 14px;
          line-height: 1.7;
          margin: 10px 0;
          overflow-wrap: anywhere;
        }

        .agent-info svg,
        .agent-name svg {
          flex-shrink: 0;
          margin-top: 3px;
          color: #1769aa;
        }

        .agent-actions {
          display: flex;
          gap: 10px;
          margin-top: 17px;
        }

        .agent-actions a {
          flex: 1;
          min-width: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          padding: 12px 8px;
          color: #fff;
          text-decoration: none;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 700;
        }

        .agent-call {
          background: #1769aa;
        }

        .agent-whatsapp {
          background: #168b50;
        }

        @media(max-width: 600px) {
          .agent-page {
            padding: 16px 12px;
          }

          .agent-heading h2 {
            font-size: 23px;
          }

          .agent-search-box {
            padding: 16px;
          }

          .agent-search-grid {
            grid-template-columns: 1fr;
          }

          .agent-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="agent-heading">
        <h2>Borewells Mitra Agent à¤¸à¤‚à¤ªà¤°à¥à¤•</h2>
        <p>
          à¤…à¤ªà¤¨à¥‡ à¤œà¤¿à¤²à¥‡ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤à¤œà¥‡à¤‚à¤Ÿ à¤–à¥‹à¤œà¥‡à¤‚à¥¤
        </p>
      </div>

      {/* District à¤”à¤° Block Search */}
      <div className="agent-search-box">
        <div className="agent-search-grid">
          <div className="agent-field">
            <label>à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚</label>

            <select
              value={district}
              onChange={e => handleDistrictChange(e.target.value)}
            >
              <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

              {districtList.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="agent-field">
            <label>à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</label>

            <select
              value={block}
              disabled={!district || blocks.length === 0}
              onChange={e => handleBlockChange(e.target.value)}
            >
              <option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>

              {blocks.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="agent-search-button"
          onClick={searchAgents}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw size={19} />
          ) : (
            <Search size={19} />
          )}

          {loading ? "à¤–à¥‹à¤œ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚..." : "Agent à¤–à¥‹à¤œà¥‡à¤‚"}
        </button>
      </div>

      {/* Search à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ Agent à¤¯à¤¾ Banner à¤¨à¤¹à¥€à¤‚ */}
      {!searched && !loading && !error && (
        <div className="agent-state">
          <MapPin size={30} />
          <p>
            à¤à¤œà¥‡à¤‚à¤Ÿ à¤¦à¥‡à¤–à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤ªà¤¹à¤²à¥‡ à¤…à¤ªà¤¨à¤¾ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¤•à¤°
            Agent à¤–à¥‹à¤œà¥‡à¤‚ à¤ªà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¥‡à¤‚à¥¤
          </p>
        </div>
      )}

      {loading && (
        <div className="agent-state">
          <RefreshCw size={26} />
          <p>à¤šà¥à¤¨à¥‡ à¤¹à¥à¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</p>
        </div>
      )}

      {error && (
        <div className="agent-state agent-error">
          <AlertCircle size={27} />
          <p>{error}</p>
        </div>
      )}

      {/* Search à¤•à¥‡ à¤¬à¤¾à¤¦ à¤šà¥à¤¨à¥‡ à¤¹à¥à¤ Block à¤•à¤¾ Banner à¤”à¤° Agents */}
      {searched && (
        <>
          <h3 className="agent-results-title">
            {district} à¤œà¤¿à¤²à¤¾ â€” {block} à¤¬à¥à¤²à¥‰à¤•
          </h3>

          {banner ? (
            <div className="agent-banner">
              <img
                src={banner}
                alt={`${district} ${block} Agent Banner`}
              />
            </div>
          ) : (
            <div className="agent-banner-placeholder">
              <ImageIcon size={25} />
              <p>à¤‡à¤¸ à¤¬à¥à¤²à¥‰à¤• à¤•à¤¾ Banner à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p>
              {bannerError && <small>{bannerError}</small>}
            </div>
          )}

          {agents.length === 0 ? (
            <div className="agent-state">
              <UserRound size={30} />
              <p>
                {district} à¤•à¥‡ {block} à¤¬à¥à¤²à¥‰à¤• à¤®à¥‡à¤‚ à¤…à¤­à¥€ à¤•à¥‹à¤ˆ
                Approved à¤”à¤° Active Agent à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤
              </p>
            </div>
          ) : (
            <>
              <h3 className="agent-results-title">
                à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤à¤œà¥‡à¤‚à¤Ÿ ({agents.length})
              </h3>

              <div className="agent-grid">
                {agents.map((agent, index) => {
                  const mobile = agent.mobile || agent.phone || "";
                  const digits = phoneDigits(mobile);

                  const agency =
                    agent.agency_name ||
                    agent.agencyName ||
                    "Borewell Service Agency";

                  const address =
                    agent.office_address ||
                    agent.officeAddress ||
                    agent.address ||
                    "à¤ªà¤¤à¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ";

                  return (
                    <div
                      className="agent-card"
                      key={agent.id || agent.mobile || index}
                    >
                      <div className="agent-agency">
                        <Building2 size={20} />
                        <span>{agency}</span>
                      </div>

                      <div className="agent-name">
                        <UserRound size={18} />
                        {agent.name || "Agent"}
                      </div>

                      <div className="agent-info">
                        <MapPin size={17} />
                        <span>
                          <strong>à¤œà¤¿à¤²à¤¾:</strong> {district}
                          <br />
                          <strong>à¤¬à¥à¤²à¥‰à¤•:</strong> {block}
                        </span>
                      </div>

                      <div className="agent-info">
                        <Building2 size={17} />
                        <span>
                          <strong>à¤‘à¤«à¤¿à¤¸ à¤ªà¤¤à¤¾:</strong>
                          <br />
                          {address}
                        </span>
                      </div>

                      <div className="agent-info">
                        <Phone size={17} />
                        <span>
                          {mobile || "à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}
                        </span>
                      </div>

                      <div className="agent-actions">
                        {digits.length === 10 ? (
                          <>
                            <a
                              className="agent-call"
                              href={`tel:${digits}`}
                            >
                              <Phone size={16} />
                              Call
                            </a>

                            <a
                              className="agent-whatsapp"
                              href={`https://wa.me/91${digits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle size={16} />
                              WhatsApp
                            </a>
                          </>
                        ) : (
                          <span>à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤‚à¤¬à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
