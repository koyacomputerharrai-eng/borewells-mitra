
import React, { useState } from "react";
import { BLOCKS } from "./areas.js";
import {
  Droplets, UserRound, Phone, LockKeyhole, ArrowLeft,
  Eye, EyeOff, UserPlus, LogIn, ShieldCheck, Building2, MapPin
} from "lucide-react";

const API = ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api") + "/auth";

export default function Auth({ onBack, onLogin }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  const isRegister = mode === "register";

  function resetMessage() {
    setMessage("");
    setError(false);
    setRegisteredUser(null);
  }

  
async function handleSubmit(event) {
  event.preventDefault();
  setMessage("");
  setError(false);
  setRegisteredUser(null);

  if (!login.trim() && !isRegister) {
    setError(true);
    setMessage("User ID à¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¡à¤¾à¤²à¥‡à¤‚à¥¤");
    return;
  }

  if (isRegister && password !== confirmPassword) {
    setError(true);
    setMessage("à¤¦à¥‹à¤¨à¥‹à¤‚ Password à¤à¤• à¤œà¥ˆà¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚à¥¤");
    return;
  }

  if (password.length < 8) {
    setError(true);
    setMessage("Password à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤° à¤•à¤¾ à¤°à¤–à¥‡à¤‚à¥¤");
    return;
  }

  setLoading(true);

  try {
    const endpoint = isRegister ? "register" : "login";

    const body = isRegister
      ? {
          name: name.trim(),
          mobile: mobile.trim(),
          password,
          role,
          ...(role === "agent" || role === "customer"
  ? { district, block }
  : {})
        }
      : {
          login: login.trim(),
          mobile: login.trim(),
          userId: login.trim(),
          password
        };

    console.log("Auth request:", {
      endpoint,
      loginId: isRegister ? undefined : login.trim()
    });

    const response = await fetch(`${API}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Login à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤"
      );
    }

    if (isRegister) {
      setRegisteredUser(data.user);
      setMessage(data.message || "Registration à¤¸à¤«à¤² à¤¹à¥à¤†à¥¤");
      setPassword("");
      setConfirmPassword("");
    } else {
      if (!data.token || !data.user) {
        throw new Error("Server à¤¸à¥‡ Login Token à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤");
      }

      localStorage.setItem("bmm-token", data.token);
      localStorage.setItem("bmm-user", JSON.stringify(data.user));

      onLogin?.(data.user);
    }
  } catch (err) {
    console.error("AUTH ERROR:", err);
    setError(true);
    setMessage(err.message || "Server à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤");
  } finally {
    setLoading(false);
  }
}

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #dbe4f0",
    borderRadius: "12px",
    fontSize: "15px",
    outline: "none",
    background: "#f8fafc",
    color: "#14233f"
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    color: "#34445f",
    fontSize: "13px",
    fontWeight: 700
  };

  const fieldStyle = { marginBottom: "17px" };

  const districts = Object.keys(BLOCKS || {});

  return (
    <div style={{
      minHeight: "100vh",
      boxSizing: "border-box",
      padding: "24px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(145deg,#e8f4ff,#f6f9ff 48%,#dcecff)",
      fontFamily: "Arial,sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 460,
        background: "#fff",
        borderRadius: 25,
        padding: "28px 24px",
        boxSizing: "border-box",
        boxShadow: "0 22px 65px rgba(25,65,125,.16)"
      }}>
        <button type="button" onClick={onBack} style={{
          border: 0, background: "#eff6ff", color: "#174ea6",
          padding: "9px 12px", borderRadius: 10, cursor: "pointer",
          marginBottom: 22, fontWeight: 700
        }}>
          <ArrowLeft size={17} style={{ verticalAlign: "middle" }} /> à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤à¤
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 66, height: 66, borderRadius: 20,
            background: "linear-gradient(135deg,#0757c9,#12a7df)",
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 14px"
          }}>
            <Droplets size={36} />
          </div>
          <h1 style={{ margin: 0, fontSize: 25, color: "#12294a" }}>
            Borewell Mitra MP
          </h1>
          <p style={{ color: "#718096", fontSize: 14 }}>
            à¤†à¤ªà¤•à¥€ à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾, à¤†à¤ªà¤•à¥‡ à¤ªà¤¾à¤¸
          </p>
        </div>

        <div style={{
          display: "flex", gap: 5, padding: 5,
          background: "#eff5fc", borderRadius: 13, marginBottom: 23
        }}>
          <button type="button" onClick={() => {
            setMode("login"); resetMessage();
          }} style={{
            flex: 1, border: 0, borderRadius: 10, padding: 12,
            cursor: "pointer", fontWeight: 700,
            color: mode === "login" ? "#fff" : "#62738d",
            background: mode === "login" ? "#0757c9" : "transparent"
          }}>
            <LogIn size={16} /> Login
          </button>

          <button type="button" onClick={() => {
            setMode("register"); resetMessage();
          }} style={{
            flex: 1, border: 0, borderRadius: 10, padding: 12,
            cursor: "pointer", fontWeight: 700,
            color: mode === "register" ? "#fff" : "#62738d",
            background: mode === "register" ? "#0757c9" : "transparent"
          }}>
            <UserPlus size={16} /> Registration
          </button>
        </div>

        <h2 style={{ color: "#172b4d", fontSize: 21 }}>
          {isRegister ? "à¤…à¤ªà¤¨à¤¾ Account à¤¬à¤¨à¤¾à¤à¤" : "à¤«à¤¿à¤° à¤¸à¥‡ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ!"}
        </h2>

        {registeredUser ? (
          <div style={{
            background: "#ecfdf5", border: "1px solid #a7f3d0",
            borderRadius: 14, padding: 18, color: "#065f46",
            textAlign: "center", lineHeight: 1.7
          }}>
            <ShieldCheck size={34} />
            <h3>Registration à¤¸à¤«à¤²!</h3>
            <p>à¤†à¤ªà¤•à¥€ User ID:</p>
            <strong style={{ fontSize: 25 }}>{registeredUser.userId}</strong>
            <p>{message}</p>
            <p style={{ fontSize: 13 }}>
              à¤‡à¤¸ ID à¤•à¥‹ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¤–à¥‡à¤‚à¥¤ Login à¤•à¥‡ à¤²à¤¿à¤ à¤‡à¤¸à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¤°à¥‡à¤‚à¥¤
            </p>
            <button type="button" onClick={() => {
              setMode("login");
              setLogin(registeredUser.userId);
              setRegisteredUser(null);
              setMessage("");
            }} style={{
              width: "100%", border: 0, borderRadius: 10,
              padding: 13, background: "#087b59", color: "#fff",
              fontWeight: 700, cursor: "pointer"
            }}>
              Login à¤•à¤°à¥‡à¤‚
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Account à¤•à¤¾ à¤ªà¥à¤°à¤•à¤¾à¤°</label>
                  <select value={role} onChange={(e) => {
                    setRole(e.target.value);
                    setDistrict("");
                    setBlock("");
                    resetMessage();
                  }} style={inputStyle}>
                    <option value="customer">à¤—à¥à¤°à¤¾à¤¹à¤•</option>
                    <option value="agent">Agent</option>
                    <option value="referral">Referral Mitra</option>
                  </select>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® *</label>
                  <input required value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚" style={inputStyle} />
                </div>

                {role === "agent" && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Agency à¤•à¤¾ à¤¨à¤¾à¤® *</label>
                    <div style={{ position: "relative" }}>
                      <Building2 size={18} style={{
                        position: "absolute", left: 12, top: 14, color: "#8293aa"
                      }} />
                      <input required value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder="à¤…à¤ªà¤¨à¥€ Agency à¤•à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
                        style={{ ...inputStyle, paddingLeft: 40 }} />
                    </div>
                  </div>
                )}

                <div style={fieldStyle}>
                  <label style={labelStyle}>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>
                  <div style={{ position: "relative" }}>
                    <Phone size={18} style={{
                      position: "absolute", left: 12, top: 14, color: "#8293aa"
                    }} />
                    <input required type="tel" inputMode="numeric"
                      maxLength={10} pattern="[6-9][0-9]{9}"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
                      style={{ ...inputStyle, paddingLeft: 40 }} />
                  </div>
                </div>

                {(role === "agent" || role === "customer") && (
                  <>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>
                      <select required value={district}
                        onChange={(e) => {
                          setDistrict(e.target.value);
                          setBlock("");
                        }} style={inputStyle}>
                        <option value="">à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚</option>
                        {districts.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *</label>
                      <select required value={block}
                        disabled={!district}
                        onChange={(e) => setBlock(e.target.value)}
                        style={inputStyle}>
                        <option value="">à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</option>
                        {(BLOCKS[district] || []).map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {role === "agent" && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Office à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *</label>
                    <div style={{ position: "relative" }}>
                      <MapPin size={18} style={{
                        position: "absolute", left: 12, top: 14, color: "#8293aa"
                      }} />
                      <textarea required value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        placeholder="à¤¦à¥à¤•à¤¾à¤¨/à¤‘à¤«à¤¿à¤¸, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾, à¤—à¥à¤°à¤¾à¤®/à¤¶à¤¹à¤°, à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡"
                        rows={3}
                        style={{ ...inputStyle, paddingLeft: 40, resize: "vertical" }} />
                    </div>
                  </div>
                )}

                {role === "customer" && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>à¤˜à¤° / à¤–à¥‡à¤¤ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *</label>
                    <div style={{ position: "relative" }}>
                      <MapPin size={18} style={{
                        position: "absolute", left: 12, top: 14, color: "#8293aa"
                      }} />
                      <textarea required value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="à¤—à¥à¤°à¤¾à¤®, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾, à¤˜à¤°/à¤–à¥‡à¤¤ à¤•à¤¾ à¤ªà¤¤à¤¾, à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡"
                        rows={3}
                        style={{ ...inputStyle, paddingLeft: 40, resize: "vertical" }} />
                    </div>
                  </div>
                )}
              </>
            )}

            {!isRegister && (
              <div style={fieldStyle}>
                <label style={labelStyle}>User ID à¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°</label>
                <input required value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="User ID à¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
                  style={inputStyle} />
              </div>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: "relative" }}>
                <LockKeyhole size={18} style={{
                  position: "absolute", left: 12, top: 14, color: "#8293aa"
                }} />
                <input required type={showPassword ? "text" : "password"}
                  minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤°"
                  style={{ ...inputStyle, paddingLeft: 40, paddingRight: 45 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 10, top: 10,
                    border: 0, background: "transparent", cursor: "pointer"
                  }}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div style={fieldStyle}>
                <label style={labelStyle}>Confirm Password *</label>
                <input required type={showPassword ? "text" : "password"}
                  minLength={8} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Password à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤²à¤¿à¤–à¥‡à¤‚" style={inputStyle} />
              </div>
            )}

            {message && (
              <div role="alert" style={{
                padding: 12, borderRadius: 10, marginBottom: 16,
                background: error ? "#fef2f2" : "#ecfdf5",
                color: error ? "#b91c1c" : "#047857",
                fontSize: 13
              }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", border: 0, borderRadius: 13, padding: 15,
              background: loading ? "#91a9ca" : "linear-gradient(135deg,#0757c9,#159ce0)",
              color: "#fff", fontWeight: 800, fontSize: 15,
              cursor: loading ? "wait" : "pointer"
            }}>
              {loading ? "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¾ à¤•à¤°à¥‡à¤‚..." :
                isRegister ? "Account à¤¬à¤¨à¤¾à¤à¤ â†’" : "à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ Login à¤•à¤°à¥‡à¤‚ â†’"}
            </button>
          </form>
        )}

        <div style={{
          textAlign: "center", borderTop: "1px solid #edf1f7",
          marginTop: 23, paddingTop: 16, color: "#718096",
          fontSize: 12, lineHeight: 1.8
        }}>
          <ShieldCheck size={15} style={{ verticalAlign: "middle" }} />
          {" "}Borewell Mitra MP â€” à¤†à¤ªà¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¹à¥ˆà¥¤
        </div>
      </div>
    </div>
  );
}
