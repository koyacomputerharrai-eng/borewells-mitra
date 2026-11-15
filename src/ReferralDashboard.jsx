
import React, { useEffect, useState } from "react";
import {
  Copy, Share2, MessageCircle, Users, IndianRupee,
  ClipboardList, PlusCircle, RefreshCw, LogOut, ArrowLeft,
  CheckCircle, Clock, XCircle, Link as LinkIcon
} from "lucide-react";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

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
        throw new Error(dashboardData.message || "Dashboard à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†");
      }

      setDashboard(dashboardData);
      setSettings(settingsData);
    } catch (err) {
      setError(err.message || "Server à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾");
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
      setMessage("Referral Link à¤•à¥‰à¤ªà¥€ à¤¹à¥‹ à¤—à¤¯à¤¾");
    } catch {
      setMessage("à¤²à¤¿à¤‚à¤• à¤•à¥‰à¤ªà¥€ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤²à¤¿à¤‚à¤• à¤•à¥‹ à¤¸à¥à¤µà¤¯à¤‚ à¤•à¥‰à¤ªà¥€ à¤•à¤°à¥‡à¤‚à¥¤");
    }
  }

  function shareWhatsApp() {
    const text = `à¤¨à¤®à¤¸à¥à¤•à¤¾à¤°! Borewell Mitra MP à¤ªà¤° à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¥‡ à¤²à¤¿à¤ à¤‡à¤¸ à¤²à¤¿à¤‚à¤• à¤ªà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¥‡à¤‚:\n${getReferralLink()}`;
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
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤­à¥€ à¤œà¤°à¥‚à¤°à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤°à¥‡à¤‚");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¡à¤¾à¤²à¥‡à¤‚");
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
        throw new Error(result.message || "Booking à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤ˆ");
      }

      setMessage(
        `Booking à¤¸à¤«à¤² à¤¹à¥à¤ˆ! Booking ID: ${result.bookingCode || result.booking?.bookingCode || "à¤¬à¤¨ à¤—à¤ˆ"}`
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
      setMessage(err.message || "Booking à¤®à¥‡à¤‚ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤†à¤ˆ");
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

    if (value.includes("paid") || value.includes("à¤­à¥à¤—à¤¤à¤¾à¤¨")) {
      return <CheckCircle size={16} color="green" />;
    }

    if (value.includes("reject") || value.includes("à¤°à¤¦à¥à¤¦")) {
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
        <p>Referral Dashboard à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...</p>
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
                  <ArrowLeft size={15} /> à¤µà¤¾à¤ªà¤¸
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
            à¤¨à¤®à¤¸à¥à¤•à¤¾à¤°, {partner.name || user?.name || "Referral Partner"}
          </h3>
          <div>à¤†à¤ªà¤•à¤¾ Referral Business Dashboard</div>
        </header>

        {error && (
          <div style={{ ...styles.card, color: "#b91c1c", marginBottom: 15 }}>
            {error}
            <p>à¤•à¥ƒà¤ªà¤¯à¤¾ Backend Server à¤šà¤¾à¤²à¥‚ à¤¹à¥‹à¤¨à¥‡ à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¥‡à¤‚à¥¤</p>
          </div>
        )}

        {message && (
          <div style={{ ...styles.card, marginBottom: 15, color: "#075e35" }}>
            {message}
            <button
              style={{ ...styles.button, background: "#e5e7eb" }}
              onClick={() => setMessage("")}
            >
              à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚
            </button>
          </div>
        )}

        <section style={styles.card}>
          <h3><Users size={19} /> à¤†à¤ªà¤•à¥€ Referral à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€</h3>
          <p><b>à¤¨à¤¾à¤®:</b> {partner.name || user?.name || "â€”"}</p>
          <p><b>Referral ID:</b> {partner.userId || partner.user_id || partner.id || "â€”"}</p>
          <p><b>Referral Code:</b> {partner.referral_code || dashboard?.referralCode || "â€”"}</p>
          <p><b>à¤®à¥‹à¤¬à¤¾à¤‡à¤²:</b> {partner.mobile || user?.mobile || "â€”"}</p>

          <div style={{
            background: "#eef6ff",
            padding: 12,
            borderRadius: 9,
            overflowWrap: "anywhere"
          }}>
            <b><LinkIcon size={16} /> à¤†à¤ªà¤•à¤¾ Referral Link</b>
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
            <div>à¤•à¥à¤² Referral Bookings</div>
          </div>

          <div style={styles.card}>
            <IndianRupee color="#168b4b" />
            <h2>â‚¹{totalCommission}</h2>
            <div>à¤•à¥à¤² à¤•à¤®à¥€à¤¶à¤¨</div>
          </div>

          <div style={styles.card}>
            <CheckCircle color="#168b4b" />
            <h2>â‚¹{paidCommission}</h2>
            <div>à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾</div>
          </div>

          <div style={styles.card}>
            <Clock color="#d97706" />
            <h2>â‚¹{pendingCommission}</h2>
            <div>à¤²à¤‚à¤¬à¤¿à¤¤ à¤•à¤®à¥€à¤¶à¤¨</div>
          </div>
        </div>

        <section style={{ ...styles.card, marginBottom: 18 }}>
          <h3>Referral Commission à¤¨à¤¿à¤¯à¤®</h3>
          <p>
            à¤ªà¥à¤°à¤¤à¤¿ à¤¸à¤«à¤² à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤®à¥€à¤¶à¤¨: <b>â‚¹{settings?.commission ?? settings?.commission_amount ?? 200}</b>
          </p>
          <p>
            à¤•à¤®à¥€à¤¶à¤¨ à¤¤à¤­à¥€ à¤®à¤¿à¤²à¥‡à¤—à¤¾ à¤œà¤¬ à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤•à¤¾ à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾ à¤¹à¥‹ à¤œà¤¾à¤ à¤”à¤° Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤œà¤¾à¤à¥¤
          </p>
        </section>

        <div style={{ marginBottom: 15 }}>
          <button
            style={{ ...styles.button, background: "#0878bd", color: "white" }}
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle size={17} />
            {showForm ? "à¤«à¥‰à¤°à¥à¤® à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚" : "à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¥€ à¤¨à¤ˆ Booking à¤œà¥‹à¤¡à¤¼à¥‡à¤‚"}
          </button>
        </div>

        {showForm && (
          <section style={{ ...styles.card, marginBottom: 18 }}>
            <h3>à¤¨à¤ˆ Referral Booking</h3>

            <form onSubmit={submitBooking}>
              <label style={styles.label}>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤® *</label>
              <input
                style={styles.input}
                name="customerName"
                value={form.customerName}
                onChange={updateForm}
                placeholder="à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®"
                required
              />

              <label style={styles.label}>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>
              <input
                style={styles.input}
                name="mobile"
                value={form.mobile}
                onChange={updateForm}
                placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
                maxLength={10}
                required
              />

              <label style={styles.label}>à¤œà¤¿à¤²à¤¾ *</label>
              <input
                style={styles.input}
                name="district"
                value={form.district}
                onChange={updateForm}
                placeholder="à¤œà¤¿à¤²à¤¾"
                required
              />

              <label style={styles.label}>à¤¤à¤¹à¤¸à¥€à¤²</label>
              <input
                style={styles.input}
                name="tehsil"
                value={form.tehsil}
                onChange={updateForm}
                placeholder="à¤¤à¤¹à¤¸à¥€à¤²"
              />

              <label style={styles.label}>à¤¬à¥à¤²à¥‰à¤• *</label>
              <input
                style={styles.input}
                name="block"
                value={form.block}
                onChange={updateForm}
                placeholder="à¤¬à¥à¤²à¥‰à¤•"
                required
              />

              <label style={styles.label}>à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *</label>
              <textarea
                style={{ ...styles.input, minHeight: 85 }}
                name="address"
                value={form.address}
                onChange={updateForm}
                placeholder="à¤—à¥à¤°à¤¾à¤®, à¤ªà¥‹à¤¸à¥à¤Ÿ, à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡ à¤¸à¤¹à¤¿à¤¤ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾"
                required
              />

              <label style={styles.label}>à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚</label>
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
                {saving ? "Booking à¤­à¥‡à¤œà¥€ à¤œà¤¾ à¤°à¤¹à¥€ à¤¹à¥ˆ..." : "Booking Submit à¤•à¤°à¥‡à¤‚"}
              </button>
            </form>
          </section>
        )}

        <section style={{ ...styles.card, marginBottom: 18 }}>
          <h3><ClipboardList size={19} /> à¤†à¤ªà¤•à¥€ Referral Bookings</h3>

          {bookings.length === 0 ? (
            <p>à¤…à¤­à¥€ à¤•à¥‹à¤ˆ Referral Booking à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#eef3f8", textAlign: "left" }}>
                    <th style={{ padding: 10 }}>Booking ID</th>
                    <th style={{ padding: 10 }}>à¤—à¥à¤°à¤¾à¤¹à¤•</th>
                    <th style={{ padding: 10 }}>à¤®à¥‹à¤¬à¤¾à¤‡à¤²</th>
                    <th style={{ padding: 10 }}>à¤¸à¥‡à¤µà¤¾</th>
                    <th style={{ padding: 10 }}>à¤¸à¥à¤¥à¤¿à¤¤à¤¿</th>
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
          <h3><IndianRupee size={19} /> à¤•à¤®à¥€à¤¶à¤¨ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€</h3>

          {commissions.length === 0 ? (
            <p>à¤…à¤­à¥€ à¤•à¥‹à¤ˆ à¤•à¤®à¥€à¤¶à¤¨ à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p>
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
                <b>â‚¹{item.amount || 0}</b>
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
