
import React, { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  UserRound,
  RefreshCw,
  AlertCircle
} from "lucide-react";

// PC और मोबाइल दोनों के लिए API URL
const API = `http://${window.location.hostname}:4000/api`;

function isApprovedAndActive(agent) {
  const status = String(agent.status || "").toLowerCase();

  const approved =
    status === "approved" ||
    status === "approve";

  const activeValue =
    agent.is_active ?? agent.active;

  const active =
    activeValue === true ||
    activeValue === 1 ||
    String(activeValue).toLowerCase() === "true" ||
    String(activeValue).toLowerCase() === "1" ||
    String(activeValue).toLowerCase() === "active";

  return approved && active;
}

export default function AgentContact() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API}/public/agents`);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Agent की जानकारी नहीं मिल सकी।"
        );
      }

      const agentList = Array.isArray(data)
        ? data
        : Array.isArray(data.agents)
          ? data.agents
          : [];

      // केवल Approved और Active एजेंट
      setAgents(agentList.filter(isApprovedAndActive));

    } catch (err) {
      setAgents([]);
      setError(
        err.message || "Server से संपर्क नहीं हो पाया।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const groupedAgents = useMemo(() => {
    const groups = {};

    agents.forEach((agent) => {
      const district = agent.district || "अन्य जिला";
      const block = agent.block || "अन्य ब्लॉक";

      if (!groups[district]) {
        groups[district] = {};
      }

      if (!groups[district][block]) {
        groups[district][block] = [];
      }

      groups[district][block].push(agent);
    });

    return Object.fromEntries(
      Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b, "hi"))
        .map(([district, blocks]) => [
          district,
          Object.fromEntries(
            Object.entries(blocks).sort(([a], [b]) =>
              a.localeCompare(b, "hi")
            )
          )
        ])
    );
  }, [agents]);

  const phoneDigits = (mobile) =>
    String(mobile || "")
      .replace(/\D/g, "")
      .replace(/^91/, "");

  return (
    <div className="agent-page">

      <style>{`
        .agent-page {
          width: 100%;
          max-width: 1100px;
          box-sizing: border-box;
          padding: 20px;
          margin: 0 auto;
          color: #172033;
          font-family: Arial, sans-serif;
          overflow-wrap: anywhere;
        }

        .agent-page * {
          box-sizing: border-box;
        }

        .agent-heading {
          text-align: center;
          margin-bottom: 28px;
        }

        .agent-heading h2 {
          margin: 0 0 8px;
          font-size: 27px;
          color: #123b70;
        }

        .agent-heading p {
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        .agent-district {
          width: 100%;
          margin: 25px 0;
        }

        .agent-district-title {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #123b70;
          color: white;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 19px;
          margin: 0;
        }

        .agent-block-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #174a85;
          margin: 20px 0 12px;
          font-size: 17px;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%, 260px), 1fr)
          );
          gap: 15px;
          width: 100%;
        }

        .agent-card {
          min-width: 0;
          width: 100%;
          border: 1px solid #dbe4ef;
          border-radius: 14px;
          padding: 17px;
          background: white;
          box-shadow: 0 4px 14px rgba(15, 35, 65, .06);
        }

        .agent-agency {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 21px;
          font-weight: 800;
          line-height: 1.4;
          color: #123b70;
          margin-bottom: 12px;
          padding-bottom: 11px;
          border-bottom: 1px solid #e2e8f0;
          overflow-wrap: anywhere;
        }

        .agent-agency svg {
          flex-shrink: 0;
          margin-top: 4px;
        }

        .agent-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 17px;
          font-weight: bold;
          color: #263b57;
          margin-bottom: 12px;
          overflow-wrap: anywhere;
        }

        .agent-info {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          color: #526174;
          font-size: 14px;
          line-height: 1.6;
          margin: 9px 0;
          overflow-wrap: anywhere;
          min-width: 0;
        }

        .agent-info svg,
        .agent-name svg {
          flex-shrink: 0;
          margin-top: 2px;
          color: #1769aa;
        }

        .agent-info span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .agent-rates {
          background: #f5f8fc;
          padding: 12px;
          border-radius: 10px;
          margin-top: 13px;
        }

        .agent-rates h4 {
          margin: 0 0 9px;
          color: #174a85;
        }

        .agent-rate-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid #e2e8f0;
          padding: 7px 0;
          font-size: 14px;
        }

        .agent-rate-row:last-child {
          border-bottom: 0;
        }

        .agent-rate-row span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .agent-rate-row strong {
          flex-shrink: 0;
          text-align: right;
        }

        .agent-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .agent-actions a {
          flex: 1;
          min-width: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          text-align: center;
          padding: 11px 8px;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
        }

        .agent-call {
          background: #1769aa;
        }

        .agent-whatsapp {
          background: #168b50;
        }

        .agent-state {
          text-align: center;
          padding: 35px 15px;
          color: #64748b;
          background: #f8fafc;
          border-radius: 12px;
          overflow-wrap: anywhere;
        }

        .agent-retry {
          margin-top: 12px;
          padding: 10px 16px;
          border: 0;
          border-radius: 8px;
          background: #174a85;
          color: white;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .agent-page {
            padding: 12px;
          }

          .agent-heading {
            margin-bottom: 20px;
          }

          .agent-heading h2 {
            font-size: 23px;
          }

          .agent-heading p {
            font-size: 14px;
          }

          .agent-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }

          .agent-card {
            padding: 14px;
          }

          .agent-agency {
            font-size: 19px;
          }

          .agent-district-title {
            font-size: 17px;
          }

          .agent-actions a {
            padding: 12px 6px;
          }
        }
      `}</style>

      <div className="agent-heading">
        <h2>हमारे Borewell Agents</h2>
        <p>
          अपने जिले और ब्लॉक के अनुसार एजेंसी से संपर्क करें।
        </p>
      </div>

      {loading && (
        <div className="agent-state">
          <RefreshCw size={25} />
          <p>Agent की जानकारी लोड हो रही है...</p>
        </div>
      )}

      {!loading && error && (
        <div className="agent-state">
          <AlertCircle size={28} />
          <p>{error}</p>

          <button
            className="agent-retry"
            onClick={loadAgents}
          >
            दोबारा प्रयास करें
          </button>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="agent-state">
          <UserRound size={30} />
          <p>
            अभी कोई Approved और Active एजेंट उपलब्ध नहीं है।
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        Object.entries(groupedAgents).map(([district, blocks]) => (
          <section className="agent-district" key={district}>

            <h3 className="agent-district-title">
              <MapPin size={18} />
              {district}
            </h3>

            {Object.entries(blocks).map(([block, blockAgents]) => (
              <div key={block}>

                <h4 className="agent-block-title">
                  <MapPin size={16} />
                  {block}
                </h4>

                <div className="agent-grid">
                  {blockAgents.map((agent, index) => {
                    const digits = phoneDigits(
                      agent.mobile || agent.phone
                    );

                    const agencyName =
                      agent.agencyName ||
                      agent.agency_name ||
                      "Borewell Service Agency";

                    const officeAddress =
                      agent.officeAddress ||
                      agent.office_address ||
                      agent.address ||
                      "";

                    return (
                      <div
                        className="agent-card"
                        key={agent.id || agent.mobile || index}
                      >

                        <div className="agent-agency">
                          <Building2 size={19} />
                          <span>{agencyName}</span>
                        </div>

                        <div className="agent-name">
                          <UserRound size={18} />
                          {agent.name || "Agent"}
                        </div>

                        <div className="agent-info">
                          <MapPin size={17} />
                          <span>
                            <strong>जिला:</strong> {district}
                            <br />
                            <strong>ब्लॉक:</strong> {block}
                          </span>
                        </div>

                        <div className="agent-info">
                          <Building2 size={17} />
                          <span>
                            <strong>ऑफिस पता:</strong>
                            <br />
                            {officeAddress || "पता उपलब्ध नहीं है"}
                          </span>
                        </div>

                        <div className="agent-info">
                          <Phone size={17} />
                          <span>
                            {agent.mobile || agent.phone || "मोबाइल उपलब्ध नहीं"}
                          </span>
                        </div>

                        {Array.isArray(agent.rates) &&
                          agent.rates.length > 0 && (
                            <div className="agent-rates">
                              <h4>Approved Service Rates</h4>

                              {agent.rates.map((rate, index) => (
                                <div
                                  className="agent-rate-row"
                                  key={`${rate.service || rate.service_name}-${index}`}
                                >
                                  <span>
                                    {rate.service || rate.service_name}
                                  </span>

                                  <strong>
                                    ₹{rate.rate}
                                    {rate.unit ? ` / ${rate.unit}` : ""}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}

                        <div className="agent-actions">
                          <a
                            className="agent-call"
                            href={digits ? `tel:${digits}` : undefined}
                          >
                            <Phone size={16} />
                            Call
                          </a>

                          <a
                            className="agent-whatsapp"
                            href={
                              digits
                                ? `https://wa.me/91${digits}`
                                : undefined
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle size={16} />
                            WhatsApp
                          </a>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
    </div>
  );
}
