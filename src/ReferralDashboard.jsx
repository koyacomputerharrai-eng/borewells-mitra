
import React, { useEffect, useState } from "react";
import {
  Copy, Share2, MessageCircle, Users, IndianRupee,
  ClipboardList, PlusCircle, RefreshCw, LogOut, ArrowLeft,
  CheckCircle, Clock, XCircle, Link as LinkIcon
} from "lucide-react";

const API = "http://localhost:4000/api";

export default function ReferralDashboard({ user, onLogout, onBack }) {
  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    mobile: "",
    district: "",
    tehsil: "",
    block: "",
    address: "",
    service: "New Borewell"
  });

  const token = localStorage.getItem("bmm-token") ||
    localStorage.getItem("token") || "";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, settingsResponse] = await Promise.all([
        fetch(`${API}/referral/dashboard`, { headers }),
        fetch(`${API}/referral/settings`)
      ]);

      const dashboardData = await dashboardResponse.json();
      const settingsData = await settingsResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(dashboardData.message || "Dashboard लोड नहीं हुआ");
      }

      setDashboard(dashboardData);
      setSettings(settingsData);
    } catch (err) {
      setError(err.message || "Server से संपर्क नहीं हो पाया");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function updateForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getReferralLink() {
    return dashboard?.referralLink ||
      dashboard?.referral_link ||
      `${window.location.origin}/?referralCode=${dashboard?.partner?.referral_code || dashboard?.referralCode || ""}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setMessage("Referral Link कॉपी हो गया");
    } catch {
      setMessage("लिंक कॉपी नहीं हुआ। कृपया लिंक को स्वयं कॉपी करें।");
    }
  }

  function shareWhatsApp() {
    const text = `नमस्कार! Borewell Mitra MP पर बोरवेल बुकिंग के लिए इस लिंक पर क्लिक करें:\n${getReferralLink()}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  async function submitBooking(e) {
    e.preventDefault();

    if (!form.customerName.trim() || !form.mobile.trim() ||
        !form.district.trim() || !form.block.trim() ||
        !form.address.trim()) {
      setMessage("कृपया सभी जरूरी जानकारी भरें");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setMessage("कृपया सही 10 अंकों का मोबाइल नंबर डालें");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/referral/bookings`, {
        method: "POST",
        headers,
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Booking नहीं हो पाई");
      }

      setMessage(
        `Booking सफल हुई! Booking ID: ${result.bookingCode || result.booking?.bookingCode || "बन गई"}`
      );

      setForm({
        customerName: "",
        mobile: "",
        district: "",
        tehsil: "",
        block: "",
        address: "",
        service: "New Borewell"
      });

      setShowForm(false);
      loadDashboard();
    } catch (err) {
      setMessage(err.message || "Booking में समस्या आई");
    } finally {
      setSaving(false);
    }
  }

  const partner = dashboard?.partner || dashboard?.user || {};
  const bookings = dashboard?.bookings || [];
  const commissions = dashboard?.commissions || [];

  const totalBookings = dashboard?.totalBookings ?? bookings.length;
  const totalCommission = dashboard?.totalCommission ??
    dashboard?.total_commission ?? 0;
  const paidCommission = dashboard?.paidCommission ??
    dashboard?.paid_commission ?? 0;
  const pendingCommission = dashboard?.pendingCommission ??
    dashboard?.pending_commission ?? 0;

  function statusIcon(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("paid") || value.includes("भुगतान")) {
      return <CheckCircle size={16} color="green" />;
    }

    if (value.includes("reject") || value.includes("रद्द")) {
      return <XCircle size={16} color="red" />;
    }

    return <Clock size={16} color="#d97706" />;
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f3f6fb",
      padding: "18px",
      fontFamily: "Arial, sans-serif",
      color: "#172033"
    },
    container: {
      maxWidth: "1100px",
      margin: "auto"
    },
    header: {
      background: "linear-gradient(120deg,#073b75,#0878bd)",
      color: "white",
      padding: "22px",
      borderRadius: "16px",
      marginBottom: "18px"
    },
    button: {
      border: "none",
      borderRadius: "9px",
      padding: "11px 15px",
      cursor: "pointer",
      fontWeight: "bold",
      margin: "4px"
    },
    card: {
      background: "white",
      borderRadius: "13px",
      padding: "17px",
      boxShadow: "0 2px 10px #0000000b",
      minWidth: 0
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px",
      border: "1px solid #d6dce5",
      borderRadius: "8px",
      marginTop: "6px",
      marginBottom: "13px",
      fontSize: "15px"
    },
    label: {
      fontWeight: "bold",
      fontSize: "14px"
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <RefreshCw size={30} />
        <p>Referral Dashboard लोड हो रहा है...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ margin: "0 0 8px" }}>Borewell Mitra MP</h2>
              <div>Referral Partner Dashboard</div>
            </div>

            <div>
              {onBack && (
                <button
                  style={{ ...styles.button, background: "white", color: "#07518a" }}
                  onClick={onBack}
                >
                  <ArrowLeft size={15} /> वापस
                </button>
              )}
              <button
                style={{ ...styles.button, background: "#ffffff22", color: "white" }}
                onClick={loadDashboard}
              >
                <RefreshCw size={15} /> Refresh
              </button>
              {onLogout && (
                <button
                  style={{ ...styles.button, background: "#b91c1c", color: "white" }}
                  onClick={onLogout}
                >
                  <LogOut size={15} /> Logout
                </button>
              )}
            </div>
          </div>

          <h3 style={{ marginBottom: 4 }}>
            नमस्कार, {partner.name || user?.name || "Referral Partner"}
          </h3>
          <div>आपका Referral Business Dashboard</div>
        </header>

        {error && (
          <div style={{ ...styles.card, color: "#b91c1c", marginBottom: 15 }}>
            {error}
            <p>कृपया Backend Server चालू होने की जाँच करें।</p>
          </div>
        )}

        {message && (
          <div style={{ ...styles.card, marginBottom: 15, color: "#075e35" }}>
            {message}
            <button
              style={{ ...styles.button, background: "#e5e7eb" }}
              onClick={() => setMessage("")}
            >
              बंद करें
            </button>
          </div>
        )}

        <section style={styles.card}>
          <h3><Users size={19} /> आपकी Referral जानकारी</h3>
          <p><b>नाम:</b> {partner.name || user?.name || "—"}</p>
          <p><b>Referral ID:</b> {partner.userId || partner.user_id || partner.id || "—"}</p>
          <p><b>Referral Code:</b> {partner.referral_code || dashboard?.referralCode || "—"}</p>
          <p><b>मोबाइल:</b> {partner.mobile || user?.mobile || "—"}</p>

          <div style={{
            background: "#eef6ff",
            padding: 12,
            borderRadius: 9,
            overflowWrap: "anywhere"
          }}>
            <b><LinkIcon size={16} /> आपका Referral Link</b>
            <p>{getReferralLink()}</p>
            <button
              style={{ ...styles.button, background: "#075eaa", color: "white" }}
              onClick={copyLink}
            >
              <Copy size={15} /> Copy Link
            </button>
            <button
              style={{ ...styles.button, background: "#168b4b", color: "white" }}
              onClick={shareWhatsApp}
            >
              <MessageCircle size={15} /> WhatsApp Share
            </button>
          </div>
        </section>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 13,
          margin: "18px 0"
        }}>
          <div style={styles.card}>
            <Users color="#0878bd" />
            <h2>{totalBookings}</h2>
            <div>कुल Referral Bookings</div>
          </div>

          <div style={styles.card}>
            <IndianRupee color="#168b4b" />
            <h2>₹{totalCommission}</h2>
            <div>कुल कमीशन</div>
          </div>

          <div style={styles.card}>
            <CheckCircle color="#168b4b" />
            <h2>₹{paidCommission}</h2>
            <div>भुगतान किया गया</div>
          </div>

          <div style={styles.card}>
            <Clock color="#d97706" />
            <h2>₹{pendingCommission}</h2>
            <div>लंबित कमीशन</div>
          </div>
        </div>

        <section style={{ ...styles.card, marginBottom: 18 }}>
          <h3>Referral Commission नियम</h3>
          <p>
            प्रति सफल बुकिंग कमीशन: <b>₹{settings?.commission ?? settings?.commission_amount ?? 200}</b>
          </p>
          <p>
            कमीशन तभी मिलेगा जब बोरवेल का काम पूरा हो जाए और Admin द्वारा भुगतान सत्यापित कर दिया जाए।
          </p>
        </section>

        <div style={{ marginBottom: 15 }}>
          <button
            style={{ ...styles.button, background: "#0878bd", color: "white" }}
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle size={17} />
            {showForm ? "फॉर्म बंद करें" : "ग्राहक की नई Booking जोड़ें"}
          </button>
        </div>

        {showForm && (
          <section style={{ ...styles.card, marginBottom: 18 }}>
            <h3>नई Referral Booking</h3>

            <form onSubmit={submitBooking}>
              <label style={styles.label}>ग्राहक का नाम *</label>
              <input
                style={styles.input}
                name="customerName"
                value={form.customerName}
                onChange={updateForm}
                placeholder="ग्राहक का पूरा नाम"
                required
              />

              <label style={styles.label}>मोबाइल नंबर *</label>
              <input
                style={styles.input}
                name="mobile"
                value={form.mobile}
                onChange={updateForm}
                placeholder="10 अंकों का मोबाइल नंबर"
                maxLength={10}
                required
              />

              <label style={styles.label}>जिला *</label>
              <input
                style={styles.input}
                name="district"
                value={form.district}
                onChange={updateForm}
                placeholder="जिला"
                required
              />

              <label style={styles.label}>तहसील</label>
              <input
                style={styles.input}
                name="tehsil"
                value={form.tehsil}
                onChange={updateForm}
                placeholder="तहसील"
              />

              <label style={styles.label}>ब्लॉक *</label>
              <input
                style={styles.input}
                name="block"
                value={form.block}
                onChange={updateForm}
                placeholder="ब्लॉक"
                required
              />

              <label style={styles.label}>पूरा पता *</label>
              <textarea
                style={{ ...styles.input, minHeight: 85 }}
                name="address"
                value={form.address}
                onChange={updateForm}
                placeholder="ग्राम, पोस्ट, पिन कोड सहित पूरा पता"
                required
              />

              <label style={styles.label}>सेवा चुनें</label>
              <select
                style={styles.input}
                name="service"
                value={form.service}
                onChange={updateForm}
              >
                <option value="New Borewell">New Borewell</option>
                <option value="Repairing">Repairing</option>
                <option value="Casing Pipe">Casing Pipe</option>
                <option value="MS Pipe">MS Pipe</option>
                <option value="Other Services">Other Services</option>
              </select>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...styles.button,
                  background: "#0878bd",
                  color: "white",
                  width: "100%",
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? "Booking भेजी जा रही है..." : "Booking Submit करें"}
              </button>
            </form>
          </section>
        )}

        <section style={{ ...styles.card, marginBottom: 18 }}>
          <h3><ClipboardList size={19} /> आपकी Referral Bookings</h3>

          {bookings.length === 0 ? (
            <p>अभी कोई Referral Booking उपलब्ध नहीं है।</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#eef3f8", textAlign: "left" }}>
                    <th style={{ padding: 10 }}>Booking ID</th>
                    <th style={{ padding: 10 }}>ग्राहक</th>
                    <th style={{ padding: 10 }}>मोबाइल</th>
                    <th style={{ padding: 10 }}>सेवा</th>
                    <th style={{ padding: 10 }}>स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => (
                    <tr key={booking.id || index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: 10 }}>
                        {booking.bookingCode || booking.booking_code || booking.id}
                      </td>
                      <td style={{ padding: 10 }}>{booking.name || booking.customerName}</td>
                      <td style={{ padding: 10 }}>{booking.mobile}</td>
                      <td style={{ padding: 10 }}>{booking.service}</td>
                      <td style={{ padding: 10 }}>{booking.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h3><IndianRupee size={19} /> कमीशन की जानकारी</h3>

          {commissions.length === 0 ? (
            <p>अभी कोई कमीशन रिकॉर्ड उपलब्ध नहीं है।</p>
          ) : (
            commissions.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  padding: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8
                }}
              >
                <div>
                  <b>Booking ID: {item.booking_id}</b>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {item.created_at || ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {statusIcon(item.status)}
                    {item.status || "Pending"}
                  </div>
                </div>
                <b>₹{item.amount || 0}</b>
              </div>
            ))
          )}
        </section>

        <footer style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
          Borewell Mitra MP | Referral Partner Panel
        </footer>

      </div>
    </div>
  );
}
