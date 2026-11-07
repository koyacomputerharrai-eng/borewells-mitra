
import React, { useEffect, useMemo, useState } from "react";
import CustomerAreaRates from "./CustomerAreaRates.jsx";
import { DISTRICTS, BLOCKS } from "./areas.js";

import {
  UserRound,
  Phone,
  MessageCircle,
  MapPin,
  CalendarDays,
  RefreshCw,
  LogOut,
  Droplets,
  IndianRupee,
  ClipboardList,
  Camera,
  Upload,
  CheckCircle,
  Clock,
  Headset,
  Save,
  Users
} from "lucide-react";

const API = "http://localhost:4000/api";

function getBlocksForDistrict(district) {
  const list = BLOCKS?.[district];

  if (Array.isArray(list)) return list;

  if (list && typeof list === "object") {
    return Object.keys(list);
  }

  return [];
}

export default function CustomerDashboard({ user, onLogout }) {

  const token =
    user?.token ||
    localStorage.getItem("bmm-token") ||
    localStorage.getItem("token") ||
    "";

  // PROFILE
  const [profilePhoto, setProfilePhoto] = useState(
    user?.photo || user?.profile_photo || ""
  );

  const [district, setDistrict] = useState(
    user?.district ||
    (DISTRICTS || []).find(x => x === "छिंदवाड़ा") ||
    DISTRICTS?.[0] ||
    ""
  );

  const [block, setBlock] = useState(
    user?.block ||
    getBlocksForDistrict(
      user?.district ||
      (DISTRICTS || []).find(x => x === "छिंदवाड़ा") ||
      DISTRICTS?.[0] ||
      ""
    )[0] ||
    ""
  );

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // BOOKINGS
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const blocks = useMemo(
    () => getBlocksForDistrict(district),
    [district]
  );

  // District change
  useEffect(() => {
    if (!blocks.includes(block)) {
      setBlock(blocks[0] || "");
    }
  }, [district]);

  // LOAD BOOKINGS
  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/customer/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "बुकिंग जानकारी नहीं मिली।"
        );
      }

      setBookings(
        Array.isArray(result.bookings)
          ? result.bookings
          : []
      );

    } catch (err) {
      setError(
        err.message || "सर्वर से संपर्क नहीं हो सका।"
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  // PROFILE PHOTO PREVIEW
  function handlePhotoChange(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileMessage("कृपया सही फोटो चुनें।");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("फोटो 5 MB से कम होनी चाहिए।");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfilePhoto(reader.result);
      setProfileMessage(
        "फोटो चुनी गई है। प्रोफाइल सेव करें।"
      );
    };

    reader.readAsDataURL(file);
  }

  // SAVE PROFILE
  // इसके लिए backend में /customer/profile route बनाना होगा।
  async function saveProfile() {
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch(
        `${API}/customer/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            district,
            block,
            photo: profilePhoto
          })
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "प्रोफाइल सेव नहीं हो पाई।"
        );
      }

      setProfileMessage("प्रोफाइल सफलतापूर्वक सेव हो गई।");

    } catch (err) {
      setProfileMessage(
        err.message ||
        "प्रोफाइल सेव नहीं हो पाई। Backend API जाँचें।"
      );

    } finally {
      setSavingProfile(false);
    }
  }

  function formatDate(value) {
    if (!value) return "उपलब्ध नहीं";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("hi-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function statusColor(status) {
    if (status === "पूर्ण") return "#15803d";
    if (status === "रद्द") return "#dc2626";
    if (status === "कार्य प्रगति पर") return "#2563eb";
    if (status === "एजेंट नियुक्त") return "#7c3aed";
    return "#b45309";
  }

  // सभी बुकिंग से नियुक्त एजेंट की जानकारी
  const agents = bookings.filter(
    booking => booking.agent_mobile
  );

  const uniqueAgents = agents.filter(
    (agent, index, self) =>
      index === self.findIndex(
        item =>
          item.agent_mobile === agent.agent_mobile
      )
  );

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f3f7fb",
      padding: "20px",
      color: "#172b4d"
    },

    container: {
      maxWidth: "1100px",
      margin: "auto"
    },

    header: {
      background: "#063b70",
      color: "#fff",
      padding: "22px",
      borderRadius: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "15px"
    },

    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "14px",
      padding: "20px",
      marginTop: "18px",
      boxShadow: "0 4px 15px rgba(0,0,0,.04)"
    },

    button: {
      border: 0,
      borderRadius: "9px",
      padding: "10px 14px",
      cursor: "pointer",
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      textDecoration: "none"
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "12px",
      marginTop: "15px"
    },

    detail: {
      background: "#f8fafc",
      borderRadius: "10px",
      padding: "13px",
      minWidth: 0
    },

    input: {
      width: "100%",
      padding: "11px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      marginTop: "7px",
      boxSizing: "border-box",
      background: "#fff",
      fontSize: "15px"
    },

    label: {
      fontWeight: 700,
      fontSize: "14px"
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <Droplets size={30} />
              <h2 style={{ margin: 0 }}>
                Customer Dashboard
              </h2>
            </div>

            <p style={{ margin: "8px 0 0", opacity: .9 }}>
              Borewell Mitra MP – ग्राहक डैशबोर्ड
            </p>
          </div>

          <button
            style={{
              ...styles.button,
              background: "#fff",
              color: "#063b70"
            }}
            onClick={onLogout}
          >
            <LogOut size={17} />
            लॉगआउट
          </button>
        </header>

        {/* 1. MY PROFILE */}
        <section style={styles.card}>

          <h3 style={{ marginTop: 0 }}>
            <UserRound
              size={20}
              style={{ verticalAlign: "middle" }}
            />{" "}
            मेरा प्रोफाइल
          </h3>

          {/* PROFILE PHOTO */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            margin: "18px 0"
          }}>

            <div style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "#e7f1ff",
              border: "3px solid #dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}>

              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                <UserRound size={48} color="#0756a0" />
              )}

            </div>

            <div>
              <label
                htmlFor="customer-profile-photo"
                style={{
                  ...styles.button,
                  background: "#e7f1ff",
                  color: "#0756a0"
                }}
              >
                <Camera size={17} />
                फोटो बदलें
              </label>

              <input
                id="customer-profile-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />

              <p style={{
                fontSize: 12,
                color: "#64748b",
                marginTop: 8
              }}>
                अधिकतम फोटो साइज 5 MB
              </p>
            </div>

          </div>

          {/* CUSTOMER DETAILS */}
          <div style={styles.grid}>

            <div style={styles.detail}>
              <small>पूरा नाम</small>
              <h3 style={{ margin: "6px 0 0" }}>
                {user?.name || "उपलब्ध नहीं"}
              </h3>
            </div>

            <div style={styles.detail}>
              <small>मोबाइल नंबर</small>
              <h3 style={{ margin: "6px 0 0" }}>
                {user?.mobile || "उपलब्ध नहीं"}
              </h3>
            </div>

            <div style={styles.detail}>
              <small>Customer ID</small>
              <h3 style={{ margin: "6px 0 0" }}>
                {user?.userId || user?.id || "उपलब्ध नहीं"}
              </h3>
            </div>

          </div>

          {/* DISTRICT */}
          <div style={styles.grid}>

            <div>
              <label style={styles.label}>
                <MapPin size={15} /> जिला चुनें
              </label>

              <select
                style={styles.input}
                value={district}
                onChange={e => setDistrict(e.target.value)}
              >
                {DISTRICTS.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* BLOCK */}
            <div>
              <label style={styles.label}>
                <MapPin size={15} /> ब्लॉक चुनें
              </label>

              <select
                style={styles.input}
                value={block}
                onChange={e => setBlock(e.target.value)}
                disabled={!blocks.length}
              >
                {blocks.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            style={{
              ...styles.button,
              background: "#0756a0",
              color: "#fff",
              marginTop: 18,
              opacity: savingProfile ? .6 : 1
            }}
          >
            <Save size={17} />
            {savingProfile
              ? "सेव हो रहा है..."
              : "प्रोफाइल सेव करें"}
          </button>

          {profileMessage && (
            <p style={{
              marginTop: 12,
              fontWeight: 600,
              color: profileMessage.includes("सफल")
                ? "#15803d"
                : "#b45309"
            }}>
              {profileMessage}
            </p>
          )}

        </section>

        {/* 2. MY BOOKINGS */}
        <section style={styles.card}>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10
          }}>

            <h3 style={{ margin: 0 }}>
              <ClipboardList
                size={20}
                style={{ verticalAlign: "middle" }}
              />{" "}
              मेरी बुकिंग का स्टेटस
            </h3>

            <button
              style={{
                ...styles.button,
                background: "#e7f1ff",
                color: "#0756a0"
              }}
              onClick={loadBookings}
              disabled={loading}
            >
              <RefreshCw size={16} />
              रिफ्रेश
            </button>

          </div>

          {loading && (
            <p>बुकिंग जानकारी लोड हो रही है...</p>
          )}

          {error && (
            <p style={{ color: "#dc2626", marginTop: 15 }}>
              {error}
            </p>
          )}

          {!loading && !error && bookings.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "30px 10px",
              color: "#64748b"
            }}>
              <ClipboardList size={38} />
              <h3>अभी कोई बुकिंग नहीं मिली</h3>
              <p>आपकी बुकिंग यहाँ दिखाई देगी।</p>
            </div>
          )}

          {bookings.map(booking => (

            <article
              key={booking.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "13px",
                padding: "17px",
                marginTop: "16px"
              }}
            >

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10
              }}>

                <h3 style={{ margin: 0 }}>
                  {booking.bookingCode ||
                    `बुकिंग #${booking.id}`}
                </h3>

                <span style={{
                  background: `${statusColor(booking.status)}18`,
                  color: statusColor(booking.status),
                  padding: "7px 12px",
                  borderRadius: "30px",
                  fontWeight: 700,
                  fontSize: "13px"
                }}>
                  {booking.status || "नई बुकिंग"}
                </span>

              </div>

              <div style={styles.grid}>

                <div style={styles.detail}>
                  <small>सेवा</small>
                  <p style={{ marginBottom: 0 }}>
                    {booking.service || "—"}
                  </p>
                </div>

                <div style={styles.detail}>
                  <small>जिला / ब्लॉक</small>
                  <p style={{ marginBottom: 0 }}>
                    {booking.district || "—"} / {booking.block || "—"}
                  </p>
                </div>

                <div style={styles.detail}>
                  <small>गाँव / शहर</small>
                  <p style={{ marginBottom: 0 }}>
                    {booking.village || "—"}
                  </p>
                </div>

                <div style={styles.detail}>
                  <small>
                    <CalendarDays size={14} /> बुकिंग तारीख
                  </small>
                  <p style={{ marginBottom: 0 }}>
                    {formatDate(booking.created_at)}
                  </p>
                </div>

                <div style={styles.detail}>
                  <small>
                    <IndianRupee size={14} /> बुकिंग रेट
                  </small>
                  <p style={{ marginBottom: 0 }}>
                    {booking.rate_at_booking != null
                      ? `₹${booking.rate_at_booking} ${booking.rate_unit || ""}`
                      : "रेट अभी उपलब्ध नहीं"}
                  </p>
                </div>

                <div style={styles.detail}>
                  <small>भुगतान सत्यापन</small>
                  <p style={{
                    marginBottom: 0,
                    color: booking.payment_verified
                      ? "#15803d"
                      : "#b45309",
                    fontWeight: 700
                  }}>
                    {booking.payment_verified
                      ? "सत्यापित"
                      : "अभी सत्यापित नहीं"}
                  </p>

                  {booking.payment_note && (
                    <small>{booking.payment_note}</small>
                  )}
                </div>

              </div>

            </article>

          ))}

        </section>

        {/* 3. AGENT DETAILS */}
        <section style={styles.card}>

          <h3 style={{ marginTop: 0 }}>
            <Users
              size={20}
              style={{ verticalAlign: "middle" }}
            />{" "}
            एजेंट डिटेल्स
          </h3>

          {uniqueAgents.length === 0 ? (

            <div style={{
              textAlign: "center",
              padding: "25px",
              color: "#64748b"
            }}>
              <UserRound size={38} />
              <p>
                अभी किसी बुकिंग के लिए एजेंट नियुक्त नहीं हुआ है।
              </p>
            </div>

          ) : (

            <div style={styles.grid}>

              {uniqueAgents.map(agent => (

                <div
                  key={agent.agent_mobile}
                  style={{
                    ...styles.detail,
                    border: "1px solid #dbeafe",
                    background: "#eef6ff"
                  }}
                >

                  <h4 style={{ marginTop: 0 }}>
                    {agent.agent_name || "नियुक्त एजेंट"}
                  </h4>

                  <p>
                    <Phone size={15} />{" "}
                    {agent.agent_mobile}
                  </p>

                  <div style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap"
                  }}>

                    <a
                      href={`tel:${agent.agent_mobile}`}
                      style={{
                        ...styles.button,
                        background: "#15803d",
                        color: "#fff"
                      }}
                    >
                      <Phone size={15} />
                      कॉल करें
                    </a>

                    <a
                      href={`https://wa.me/91${String(agent.agent_mobile).replace(/\D/g, "").slice(-10)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...styles.button,
                        background: "#16a34a",
                        color: "#fff"
                      }}
                    >
                      <MessageCircle size={15} />
                      WhatsApp
                    </a>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* 4. AREA WISE RATE LIST */}
        <section style={{ marginTop: 18 }}>
          <CustomerAreaRates
            district={district}
            block={block}
          />
        </section>

        {/* 5. SUPPORT */}
        <section style={{
          ...styles.card,
          background: "#063b70",
          color: "#fff"
        }}>

          <h3 style={{ marginTop: 0 }}>
            <Headset
              size={21}
              style={{ verticalAlign: "middle" }}
            />{" "}
            सहायता / Support
          </h3>

          <p>
            बुकिंग, एजेंट या अन्य समस्या के लिए हमसे संपर्क करें।
          </p>

          <div style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}>

            <a
              href="tel:+919343863725"
              style={{
                ...styles.button,
                background: "#fff",
                color: "#063b70"
              }}
            >
              <Phone size={17} />
              कॉल करें
            </a>

            <a
              href="https://wa.me/919343863725"
              target="_blank"
              rel="noreferrer"
              style={{
                ...styles.button,
                background: "#16a34a",
                color: "#fff"
              }}
            >
              <MessageCircle size={17} />
              WhatsApp
            </a>

          </div>

        </section>

      </div>
    </div>
  );
}
