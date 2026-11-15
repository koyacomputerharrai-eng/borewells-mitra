
import React, { useEffect, useMemo, useState } from "react";
import CustomerAreaRates from "./CustomerAreaRates.jsx";
import { DISTRICTS, BLOCKS } from "./areas.js";
import {
  UserRound, Phone, MessageCircle, MapPin, CalendarDays,
  RefreshCw, LogOut, Droplets, IndianRupee, ClipboardList,
  Camera, CheckCircle, Clock, Headset, Users, Menu, X,
  Activity, ChevronRight, MapPinned
} from "lucide-react";
import "./CustomerDashboard.css";

const API = window.location.hostname === "localhost"
  ? "http://localhost:4000/api"
  : "https://borewells-mitra-api.onrender.com/api";

const SUPPORT_PHONE = "919183863725";

function getBlocksForDistrict(district) {
  const list = BLOCKS?.[district];
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return Object.keys(list);
  return [];
}

function formatDate(value) {
  if (!value) return "उपलब्ध नहीं";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("hi-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getStatusClass(status = "") {
  const value = String(status).toLowerCase();
  if (value.includes("पूर्ण") || value.includes("complete")) return "success";
  if (value.includes("रद्द") || value.includes("cancel")) return "danger";
  if (value.includes("प्रगति") || value.includes("progress")) return "info";
  if (value.includes("नियुक्त") || value.includes("assign")) return "purple";
  return "pending";
}

export default function CustomerDashboard({ user, onLogout }) {
  const token = user?.token ||
    localStorage.getItem("bmm-token") ||
    localStorage.getItem("token") || "";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(
    user?.photo || user?.profile_photo || ""
  );
  const [photoMessage, setPhotoMessage] = useState("");
  const [district, setDistrict] = useState(
    user?.district ||
    DISTRICTS?.find(x => x === "छिंदवाड़ा") ||
    DISTRICTS?.[0] || ""
  );
  const [block, setBlock] = useState(user?.block || "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const blocks = useMemo(
    () => getBlocksForDistrict(district),
    [district]
  );

  useEffect(() => {
    if (!blocks.includes(block)) setBlock(blocks[0] || "");
  }, [district, blocks, block]);

  async function loadBookings(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/customer/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "बुकिंग जानकारी नहीं मिली।");
      }

      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result?.bookings)
          ? result.bookings
          : [];

      setBookings(rows);
    } catch (err) {
      setError(err.message || "सर्वर से संपर्क नहीं हो सका।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoMessage("कृपया सही फोटो चुनें।");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage("फोटो 5 MB से कम होनी चाहिए।");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result);
      setPhotoMessage("फोटो का Preview बदल गया है। यह अभी सर्वर पर सेव नहीं है।");
    };
    reader.readAsDataURL(file);
  }

  const uniqueAgents = useMemo(() => {
    const agents = bookings.filter(item => item.agent_mobile);
    return agents.filter((agent, index, self) =>
      index === self.findIndex(item => item.agent_mobile === agent.agent_mobile)
    );
  }, [bookings]);

  const completedCount = bookings.filter(
    item => getStatusClass(item.status) === "success"
  ).length;

  const activeCount = bookings.filter(
    item => !["success", "danger"].includes(getStatusClass(item.status))
  ).length;

  const customerName = user?.name || "ग्राहक";
  const customerId = user?.userId || user?.id || "उपलब्ध नहीं";

  const navItems = [
    ["profile", "मेरा प्रोफाइल"],
    ["bookings", "मेरी बुकिंग"],
    ["agents", "एजेंट डिटेल्स"],
    ["rates", "एरिया रेट लिस्ट"],
    ["support", "सहायता"]
  ];

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="customer-dashboard">
      <aside className={`customer-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="customer-brand">
          <div className="customer-brand-icon"><Droplets size={25} /></div>
          <div>
            <strong>Borewells Mitra</strong>
            <span>Customer Portal</span>
          </div>
          <button className="mobile-close" onClick={closeMenu} aria-label="Close menu">
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {profilePhoto
              ? <img src={profilePhoto} alt="Profile" />
              : <UserRound size={25} />}
          </div>
          <div className="sidebar-user-info">
            <strong>{customerName}</strong>
            <span>Customer ID: {customerId}</span>
          </div>
        </div>

        <div className="sidebar-label">मेन्यू</div>
        <nav className="customer-nav">
          {navItems.map(([id, label]) => (
            <a href={`#${id}`} key={id} onClick={closeMenu}>
              <ChevronRight size={17} />
              {label}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <Headset size={22} />
            <strong>मदद चाहिए?</strong>
            <span>हमारी सहायता टीम से संपर्क करें।</span>
            <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" rel="noreferrer">
              WhatsApp सहायता
            </a>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} /> लॉगआउट
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button className="sidebar-overlay" onClick={closeMenu} aria-label="Close menu" />
      )}

      <main className="customer-main">
        <header className="customer-topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <span className="topbar-eyebrow">CUSTOMER DASHBOARD</span>
            <h1>नमस्ते, {customerName}!</h1>
            <p>आपकी बुकिंग और सेवाओं की जानकारी एक ही जगह।</p>
          </div>
          <button
            className="topbar-refresh"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
          >
            <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "लोड हो रहा है" : "रिफ्रेश"}</span>
          </button>
        </header>

        <section className="customer-stat-grid">
          <div className="customer-stat-card">
            <div className="stat-icon blue"><ClipboardList size={22} /></div>
            <div><span>कुल बुकिंग</span><strong>{bookings.length}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon gold"><Activity size={22} /></div>
            <div><span>चालू बुकिंग</span><strong>{activeCount}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div><span>पूर्ण बुकिंग</span><strong>{completedCount}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon purple"><Users size={22} /></div>
            <div><span>नियुक्त एजेंट</span><strong>{uniqueAgents.length}</strong></div>
          </div>
        </section>

        <section className="customer-panel" id="profile">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">ACCOUNT</span>
              <h2><UserRound size={21} /> मेरा प्रोफाइल</h2>
              <p>आपकी ग्राहक जानकारी</p>
            </div>
          </div>

          <div className="profile-layout">
            <div className="profile-photo-area">
              <div className="profile-photo">
                {profilePhoto
                  ? <img src={profilePhoto} alt="Customer profile" />
                  : <UserRound size={48} />}
              </div>
              <label className="photo-upload-button" htmlFor="customer-profile-photo">
                <Camera size={16} /> फोटो चुनें
              </label>
              <input
                id="customer-profile-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                hidden
              />
              <small>अधिकतम 5 MB · केवल Preview</small>
              {photoMessage && <small className="photo-message">{photoMessage}</small>}
            </div>

            <div className="profile-details-grid">
              <div className="info-tile">
                <span>पूरा नाम</span><strong>{customerName}</strong>
              </div>
              <div className="info-tile">
                <span>मोबाइल नंबर</span><strong>{user?.mobile || "उपलब्ध नहीं"}</strong>
              </div>
              <div className="info-tile">
                <span>Customer ID</span><strong>{customerId}</strong>
              </div>
              <div className="info-tile">
                <span>रजिस्ट्रेशन जिला</span><strong>{user?.district || "उपलब्ध नहीं"}</strong>
              </div>
            </div>
          </div>

          <div className="profile-location">
            <div className="location-title">
              <MapPinned size={19} />
              <div><strong>रेट लिस्ट के लिए क्षेत्र चुनें</strong><span>यह चयन रेट लिस्ट दिखाने के लिए है।</span></div>
            </div>
            <div className="location-selects">
              <label>जिला
                <select value={district} onChange={e => setDistrict(e.target.value)}>
                  {(DISTRICTS || []).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label>ब्लॉक
                <select value={block} onChange={e => setBlock(e.target.value)} disabled={!blocks.length}>
                  {blocks.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            </div>
            <p className="readonly-note">प्रोफाइल में स्थायी बदलाव के लिए Backend में प्रोफाइल अपडेट सुविधा जोड़नी होगी।</p>
          </div>
        </section>

        <section className="customer-panel" id="bookings">
          <div className="panel-heading panel-heading-row">
            <div>
              <span className="panel-kicker">BOOKING ACTIVITY</span>
              <h2><ClipboardList size={21} /> मेरी बुकिंग का स्टेटस</h2>
              <p>आपकी बुकिंग की वर्तमान स्थिति</p>
            </div>
            <button className="small-action-button" onClick={() => loadBookings(true)} disabled={refreshing}>
              <RefreshCw size={16} /> रिफ्रेश
            </button>
          </div>

          {loading && <div className="empty-state"><RefreshCw className="spin" size={28} /><p>बुकिंग जानकारी लोड हो रही है...</p></div>}
          {error && <div className="error-message">{error}</div>}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <ClipboardList size={38} />
              <strong>अभी कोई बुकिंग नहीं मिली</strong>
              <p>आपकी बुकिंग यहाँ दिखाई देगी।</p>
            </div>
          )}

          {!loading && bookings.map(booking => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-top">
                <div>
                  <span className="booking-label">BOOKING ID</span>
                  <h3>{booking.bookingCode || `बुकिंग #${booking.id}`}</h3>
                </div>
                <span className={`booking-status ${getStatusClass(booking.status)}`}>
                  {booking.status || "नई बुकिंग"}
                </span>
              </div>
              <div className="booking-details-grid">
                <div><span>सेवा</span><strong>{booking.service || "—"}</strong></div>
                <div><span>जिला / ब्लॉक</span><strong>{booking.district || "—"} / {booking.block || "—"}</strong></div>
                <div><span>गाँव / शहर</span><strong>{booking.village || "—"}</strong></div>
                <div><span><CalendarDays size={14} /> बुकिंग तारीख</span><strong>{formatDate(booking.created_at)}</strong></div>
                <div><span><IndianRupee size={14} /> बुकिंग रेट</span><strong>{booking.rate_at_booking != null ? `₹${booking.rate_at_booking} ${booking.rate_unit || ""}` : "रेट अभी उपलब्ध नहीं"}</strong></div>
                <div>
                  <span>भुगतान सत्यापन</span>
                  <strong className={booking.payment_verified ? "text-green" : "text-amber"}>
                    {booking.payment_verified ? "सत्यापित" : "अभी सत्यापित नहीं"}
                  </strong>
                  {booking.payment_note && <small>{booking.payment_note}</small>}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="customer-panel" id="agents">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">YOUR SERVICE TEAM</span>
              <h2><Users size={21} /> एजेंट डिटेल्स</h2>
              <p>आपकी बुकिंग के लिए नियुक्त एजेंट</p>
            </div>
          </div>

          {uniqueAgents.length === 0 ? (
            <div className="empty-state">
              <UserRound size={38} />
              <strong>अभी एजेंट नियुक्त नहीं हुआ है</strong>
              <p>एजेंट नियुक्त होने पर उसकी जानकारी यहाँ दिखाई देगी।</p>
            </div>
          ) : (
            <div className="agent-grid">
              {uniqueAgents.map(agent => {
                const phone = String(agent.agent_mobile).replace(/\D/g, "").slice(-10);
                return (
                  <div className="agent-card" key={agent.agent_mobile}>
                    <div className="agent-avatar"><UserRound size={25} /></div>
                    <div className="agent-information">
                      <span>आपका नियुक्त एजेंट</span>
                      <h3>{agent.agent_name || "नियुक्त एजेंट"}</h3>
                      <p>{agent.agency_name || "बोरवेल सेवा एजेंट"}</p>
                      <strong><Phone size={15} /> {agent.agent_mobile}</strong>
                    </div>
                    <div className="agent-actions">
                      <a href={`tel:${phone}`}><Phone size={16} /> कॉल</a>
                      <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer">
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="customer-panel" id="rates">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">AREA-WISE PRICING</span>
              <h2><MapPin size={21} /> एरिया वाइज रेट लिस्ट</h2>
              <p>{district || "जिला"} · {block || "ब्लॉक"}</p>
            </div>
          </div>
          <CustomerAreaRates district={district} block={block} />
        </section>

        <section className="customer-support-panel" id="support">
          <div className="support-icon"><Headset size={28} /></div>
          <div className="support-copy">
            <span>हम आपकी सहायता के लिए उपलब्ध हैं</span>
            <h2>किसी भी समस्या में हमसे संपर्क करें</h2>
            <p>बुकिंग, एजेंट या अन्य जानकारी के लिए सहायता टीम से बात करें।</p>
          </div>
          <div className="support-actions">
            <a href={`tel:+${SUPPORT_PHONE}`}><Phone size={17} /> कॉल करें</a>
            <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} /> WhatsApp
            </a>
          </div>
        </section>

        <footer className="customer-footer">
          <span>© Borewells Mitra</span>
          <span>Customer Portal</span>
        </footer>
      </main>
    </div>
  );
}
