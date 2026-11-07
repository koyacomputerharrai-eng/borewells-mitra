
import React, { useEffect, useState } from "react";
import {
  Users, IndianRupee, Gift, Share2, CheckCircle,
  Clock, RefreshCw, UserPlus, ArrowLeft
} from "lucide-react";

const API = "http://localhost:4000/api";

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
      setMessage("Server से संपर्क नहीं हो पाया।");
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
      setMessage("सही 10 अंकों का मोबाइल नंबर डालें।");
      return;
    }

    if (form.password.length < 8) {
      setMessage("Password कम से कम 8 अक्षरों का होना चाहिए।");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("दोनों Password एक जैसे नहीं हैं।");
      return;
    }

    if (!form.termsAccepted) {
      setMessage("कृपया नियम एवं शर्तें स्वीकार करें।");
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
        throw new Error(data.message || "आवेदन जमा नहीं हुआ।");
      }

      setApplication(data.application || data);
      setMessage(data.message || "आपका आवेदन सफलतापूर्वक जमा हो गया है।");

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
    "Referral Partner बनने के लिए आपका आवेदन Admin द्वारा जाँचा जाएगा। स्वीकृति के बाद Referral ID और Referral Code मिलेगा। कमीशन तभी देय होगा जब संबंधित बुकिंग का काम पूरा हो जाए और भुगतान Admin द्वारा सत्यापित कर दिया जाए।";

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
    return <div style={{ padding: 40, textAlign: "center" }}>लोड हो रहा है...</div>;
  }

  return (
    <div className="re-page">
      <style>{css}</style>

      <div className="re-wrap">
        {onBack && (
          <button className="re-btn re-back" onClick={onBack}>
            <ArrowLeft size={16} /> वापस जाएँ
          </button>
        )}

        <header className="re-hero">
          <Gift size={38} />
          <h1>Refer & Earn</h1>
          <p>Borewell Mitra MP के साथ जुड़ें और Referral Partner बनें।</p>
          <h2>हर सफल Referral पर कमीशन</h2>
          <p style={{ fontSize: 30, fontWeight: "bold", margin: 0 }}>
            ₹{commission}
          </p>
          <small>वर्तमान निर्धारित कमीशन राशि</small>
        </header>

        <div className="re-grid">
          <div className="re-stat">
            <Users size={27} color="#0878bd" />
            <h3>Referral Partner</h3>
            <p>अपनी ID और Referral Link से ग्राहक जोड़ें।</p>
          </div>

          <div className="re-stat">
            <IndianRupee size={27} color="#168b4b" />
            <h3>कमीशन</h3>
            <p>काम पूरा और भुगतान सत्यापित होने पर कमीशन देय होगा।</p>
          </div>

          <div className="re-stat">
            <Share2 size={27} color="#7c3aed" />
            <h3>आसान शेयरिंग</h3>
            <p>WhatsApp और अन्य माध्यमों से अपना लिंक साझा करें।</p>
          </div>
        </div>

        <section className="re-card">
          <h2><UserPlus size={22} /> Referral Partner आवेदन</h2>
          <p>नीचे अपनी सही जानकारी भरकर आवेदन जमा करें।</p>

          {message && <div className="re-message">{message}</div>}

          {application ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <CheckCircle size={48} color="green" />
              <h3>आवेदन प्राप्त हुआ!</h3>
              <p>आपका आवेदन Admin के पास समीक्षा के लिए भेज दिया गया है।</p>
              <p>स्वीकृति मिलने के बाद Referral ID और Referral Code जारी होगा।</p>
            </div>
          ) : (
            <form onSubmit={submitApplication}>
              <label className="re-label">पूरा नाम *</label>
              <input className="re-input" name="name" value={form.name} onChange={updateField} placeholder="अपना पूरा नाम" required />

              <label className="re-label">मोबाइल नंबर *</label>
              <input className="re-input" name="mobile" value={form.mobile} onChange={updateField} maxLength={10} placeholder="10 अंकों का मोबाइल नंबर" required />

              <label className="re-label">जिला *</label>
              <input className="re-input" name="district" value={form.district} onChange={updateField} placeholder="अपना जिला" required />

              <label className="re-label">ब्लॉक / तहसील *</label>
              <input className="re-input" name="block" value={form.block} onChange={updateField} placeholder="अपना ब्लॉक / तहसील" required />

              <label className="re-label">पूरा पता *</label>
              <textarea className="re-input" name="address" value={form.address} onChange={updateField} placeholder="ग्राम, पोस्ट, पिन कोड सहित पूरा पता" rows={3} required />

              <label className="re-label">Password बनाएँ *</label>
              <input className="re-input" type="password" name="password" value={form.password} onChange={updateField} placeholder="कम से कम 8 अक्षर" required />

              <label className="re-label">Confirm Password *</label>
              <input className="re-input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} placeholder="Password दोबारा डालें" required />

              <div style={{ background: "#f8fafc", padding: 15, borderRadius: 9, marginBottom: 15 }}>
                <b>नियम एवं शर्तें</b>
                <p style={{ lineHeight: 1.7 }}>{terms}</p>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <input type="checkbox" name="termsAccepted" checked={form.termsAccepted} onChange={updateField} />
                  मैं नियम एवं शर्तें स्वीकार करता/करती हूँ।
                </label>
              </div>

              <button className="re-btn" type="submit" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "आवेदन जमा हो रहा है..." : "Referral Partner आवेदन जमा करें"}
              </button>
            </form>
          )}
        </section>

        <section className="re-card">
          <h3><Clock size={20} /> आवेदन के बाद क्या होगा?</h3>
          <ol style={{ lineHeight: 2 }}>
            <li>आपका आवेदन Admin के पास पहुँचेगा।</li>
            <li>Admin आपकी जानकारी की जाँच करेगा।</li>
            <li>स्वीकृति के बाद Referral ID और Referral Code मिलेगा।</li>
            <li>आप अपना Referral Link साझा कर सकेंगे।</li>
            <li>सफल और सत्यापित बुकिंग पर कमीशन मिलेगा।</li>
          </ol>
        </section>

        <footer style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
          Borewell Mitra MP
        </footer>
      </div>
    </div>
  );
}
