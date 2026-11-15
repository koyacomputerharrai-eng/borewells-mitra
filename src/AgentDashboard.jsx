
import React, { useEffect, useState } from "react";
import {
  RefreshCw, CheckCircle, XCircle, Clock,
  MapPin, LogOut, Play, CheckCheck,
  UserRound, Building2, Phone, Save, Edit3,
  ShieldCheck, AlertCircle
} from "lucide-react";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

export default function AgentDashboard({ user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState({
    name: user?.name || "",
    mobile: user?.mobile || "",
    agency_name: user?.agency_name || "",
    office_address: user?.office_address || "",
    district: user?.district || "",
    block: user?.block || "",
    userId: user?.userId || ""
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);

  const [profileRequest, setProfileRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(true);

  const token = localStorage.getItem("bmm-token");

  const headers = {
    Authorization: `Bearer ${token}`
  };

 async function readResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("API Error:", {
      URL: response.url,
      Status: response.status,
      ContentType: response.headers.get("content-type"),
      Response: text.slice(0, 500)
    });

    throw new Error(
      `API Error: ${response.url} | Status: ${response.status} | JSON à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤`
    );
  }
}

  async function loadBookings() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/agent/bookings`, {
        headers
      });

      const data = await readResponse(response);

      // Backend Raw Array à¤¯à¤¾ Object à¤¦à¥‹à¤¨à¥‹à¤‚ à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤•à¤°à¥‡à¤‚
      const list = Array.isArray(data)
        ? data
        : data.bookings || [];

      setBookings(list);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    setProfileLoading(true);
    setProfileMessage("");

    try {
      const response = await fetch(`${API}/agent/profile`, {
        headers
      });

      const data = await readResponse(response);
      const p = data.profile || data.user || data;

      setProfile({
        name: p.name || "",
        mobile: p.mobile || "",
        agency_name: p.agency_name || "",
        office_address: p.office_address || "",
        district: p.district || "",
        block: p.block || "",
        userId: p.userId || ""
      });
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadProfileRequest() {
    setRequestLoading(true);

    try {
      const response = await fetch(
        `${API}/agent/profile-request`,
        { headers }
      );

      const data = await readResponse(response);
      setProfileRequest(data.request || null);
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setRequestLoading(false);
    }
  }

  function handleProfileChange(e) {
    const { name, value } = e.target;

    setProfile((old) => ({
      ...old,
      [name]: value
    }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMessage("");

    if (profileRequest?.status === "pending") {
      setProfileMessage("à¤†à¤ªà¤•à¥€ à¤ªà¤¿à¤›à¤²à¥€ Request à¤…à¤­à¥€ Pending à¤¹à¥ˆà¥¤");
      return;
    }

    if (!profile.name.trim()) {
      setProfileMessage("à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¤¾ à¤¨à¤¾à¤® à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(profile.mobile)) {
      setProfileMessage("à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (!profile.agency_name.trim()) {
      setProfileMessage("à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (!profile.office_address.trim()) {
      setProfileMessage("à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¤¤à¤¾ à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    setProfileSaving(true);

    try {
      const response = await fetch(`${API}/agent/profile`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          mobile: profile.mobile.trim(),
          agency_name: profile.agency_name.trim(),
          office_address: profile.office_address.trim()
        })
      });

      const data = await readResponse(response);

      setEditingProfile(false);

      // à¤ªà¥à¤°à¤¾à¤¨à¥€ Profile à¤¹à¥€ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤œà¤¾à¤à¤—à¥€, à¤œà¤¬ à¤¤à¤• Admin Approve à¤¨ à¤•à¤°à¥‡
      await loadProfile();
      await loadProfileRequest();

      setProfileMessage(
        data.message ||
        "à¤†à¤ªà¤•à¥€ Profile Update Request Admin à¤•à¥‹ à¤­à¥‡à¤œ à¤¦à¥€ à¤—à¤ˆ à¤¹à¥ˆà¥¤"
      );
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function bookingAction(id, action) {
    const labels = {
      accept: "à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¥à¤µà¥€à¤•à¤¾à¤°",
      reject: "à¤¬à¥à¤•à¤¿à¤‚à¤— Reject",
      start: "à¤•à¤¾à¤® à¤¶à¥à¤°à¥‚",
      complete: "à¤•à¤¾à¤® à¤ªà¥‚à¤°à¥à¤£"
    };

    if (!window.confirm(`${labels[action]} à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?`)) return;

    try {
      let url = `${API}/agent/bookings/${id}`;
      let body = { action };

      if (action === "start" || action === "complete") {
        url += "/work-status";
        body = {
          status: action === "start" ? "à¤•à¤¾à¤°à¥à¤¯ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤ªà¤°" : "à¤ªà¥‚à¤°à¥à¤£"
        };
      }

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await readResponse(response);

      setMessage(data.message || "à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¸à¤«à¤²à¥¤");
      await loadBookings();
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadBookings();
    loadProfile();
    loadProfileRequest();
  }, []);

  function remainingTime(dueAt) {
    if (!dueAt) return "à¤¸à¤®à¤¯ à¤¸à¥€à¤®à¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚";

    const remaining = new Date(dueAt).getTime() - Date.now();

    if (remaining <= 0) return "à¤¸à¤®à¤¯ à¤¸à¤®à¤¾à¤ªà¥à¤¤";

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    return `${hours} à¤˜à¤‚à¤Ÿà¥‡ ${minutes} à¤®à¤¿à¤¨à¤Ÿ à¤¶à¥‡à¤·`;
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #d5dce5",
    borderRadius: "9px",
    fontSize: "15px",
    boxSizing: "border-box",
    marginTop: "6px"
  };

  const fieldStyle = {
    display: "block",
    marginBottom: "15px",
    fontWeight: "600",
    color: "#334155"
  };

  const pending = profileRequest?.status === "pending";

  return (
    <div className="agent-dashboard">
      <header className="agent-header">
        <div>
          <h2>Borewell Mitra MP</h2>
          <p>Agent Dashboard</p>
        </div>

        <button className="btn btn-light" onClick={onLogout}>
          <LogOut size={17} /> Logout
        </button>
      </header>

      <main className="agent-content">
        <section className="agent-welcome">
          <h2>à¤¨à¤®à¤¸à¥à¤¤à¥‡, {profile.name || "Agent"} à¤œà¥€</h2>
          <p>
            Agent ID: {profile.userId || "â€”"} |
            {profile.district || "â€”"} / {profile.block || "â€”"}
          </p>
        </section>

        {/* AGENT PROFILE */}
        <section
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "14px",
            marginBottom: "25px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 3px 12px rgba(0,0,0,0.04)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px"
            }}
          >
            <h2 style={{ margin: 0 }}>
              <UserRound size={21} style={{ verticalAlign: "middle" }} />
              {" "}à¤®à¥‡à¤°à¥€ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤²
            </h2>

            {!editingProfile && !pending && (
              <button
                className="btn btn-primary"
                disabled={profileLoading || requestLoading}
                onClick={() => {
                  setProfileMessage("");
                  setEditingProfile(true);
                }}
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            )}
          </div>

          {requestLoading ? (
            <p>Request Status à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...</p>
          ) : pending ? (
            <div
              style={{
                background: "#fff7ed",
                color: "#9a3412",
                border: "1px solid #fed7aa",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "18px"
              }}
            >
              <strong>
                <Clock size={18} style={{ verticalAlign: "middle" }} />
                {" "}Pending Admin Approval
              </strong>
              <p style={{ marginBottom: 0 }}>
                à¤†à¤ªà¤•à¥€ Profile à¤¬à¤¦à¤²à¤¨à¥‡ à¤•à¥€ Request à¤­à¥‡à¤œ à¤¦à¥€ à¤—à¤ˆ à¤¹à¥ˆà¥¤
                Admin à¤•à¥€ à¤®à¤‚à¤œà¥‚à¤°à¥€ à¤®à¤¿à¤²à¤¨à¥‡ à¤¤à¤• à¤ªà¥à¤°à¤¾à¤¨à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¹à¥€ à¤²à¤¾à¤—à¥‚ à¤°à¤¹à¥‡à¤—à¥€à¥¤
              </p>
              <small>Request ID: {profileRequest.id}</small>
            </div>
          ) : profileRequest?.status === "approved" ? (
            <div
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "12px",
                borderRadius: "9px",
                marginBottom: "15px"
              }}
            >
              <ShieldCheck size={18} style={{ verticalAlign: "middle" }} />
              {" "}à¤†à¤ªà¤•à¥€ à¤ªà¤¿à¤›à¤²à¥€ Profile Request Approve à¤¹à¥‹ à¤—à¤ˆ à¤¹à¥ˆà¥¤
            </div>
          ) : profileRequest?.status === "rejected" ? (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "12px",
                borderRadius: "9px",
                marginBottom: "15px"
              }}
            >
              <AlertCircle size={18} style={{ verticalAlign: "middle" }} />
              {" "}à¤†à¤ªà¤•à¥€ à¤ªà¤¿à¤›à¤²à¥€ Request Reject à¤¹à¥à¤ˆ à¤¹à¥ˆà¥¤
              {profileRequest.admin_note && (
                <p>Admin à¤•à¤¾ à¤¸à¤‚à¤¦à¥‡à¤¶: {profileRequest.admin_note}</p>
              )}
            </div>
          ) : null}

          {profileLoading ? (
            <p>à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</p>
          ) : (
            <form onSubmit={saveProfile}>
              <label style={fieldStyle}>
                <Building2 size={16} style={{ verticalAlign: "middle" }} />
                {" "}à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤®
                <input
                  style={inputStyle}
                  name="agency_name"
                  value={profile.agency_name}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="à¤…à¤ªà¤¨à¥€ à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <UserRound size={16} style={{ verticalAlign: "middle" }} />
                {" "}à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¤¾ à¤¨à¤¾à¤®
                <input
                  style={inputStyle}
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <Phone size={16} style={{ verticalAlign: "middle" }} />
                {" "}à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°
                <input
                  style={inputStyle}
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={profile.mobile}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <MapPin size={16} style={{ verticalAlign: "middle" }} />
                {" "}à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¤¤à¤¾
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "85px",
                    resize: "vertical"
                  }}
                  name="office_address"
                  value={profile.office_address}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="à¤à¤œà¥‡à¤‚à¤¸à¥€ / à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾"
                  required
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "18px"
                }}
              >
                <div>
                  <label style={fieldStyle}>
                    à¤œà¤¿à¤²à¤¾ (Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¨à¤¿à¤°à¥à¤§à¤¾à¤°à¤¿à¤¤)
                  </label>
                  <input
                    style={inputStyle}
                    value={profile.district}
                    disabled
                  />
                </div>

                <div>
                  <label style={fieldStyle}>
                    à¤¬à¥à¤²à¥‰à¤• (Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¨à¤¿à¤°à¥à¤§à¤¾à¤°à¤¿à¤¤)
                  </label>
                  <input
                    style={inputStyle}
                    value={profile.block}
                    disabled
                  />
                </div>
              </div>

              {profileMessage && (
                <p
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: profileMessage.includes("à¤­à¥‡à¤œ à¤¦à¥€ à¤—à¤ˆ")
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: profileMessage.includes("à¤­à¥‡à¤œ à¤¦à¥€ à¤—à¤ˆ")
                      ? "#166534"
                      : "#991b1b"
                  }}
                >
                  {profileMessage}
                </p>
              )}

              {editingProfile && !pending && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap"
                  }}
                >
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={profileSaving}
                  >
                    <Save size={17} />
                    {profileSaving
                      ? "Request à¤­à¥‡à¤œà¥€ à¤œà¤¾ à¤°à¤¹à¥€ à¤¹à¥ˆ..."
                      : "Approval à¤•à¥‡ à¤²à¤¿à¤ à¤­à¥‡à¤œà¥‡à¤‚"}
                  </button>

                  <button
                    className="btn btn-light"
                    type="button"
                    disabled={profileSaving}
                    onClick={() => {
                      setEditingProfile(false);
                      loadProfile();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          )}
        </section>

        {/* BOOKINGS */}
        <div className="agent-toolbar">
          <h2>à¤®à¥‡à¤°à¥€ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¬à¥à¤•à¤¿à¤‚à¤—</h2>
          <button className="btn btn-light" onClick={loadBookings}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>

        {message && <p className="form-message">{message}</p>}

        {loading ? (
          <p>à¤¬à¥à¤•à¤¿à¤‚à¤— à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆà¤‚...</p>
        ) : bookings.length === 0 ? (
          <p>à¤…à¤­à¥€ à¤†à¤ªà¤•à¥‡ à¤²à¤¿à¤ à¤•à¥‹à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p>
        ) : (
          <div className="agent-booking-grid">
            {bookings.map((booking) => (
              <article className="agent-booking-card" key={booking.id}>
                <div className="agent-booking-top">
                  <strong>
                    {booking.bookingCode ||
                      `KB${String(booking.id).padStart(6, "0")}`}
                  </strong>
                  <span>{booking.status}</span>
                </div>

                <h3>{booking.name}</h3>
                <p>à¤®à¥‹à¤¬à¤¾à¤‡à¤²: {booking.mobile}</p>
                <p>
                  <MapPin size={15} />
                  {booking.district} / {booking.block} / {booking.village}
                </p>
                <p>à¤¸à¥‡à¤µà¤¾: {booking.service}</p>

                {booking.status === "à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤" && (
                  <p className="agent-deadline">
                    <Clock size={16} />
                    {remainingTime(booking.assignment_due_at)}
                  </p>
                )}

                <div className="agent-booking-actions">
                  {booking.status === "à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤" && (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => bookingAction(booking.id, "accept")}
                      >
                        <CheckCircle size={17} /> Accept
                      </button>

                      <button
                        className="btn btn-light"
                        onClick={() => bookingAction(booking.id, "reject")}
                      >
                        <XCircle size={17} /> Reject
                      </button>
                    </>
                  )}

                  {booking.status === "à¤à¤œà¥‡à¤‚à¤Ÿ à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¸à¥à¤µà¥€à¤•à¤¾à¤°" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => bookingAction(booking.id, "start")}
                    >
                      <Play size={17} /> à¤•à¤¾à¤® à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚
                    </button>
                  )}

                  {booking.status === "à¤•à¤¾à¤°à¥à¤¯ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤ªà¤°" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => bookingAction(booking.id, "complete")}
                    >
                      <CheckCheck size={17} /> à¤•à¤¾à¤® à¤ªà¥‚à¤°à¥à¤£ à¤•à¤°à¥‡à¤‚
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
