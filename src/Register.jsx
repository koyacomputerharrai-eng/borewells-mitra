
import React, { useMemo, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

const getName = (item) =>
  typeof item === "string"
    ? item
    : item?.name || item?.district || item?.block || item?.label || "";

const getDistrictBlocks = (district) => {
  if (!district) return [];

  if (Array.isArray(BLOCKS)) {
    const group = BLOCKS.find(
      (item) => item?.district === district
    );

    if (group?.blocks) return group.blocks;

    return BLOCKS.filter(
      (item) => item?.district === district
    ).map(getName);
  }

  const list = BLOCKS[district] || [];
  return Array.isArray(list) ? list : [];
};

export default function Register({ onLogin }) {
  const [role, setRole] = useState("customer");

  const [form, setForm] = useState({
    name: "",
    agency_name: "",
    mobile: "",
    password: "",
    district: "",
    block: "",
    address: "",
    service: "drilling",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const districtList = useMemo(
    () => DISTRICTS.map(getName).filter(Boolean),
    []
  );

  const blockList = useMemo(
    () => getDistrictBlocks(form.district).map(getName).filter(Boolean),
    [form.district]
  );

  const update = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "district" ? { block: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (form.password.length < 6) {
      setMessage("à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¤® à¤¸à¥‡ à¤•à¤® 6 à¤…à¤•à¥à¤·à¤°à¥‹à¤‚ à¤•à¤¾ à¤¹à¥‹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
      return;
    }

    if (!form.district || !form.block) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    if (role === "agent" && !form.agency_name.trim()) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile,
        password: form.password,
        role,
        district: form.district,
        block: form.block,
        address: form.address.trim(),
        agency_name: role === "agent" ? form.agency_name.trim() : "",
        service: role === "customer" ? form.service : "",
      };

      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤");
      }

      if (role === "agent") {
        setMessage(
          "à¤à¤œà¥‡à¤‚à¤Ÿ à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨ à¤¸à¤«à¤²! à¤†à¤ªà¤•à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ Admin Approval à¤•à¥‡ à¤¬à¤¾à¤¦ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¹à¥‹à¤—à¤¾à¥¤"
        );
      } else {
        setMessage(
          data.message || "à¤—à¥à¤°à¤¾à¤¹à¤• à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¨ à¤—à¤¯à¤¾à¥¤ à¤…à¤¬ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚à¥¤"
        );
      }

      setForm({
        name: "",
        agency_name: "",
        mobile: "",
        password: "",
        district: "",
        block: "",
        address: "",
        service: "drilling",
      });

    } catch (error) {
      setMessage(error.message || "à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "13px",
    border: "1px solid #d9e1ea",
    borderRadius: "9px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontWeight: "600",
    color: "#243b53",
  };

  const fieldStyle = {
    marginBottom: "17px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f3f7fc",
      padding: "30px 15px",
      fontFamily: "inherit",
    }}>
      <div style={{
        maxWidth: "540px",
        margin: "auto",
        background: "#fff",
        padding: "25px",
        borderRadius: "16px",
        boxShadow: "0 8px 30px rgba(20,50,80,0.09)",
      }}>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ color: "#1477bd", margin: "0 0 8px" }}>
            à¤…à¤ªà¤¨à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤à¤
          </h2>
          <p style={{ color: "#718096", margin: 0 }}>
            à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤®à¤¿à¤¤à¥à¤° MP à¤•à¥‡ à¤¸à¤¾à¤¥ à¤œà¥à¤¡à¤¼à¥‡à¤‚
          </p>
        </div>

        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px",
        }}>
          {[
            { value: "customer", label: "à¤—à¥à¤°à¤¾à¤¹à¤• à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨" },
            { value: "agent", label: "à¤à¤œà¥‡à¤‚à¤Ÿ à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setRole(item.value);
                setMessage("");
              }}
              style={{
                flex: 1,
                padding: "12px 5px",
                border: "none",
                borderRadius: "9px",
                cursor: "pointer",
                fontWeight: "700",
                color: role === item.value ? "#fff" : "#24516f",
                background: role === item.value ? "#1477bd" : "#eaf2f9",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          <div style={fieldStyle}>
            <label style={labelStyle}>à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® *</label>
            <input
              style={inputStyle}
              placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          {role === "agent" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® *</label>
              <input
                style={inputStyle}
                placeholder="à¤…à¤ªà¤¨à¥€ à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
                value={form.agency_name}
                onChange={(e) => update("agency_name", e.target.value)}
                required
              />
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>
            <input
              style={inputStyle}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
              value={form.mobile}
              onChange={(e) =>
                update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ *</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="à¤•à¤® à¤¸à¥‡ à¤•à¤® 6 à¤…à¤•à¥à¤·à¤°"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>
            <select
              style={inputStyle}
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
              required
            >
              <option value="">à¤®à¤§à¥à¤¯ à¤ªà¥à¤°à¤¦à¥‡à¤¶ à¤•à¤¾ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚</option>
              {districtList.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>à¤¬à¥à¤²à¥‰à¤• / à¤¤à¤¹à¤¸à¥€à¤² à¤šà¥à¤¨à¥‡à¤‚ *</label>
            <select
              style={inputStyle}
              value={form.block}
              onChange={(e) => update("block", e.target.value)}
              disabled={!form.district}
              required
            >
              <option value="">
                {form.district ? "à¤¬à¥à¤²à¥‰à¤• / à¤¤à¤¹à¤¸à¥€à¤² à¤šà¥à¤¨à¥‡à¤‚" : "à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚"}
              </option>
              {blockList.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              {role === "agent" ? "à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *" : "à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *"}
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
              placeholder={
                role === "agent"
                  ? "à¤…à¤ªà¤¨à¥€ à¤à¤œà¥‡à¤‚à¤¸à¥€ / à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¤¤à¤¾ à¤²à¤¿à¤–à¥‡à¤‚"
                  : "à¤—à¤¾à¤à¤µ, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾ à¤”à¤° à¤®à¤•à¤¾à¤¨ à¤¨à¤‚à¤¬à¤° à¤²à¤¿à¤–à¥‡à¤‚"
              }
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
          </div>

          {role === "customer" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>à¤…à¤ªà¤¨à¥€ à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>

              <label style={{
                display: "flex",
                gap: "10px",
                padding: "13px",
                border: "1px solid #d9e1ea",
                borderRadius: "9px",
                marginBottom: "9px",
                cursor: "pointer",
              }}>
                <input
                  type="radio"
                  name="service"
                  value="drilling"
                  checked={form.service === "drilling"}
                  onChange={(e) => update("service", e.target.value)}
                />
                à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤² (New Borewell)
              </label>

              <label style={{
                display: "flex",
                gap: "10px",
                padding: "13px",
                border: "1px solid #d9e1ea",
                borderRadius: "9px",
                cursor: "pointer",
              }}>
                <input
                  type="radio"
                  name="service"
                  value="repairing"
                  checked={form.service === "repairing"}
                  onChange={(e) => update("service", e.target.value)}
                />
                à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤— (Repairing)
              </label>
            </div>
          )}

          {message && (
            <div style={{
              padding: "12px",
              borderRadius: "8px",
              background: "#eef6ff",
              color: "#175b8c",
              marginBottom: "15px",
              fontSize: "14px",
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "9px",
              background: loading ? "#8baec9" : "#1477bd",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading
              ? "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¾ à¤•à¤°à¥‡à¤‚..."
              : role === "agent"
                ? "à¤à¤œà¥‡à¤‚à¤Ÿ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤à¤"
                : "à¤—à¥à¤°à¤¾à¤¹à¤• à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤à¤"}
          </button>

        </form>

        <p style={{
          textAlign: "center",
          color: "#718096",
          marginTop: "20px",
          marginBottom: 0,
        }}>
          à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¹à¥ˆ?{" "}
          <button
            type="button"
            onClick={onLogin}
            style={{
              border: "none",
              background: "none",
              color: "#1477bd",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚
          </button>
        </p>

      </div>
    </div>
  );
}
