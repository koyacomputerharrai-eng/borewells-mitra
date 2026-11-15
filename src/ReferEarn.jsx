
import React, { useEffect, useState } from "react";
import {
  Users, IndianRupee, Gift, Share2, CheckCircle,
  Clock, RefreshCw, UserPlus, ArrowLeft
} from "lucide-react";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

export default function ReferEarn({ user, onBack, onLogin }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState(null);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    district: "",
    block: "",
    address: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false
  });

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(`${API}/referral/settings`);
      const data = await response.json();
      if (response.ok) setSettings(data);
    } catch {
      setMessage("Server à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function submitApplication(e) {
    e.preventDefault();
    setMessage("");

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setMessage("à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¡à¤¾à¤²à¥‡à¤‚à¥¤");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤°à¥‹à¤‚ à¤•à¤¾ à¤¹à¥‹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("à¤¦à¥‹à¤¨à¥‹à¤‚ Password à¤à¤• à¤œà¥ˆà¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚à¥¤");
      return;
    }

    if (!form.termsAccepted) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¨à¤¿à¤¯à¤® à¤à¤µà¤‚ à¤¶à¤°à¥à¤¤à¥‡à¤‚ à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤•à¤°à¥‡à¤‚à¥¤");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API}/referral/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "à¤†à¤µà¥‡à¤¦à¤¨ à¤œà¤®à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤");
      }

      setApplication(data.application || data);
      setMessage(data.message || "à¤†à¤ªà¤•à¤¾ à¤†à¤µà¥‡à¤¦à¤¨ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤œà¤®à¤¾ à¤¹à¥‹ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤");

      setForm({
        name: "",
        mobile: "",
        district: "",
        block: "",
        address: "",
        password: "",
        confirmPassword: "",
        termsAccepted: false
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const commission =
    settings?.commission ??
    settings?.commission_amount ??
    200;

  const terms =
    settings?.terms ||
    "Referral Partner à¤¬à¤¨à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤†à¤ªà¤•à¤¾ à¤†à¤µà¥‡à¤¦à¤¨ Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤œà¤¾à¤à¤šà¤¾ à¤œà¤¾à¤à¤—à¤¾à¥¤ à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤•à¥‡ à¤¬à¤¾à¤¦ Referral ID à¤”à¤° Referral Code à¤®à¤¿à¤²à¥‡à¤—à¤¾à¥¤ à¤•à¤®à¥€à¤¶à¤¨ à¤¤à¤­à¥€ à¤¦à¥‡à¤¯ à¤¹à¥‹à¤—à¤¾ à¤œà¤¬ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤¾ à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾ à¤¹à¥‹ à¤œà¤¾à¤ à¤”à¤° à¤­à¥à¤—à¤¤à¤¾à¤¨ Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤œà¤¾à¤à¥¤";

  const css = `
    .re-page{min-height:100vh;background:#f3f6fb;padding:20px;font-family:Arial,sans-serif;color:#172033}
    .re-wrap{max-width:950px;margin:auto}
    .re-hero{background:linear-gradient(125deg,#073b75,#0785c5);color:white;padding:30px;border-radius:18px}
    .re-hero h1{margin:0 0 10px;font-size:29px}
    .re-card{background:white;padding:22px;border-radius:14px;margin-top:18px;box-shadow:0 3px 15px #0000000c}
    .re-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:18px}
    .re-stat{background:#f0f7ff;padding:18px;border-radius:12px}
    .re-stat h2{margin:8px 0;color:#07518a}
    .re-input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:8px;margin:7px 0 15px;font-size:15px}
    .re-label{font-weight:bold;font-size:14px}
    .re-btn{border:0;border-radius:9px;padding:12px 18px;background:#0878bd;color:white;font-weight:bold;cursor:pointer}
    .re-btn:disabled{opacity:.6;cursor:not-allowed}
    .re-message{padding:13px;background:#eef6ff;border-radius:9px;margin-top:15px;overflow-wrap:anywhere}
    .re-back{background:white;color:#07518a;margin-bottom:15px}
    @media(max-width:600px){.re-page{padding:10px}.re-hero{padding:22px}.re-hero h1{font-size:23px}.re-card{padding:16px}}
  `;

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...</div>;
  }

  return (
    <div className="re-page">
      <style>{css}</style>

      <div className="re-wrap">
        {onBack && (
          <button className="re-btn re-back" onClick={onBack}>
            <ArrowLeft size={16} /> à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤à¤
          </button>
        )}

        <header className="re-hero">
          <Gift size={38} />
          <h1>Refer & Earn</h1>
          <p>Borewell Mitra MP à¤•à¥‡ à¤¸à¤¾à¤¥ à¤œà¥à¤¡à¤¼à¥‡à¤‚ à¤”à¤° Referral Partner à¤¬à¤¨à¥‡à¤‚à¥¤</p>
          <h2>à¤¹à¤° à¤¸à¤«à¤² Referral à¤ªà¤° à¤•à¤®à¥€à¤¶à¤¨</h2>
          <p style={{ fontSize: 30, fontWeight: "bold", margin: 0 }}>
            â‚¹{commission}
          </p>
          <small>à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤¨à¤¿à¤°à¥à¤§à¤¾à¤°à¤¿à¤¤ à¤•à¤®à¥€à¤¶à¤¨ à¤°à¤¾à¤¶à¤¿</small>
        </header>

        <div className="re-grid">
          <div className="re-stat">
            <Users size={27} color="#0878bd" />
            <h3>Referral Partner</h3>
            <p>à¤…à¤ªà¤¨à¥€ ID à¤”à¤° Referral Link à¤¸à¥‡ à¤—à¥à¤°à¤¾à¤¹à¤• à¤œà¥‹à¤¡à¤¼à¥‡à¤‚à¥¤</p>
          </div>

          <div className="re-stat">
            <IndianRupee size={27} color="#168b4b" />
            <h3>à¤•à¤®à¥€à¤¶à¤¨</h3>
            <p>à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾ à¤”à¤° à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° à¤•à¤®à¥€à¤¶à¤¨ à¤¦à¥‡à¤¯ à¤¹à¥‹à¤—à¤¾à¥¤</p>
          </div>

          <div className="re-stat">
            <Share2 size={27} color="#7c3aed" />
            <h3>à¤†à¤¸à¤¾à¤¨ à¤¶à¥‡à¤¯à¤°à¤¿à¤‚à¤—</h3>
            <p>WhatsApp à¤”à¤° à¤…à¤¨à¥à¤¯ à¤®à¤¾à¤§à¥à¤¯à¤®à¥‹à¤‚ à¤¸à¥‡ à¤…à¤ªà¤¨à¤¾ à¤²à¤¿à¤‚à¤• à¤¸à¤¾à¤à¤¾ à¤•à¤°à¥‡à¤‚à¥¤</p>
          </div>
        </div>

        <section className="re-card">
          <h2><UserPlus size={22} /> Referral Partner à¤†à¤µà¥‡à¤¦à¤¨</h2>
          <p>à¤¨à¥€à¤šà¥‡ à¤…à¤ªà¤¨à¥€ à¤¸à¤¹à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤°à¤•à¤° à¤†à¤µà¥‡à¤¦à¤¨ à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚à¥¤</p>

          {message && <div className="re-message">{message}</div>}

          {application ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <CheckCircle size={48} color="green" />
              <h3>à¤†à¤µà¥‡à¤¦à¤¨ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤¹à¥à¤†!</h3>
              <p>à¤†à¤ªà¤•à¤¾ à¤†à¤µà¥‡à¤¦à¤¨ Admin à¤•à¥‡ à¤ªà¤¾à¤¸ à¤¸à¤®à¥€à¤•à¥à¤·à¤¾ à¤•à¥‡ à¤²à¤¿à¤ à¤­à¥‡à¤œ à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤</p>
              <p>à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤®à¤¿à¤²à¤¨à¥‡ à¤•à¥‡ à¤¬à¤¾à¤¦ Referral ID à¤”à¤° Referral Code à¤œà¤¾à¤°à¥€ à¤¹à¥‹à¤—à¤¾à¥¤</p>
            </div>
          ) : (
            <form onSubmit={submitApplication}>
              <label className="re-label">à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® *</label>
              <input className="re-input" name="name" value={form.name} onChange={updateField} placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®" required />

              <label className="re-label">à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>
              <input className="re-input" name="mobile" value={form.mobile} onChange={updateField} maxLength={10} placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°" required />

              <label className="re-label">à¤œà¤¿à¤²à¤¾ *</label>
              <input className="re-input" name="district" value={form.district} onChange={updateField} placeholder="à¤…à¤ªà¤¨à¤¾ à¤œà¤¿à¤²à¤¾" required />

              <label className="re-label">à¤¬à¥à¤²à¥‰à¤• / à¤¤à¤¹à¤¸à¥€à¤² *</label>
              <input className="re-input" name="block" value={form.block} onChange={updateField} placeholder="à¤…à¤ªà¤¨à¤¾ à¤¬à¥à¤²à¥‰à¤• / à¤¤à¤¹à¤¸à¥€à¤²" required />

              <label className="re-label">à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *</label>
              <textarea className="re-input" name="address" value={form.address} onChange={updateField} placeholder="à¤—à¥à¤°à¤¾à¤®, à¤ªà¥‹à¤¸à¥à¤Ÿ, à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡ à¤¸à¤¹à¤¿à¤¤ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾" rows={3} required />

              <label className="re-label">Password à¤¬à¤¨à¤¾à¤à¤ *</label>
              <input className="re-input" type="password" name="password" value={form.password} onChange={updateField} placeholder="à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤°" required />

              <label className="re-label">Confirm Password *</label>
              <input className="re-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} placeholder="Password à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤¡à¤¾à¤²à¥‡à¤‚" required />

              <div style={{ background: "#f8fafc", padding: 15, borderRadius: 9, marginBottom: 15 }}>
                <b>à¤¨à¤¿à¤¯à¤® à¤à¤µà¤‚ à¤¶à¤°à¥à¤¤à¥‡à¤‚</b>
                <p style={{ lineHeight: 1.7 }}>{terms}</p>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={updateField} />
                  à¤®à¥ˆà¤‚ à¤¨à¤¿à¤¯à¤® à¤à¤µà¤‚ à¤¶à¤°à¥à¤¤à¥‡à¤‚ à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤•à¤°à¤¤à¤¾/à¤•à¤°à¤¤à¥€ à¤¹à¥‚à¤à¥¤
                </label>
              </div>

              <button className="re-btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "à¤†à¤µà¥‡à¤¦à¤¨ à¤œà¤®à¤¾ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : "Referral Partner à¤†à¤µà¥‡à¤¦à¤¨ à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚"}
              </button>
            </form>
          )}
        </section>

        <section className="re-card">
          <h3><Clock size={20} /> à¤†à¤µà¥‡à¤¦à¤¨ à¤•à¥‡ à¤¬à¤¾à¤¦ à¤•à¥à¤¯à¤¾ à¤¹à¥‹à¤—à¤¾?</h3>
          <ol style={{ lineHeight: 2 }}>
            <li>à¤†à¤ªà¤•à¤¾ à¤†à¤µà¥‡à¤¦à¤¨ Admin à¤•à¥‡ à¤ªà¤¾à¤¸ à¤ªà¤¹à¥à¤à¤šà¥‡à¤—à¤¾à¥¤</li>
            <li>Admin à¤†à¤ªà¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¥‡à¤—à¤¾à¥¤</li>
            <li>à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤•à¥‡ à¤¬à¤¾à¤¦ Referral ID à¤”à¤° Referral Code à¤®à¤¿à¤²à¥‡à¤—à¤¾à¥¤</li>
            <li>à¤†à¤ª à¤…à¤ªà¤¨à¤¾ Referral Link à¤¸à¤¾à¤à¤¾ à¤•à¤° à¤¸à¤•à¥‡à¤‚à¤—à¥‡à¥¤</li>
            <li>à¤¸à¤«à¤² à¤”à¤° à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤ªà¤° à¤•à¤®à¥€à¤¶à¤¨ à¤®à¤¿à¤²à¥‡à¤—à¤¾à¥¤</li>
          </ol>
        </section>

        <footer style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
          Borewell Mitra MP
        </footer>
      </div>
    </div>
  );
}
