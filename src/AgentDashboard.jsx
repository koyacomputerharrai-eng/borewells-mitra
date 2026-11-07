
import React, { useEffect, useState } from "react";
import {
  RefreshCw, CheckCircle, XCircle, Clock,
  MapPin, LogOut, Play, CheckCheck,
  UserRound, Building2, Phone, Save, Edit3,
  ShieldCheck, AlertCircle
} from "lucide-react";

const API = "http://localhost:4000/api";

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
      `API Error: ${response.url} | Status: ${response.status} | JSON नहीं मिला।`
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

      // Backend Raw Array या Object दोनों स्वीकार करें
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
      setProfileMessage("आपकी पिछली Request अभी Pending है।");
      return;
    }

    if (!profile.name.trim()) {
      setProfileMessage("एजेंट का नाम भरें।");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(profile.mobile)) {
      setProfileMessage("सही 10 अंकों का मोबाइल नंबर भरें।");
      return;
    }

    if (!profile.agency_name.trim()) {
      setProfileMessage("एजेंसी का नाम भरें।");
      return;
    }

    if (!profile.office_address.trim()) {
      setProfileMessage("ऑफिस का पता भरें।");
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

      // पुरानी Profile ही दिखाई जाएगी, जब तक Admin Approve न करे
      await loadProfile();
      await loadProfileRequest();

      setProfileMessage(
        data.message ||
        "आपकी Profile Update Request Admin को भेज दी गई है।"
      );
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function bookingAction(id, action) {
    const labels = {
      accept: "बुकिंग स्वीकार",
      reject: "बुकिंग Reject",
      start: "काम शुरू",
      complete: "काम पूर्ण"
    };

    if (!window.confirm(`${labels[action]} करना चाहते हैं?`)) return;

    try {
      let url = `${API}/agent/bookings/${id}`;
      let body = { action };

      if (action === "start" || action === "complete") {
        url += "/work-status";
        body = {
          status: action === "start" ? "कार्य प्रगति पर" : "पूर्ण"
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

      setMessage(data.message || "अपडेट सफल।");
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
    if (!dueAt) return "समय सीमा उपलब्ध नहीं";

    const remaining = new Date(dueAt).getTime() - Date.now();

    if (remaining <= 0) return "समय समाप्त";

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    return `${hours} घंटे ${minutes} मिनट शेष`;
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
          <h2>नमस्ते, {profile.name || "Agent"} जी</h2>
          <p>
            Agent ID: {profile.userId || "—"} |
            {profile.district || "—"} / {profile.block || "—"}
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
              {" "}मेरी प्रोफाइल
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
            <p>Request Status लोड हो रहा है...</p>
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
                आपकी Profile बदलने की Request भेज दी गई है।
                Admin की मंजूरी मिलने तक पुरानी जानकारी ही लागू रहेगी।
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
              {" "}आपकी पिछली Profile Request Approve हो गई है।
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
              {" "}आपकी पिछली Request Reject हुई है।
              {profileRequest.admin_note && (
                <p>Admin का संदेश: {profileRequest.admin_note}</p>
              )}
            </div>
          ) : null}

          {profileLoading ? (
            <p>प्रोफाइल लोड हो रही है...</p>
          ) : (
            <form onSubmit={saveProfile}>
              <label style={fieldStyle}>
                <Building2 size={16} style={{ verticalAlign: "middle" }} />
                {" "}एजेंसी का नाम
                <input
                  style={inputStyle}
                  name="agency_name"
                  value={profile.agency_name}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="अपनी एजेंसी का नाम लिखें"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <UserRound size={16} style={{ verticalAlign: "middle" }} />
                {" "}एजेंट का नाम
                <input
                  style={inputStyle}
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="एजेंट का पूरा नाम"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <Phone size={16} style={{ verticalAlign: "middle" }} />
                {" "}मोबाइल नंबर
                <input
                  style={inputStyle}
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={profile.mobile}
                  onChange={handleProfileChange}
                  disabled={!editingProfile || pending}
                  placeholder="10 अंकों का मोबाइल नंबर"
                  required
                />
              </label>

              <label style={fieldStyle}>
                <MapPin size={16} style={{ verticalAlign: "middle" }} />
                {" "}ऑफिस का पता
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
                  placeholder="एजेंसी / ऑफिस का पूरा पता"
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
                    जिला (Admin द्वारा निर्धारित)
                  </label>
                  <input
                    style={inputStyle}
                    value={profile.district}
                    disabled
                  />
                </div>

                <div>
                  <label style={fieldStyle}>
                    ब्लॉक (Admin द्वारा निर्धारित)
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
                    background: profileMessage.includes("भेज दी गई")
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: profileMessage.includes("भेज दी गई")
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
                      ? "Request भेजी जा रही है..."
                      : "Approval के लिए भेजें"}
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
          <h2>मेरी नियुक्त बुकिंग</h2>
          <button className="btn btn-light" onClick={loadBookings}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>

        {message && <p className="form-message">{message}</p>}

        {loading ? (
          <p>बुकिंग लोड हो रही हैं...</p>
        ) : bookings.length === 0 ? (
          <p>अभी आपके लिए कोई बुकिंग नियुक्त नहीं है।</p>
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
                <p>मोबाइल: {booking.mobile}</p>
                <p>
                  <MapPin size={15} />
                  {booking.district} / {booking.block} / {booking.village}
                </p>
                <p>सेवा: {booking.service}</p>

                {booking.status === "एजेंट नियुक्त" && (
                  <p className="agent-deadline">
                    <Clock size={16} />
                    {remainingTime(booking.assignment_due_at)}
                  </p>
                )}

                <div className="agent-booking-actions">
                  {booking.status === "एजेंट नियुक्त" && (
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

                  {booking.status === "एजेंट द्वारा स्वीकार" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => bookingAction(booking.id, "start")}
                    >
                      <Play size={17} /> काम शुरू करें
                    </button>
                  )}

                  {booking.status === "कार्य प्रगति पर" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => bookingAction(booking.id, "complete")}
                    >
                      <CheckCheck size={17} /> काम पूर्ण करें
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
