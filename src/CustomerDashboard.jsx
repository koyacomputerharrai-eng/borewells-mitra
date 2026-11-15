
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

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

const SUPPORT_PHONE = "919183863725";

function getBlocksForDistrict(district) {
  const list = BLOCKS?.[district];
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return Object.keys(list);
  return [];
}

function formatDate(value) {
  if (!value) return "à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("hi-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getStatusClass(status = "") {
  const value = String(status).toLowerCase();
  if (value.includes("à¤ªà¥‚à¤°à¥à¤£") || value.includes("complete")) return "success";
  if (value.includes("à¤°à¤¦à¥à¤¦") || value.includes("cancel")) return "danger";
  if (value.includes("à¤ªà¥à¤°à¤—à¤¤à¤¿") || value.includes("progress")) return "info";
  if (value.includes("à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤") || value.includes("assign")) return "purple";
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
    DISTRICTS?.find(x => x === "à¤›à¤¿à¤‚à¤¦à¤µà¤¾à¤¡à¤¼à¤¾") ||
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
        throw new Error(result?.message || "à¤¬à¥à¤•à¤¿à¤‚à¤— à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
      }

      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result?.bookings)
          ? result.bookings
          : [];

      setBookings(rows);
    } catch (err) {
      setError(err.message || "à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾à¥¤");
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
      setPhotoMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¹à¥€ à¤«à¥‹à¤Ÿà¥‹ à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage("à¤«à¥‹à¤Ÿà¥‹ 5 MB à¤¸à¥‡ à¤•à¤® à¤¹à¥‹à¤¨à¥€ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result);
      setPhotoMessage("à¤«à¥‹à¤Ÿà¥‹ à¤•à¤¾ Preview à¤¬à¤¦à¤² à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤ à¤¯à¤¹ à¤…à¤­à¥€ à¤¸à¤°à¥à¤µà¤° à¤ªà¤° à¤¸à¥‡à¤µ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤");
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

  const customerName = user?.name || "à¤—à¥à¤°à¤¾à¤¹à¤•";
  const customerId = user?.userId || user?.id || "à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚";

  const navItems = [
    ["profile", "à¤®à¥‡à¤°à¤¾ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤²"],
    ["bookings", "à¤®à¥‡à¤°à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤—"],
    ["agents", "à¤à¤œà¥‡à¤‚à¤Ÿ à¤¡à¤¿à¤Ÿà¥‡à¤²à¥à¤¸"],
    ["rates", "à¤à¤°à¤¿à¤¯à¤¾ à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ"],
    ["support", "à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾"]
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

        <div className="sidebar-label">à¤®à¥‡à¤¨à¥à¤¯à¥‚</div>
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
            <strong>à¤®à¤¦à¤¦ à¤šà¤¾à¤¹à¤¿à¤?</strong>
            <span>à¤¹à¤®à¤¾à¤°à¥€ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ à¤Ÿà¥€à¤® à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚à¥¤</span>
            <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" rel="noreferrer">
              WhatsApp à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾
            </a>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} /> à¤²à¥‰à¤—à¤†à¤‰à¤Ÿ
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
            <h1>à¤¨à¤®à¤¸à¥à¤¤à¥‡, {customerName}!</h1>
            <p>à¤†à¤ªà¤•à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤”à¤° à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤à¤• à¤¹à¥€ à¤œà¤—à¤¹à¥¤</p>
          </div>
          <button
            className="topbar-refresh"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
          >
            <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            <span>{refreshing ? "à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ" : "à¤°à¤¿à¤«à¥à¤°à¥‡à¤¶"}</span>
          </button>
        </header>

        <section className="customer-stat-grid">
          <div className="customer-stat-card">
            <div className="stat-icon blue"><ClipboardList size={22} /></div>
            <div><span>à¤•à¥à¤² à¤¬à¥à¤•à¤¿à¤‚à¤—</span><strong>{bookings.length}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon gold"><Activity size={22} /></div>
            <div><span>à¤šà¤¾à¤²à¥‚ à¤¬à¥à¤•à¤¿à¤‚à¤—</span><strong>{activeCount}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div><span>à¤ªà¥‚à¤°à¥à¤£ à¤¬à¥à¤•à¤¿à¤‚à¤—</span><strong>{completedCount}</strong></div>
          </div>
          <div className="customer-stat-card">
            <div className="stat-icon purple"><Users size={22} /></div>
            <div><span>à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ</span><strong>{uniqueAgents.length}</strong></div>
          </div>
        </section>

        <section className="customer-panel" id="profile">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">ACCOUNT</span>
              <h2><UserRound size={21} /> à¤®à¥‡à¤°à¤¾ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤²</h2>
              <p>à¤†à¤ªà¤•à¥€ à¤—à¥à¤°à¤¾à¤¹à¤• à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€</p>
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
                <Camera size={16} /> à¤«à¥‹à¤Ÿà¥‹ à¤šà¥à¤¨à¥‡à¤‚
              </label>
              <input
                id="customer-profile-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                hidden
              />
              <small>à¤…à¤§à¤¿à¤•à¤¤à¤® 5 MB Â· à¤•à¥‡à¤µà¤² Preview</small>
              {photoMessage && <small className="photo-message">{photoMessage}</small>}
            </div>

            <div className="profile-details-grid">
              <div className="info-tile">
                <span>à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®</span><strong>{customerName}</strong>
              </div>
              <div className="info-tile">
                <span>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°</span><strong>{user?.mobile || "à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}</strong>
              </div>
              <div className="info-tile">
                <span>Customer ID</span><strong>{customerId}</strong>
              </div>
              <div className="info-tile">
                <span>à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨ à¤œà¤¿à¤²à¤¾</span><strong>{user?.district || "à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}</strong>
              </div>
            </div>
          </div>

          <div className="profile-location">
            <div className="location-title">
              <MapPinned size={19} />
              <div><strong>à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤šà¥à¤¨à¥‡à¤‚</strong><span>à¤¯à¤¹ à¤šà¤¯à¤¨ à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ à¤¦à¤¿à¤–à¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¹à¥ˆà¥¤</span></div>
            </div>
            <div className="location-selects">
              <label>à¤œà¤¿à¤²à¤¾
                <select value={district} onChange={e => setDistrict(e.target.value)}>
                  {(DISTRICTS || []).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label>à¤¬à¥à¤²à¥‰à¤•
                <select value={block} onChange={e => setBlock(e.target.value)} disabled={!blocks.length}>
                  {blocks.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            </div>
            <p className="readonly-note">à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤®à¥‡à¤‚ à¤¸à¥à¤¥à¤¾à¤¯à¥€ à¤¬à¤¦à¤²à¤¾à¤µ à¤•à¥‡ à¤²à¤¿à¤ Backend à¤®à¥‡à¤‚ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¸à¥à¤µà¤¿à¤§à¤¾ à¤œà¥‹à¤¡à¤¼à¤¨à¥€ à¤¹à¥‹à¤—à¥€à¥¤</p>
          </div>
        </section>

        <section className="customer-panel" id="bookings">
          <div className="panel-heading panel-heading-row">
            <div>
              <span className="panel-kicker">BOOKING ACTIVITY</span>
              <h2><ClipboardList size={21} /> à¤®à¥‡à¤°à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤¾ à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸</h2>
              <p>à¤†à¤ªà¤•à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¥€ à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤¸à¥à¤¥à¤¿à¤¤à¤¿</p>
            </div>
            <button className="small-action-button" onClick={() => loadBookings(true)} disabled={refreshing}>
              <RefreshCw size={16} /> à¤°à¤¿à¤«à¥à¤°à¥‡à¤¶
            </button>
          </div>

          {loading && <div className="empty-state"><RefreshCw className="spin" size={28} /><p>à¤¬à¥à¤•à¤¿à¤‚à¤— à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</p></div>}
          {error && <div className="error-message">{error}</div>}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <ClipboardList size={38} />
              <strong>à¤…à¤­à¥€ à¤•à¥‹à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€</strong>
              <p>à¤†à¤ªà¤•à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¯à¤¹à¤¾à¤ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤—à¥€à¥¤</p>
            </div>
          )}

          {!loading && bookings.map(booking => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-top">
                <div>
                  <span className="booking-label">BOOKING ID</span>
                  <h3>{booking.bookingCode || `à¤¬à¥à¤•à¤¿à¤‚à¤— #${booking.id}`}</h3>
                </div>
                <span className={`booking-status ${getStatusClass(booking.status)}`}>
                  {booking.status || "à¤¨à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤—"}
                </span>
              </div>
              <div className="booking-details-grid">
                <div><span>à¤¸à¥‡à¤µà¤¾</span><strong>{booking.service || "â€”"}</strong></div>
                <div><span>à¤œà¤¿à¤²à¤¾ / à¤¬à¥à¤²à¥‰à¤•</span><strong>{booking.district || "â€”"} / {booking.block || "â€”"}</strong></div>
                <div><span>à¤—à¤¾à¤à¤µ / à¤¶à¤¹à¤°</span><strong>{booking.village || "â€”"}</strong></div>
                <div><span><CalendarDays size={14} /> à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¤à¤¾à¤°à¥€à¤–</span><strong>{formatDate(booking.created_at)}</strong></div>
                <div><span><IndianRupee size={14} /> à¤¬à¥à¤•à¤¿à¤‚à¤— à¤°à¥‡à¤Ÿ</span><strong>{booking.rate_at_booking != null ? `â‚¹${booking.rate_at_booking} ${booking.rate_unit || ""}` : "à¤°à¥‡à¤Ÿ à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}</strong></div>
                <div>
                  <span>à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨</span>
                  <strong className={booking.payment_verified ? "text-green" : "text-amber"}>
                    {booking.payment_verified ? "à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤" : "à¤…à¤­à¥€ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¨à¤¹à¥€à¤‚"}
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
              <h2><Users size={21} /> à¤à¤œà¥‡à¤‚à¤Ÿ à¤¡à¤¿à¤Ÿà¥‡à¤²à¥à¤¸</h2>
              <p>à¤†à¤ªà¤•à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¥‡ à¤²à¤¿à¤ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ</p>
            </div>
          </div>

          {uniqueAgents.length === 0 ? (
            <div className="empty-state">
              <UserRound size={38} />
              <strong>à¤…à¤­à¥€ à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤† à¤¹à¥ˆ</strong>
              <p>à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° à¤‰à¤¸à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¯à¤¹à¤¾à¤ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤—à¥€à¥¤</p>
            </div>
          ) : (
            <div className="agent-grid">
              {uniqueAgents.map(agent => {
                const phone = String(agent.agent_mobile).replace(/\D/g, "").slice(-10);
                return (
                  <div className="agent-card" key={agent.agent_mobile}>
                    <div className="agent-avatar"><UserRound size={25} /></div>
                    <div className="agent-information">
                      <span>à¤†à¤ªà¤•à¤¾ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ</span>
                      <h3>{agent.agent_name || "à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ"}</h3>
                      <p>{agent.agency_name || "à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾ à¤à¤œà¥‡à¤‚à¤Ÿ"}</p>
                      <strong><Phone size={15} /> {agent.agent_mobile}</strong>
                    </div>
                    <div className="agent-actions">
                      <a href={`tel:${phone}`}><Phone size={16} /> à¤•à¥‰à¤²</a>
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
              <h2><MapPin size={21} /> à¤à¤°à¤¿à¤¯à¤¾ à¤µà¤¾à¤‡à¤œ à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ</h2>
              <p>{district || "à¤œà¤¿à¤²à¤¾"} Â· {block || "à¤¬à¥à¤²à¥‰à¤•"}</p>
            </div>
          </div>
          <CustomerAreaRates district={district} block={block} />
        </section>

        <section className="customer-support-panel" id="support">
          <div className="support-icon"><Headset size={28} /></div>
          <div className="support-copy">
            <span>à¤¹à¤® à¤†à¤ªà¤•à¥€ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ à¤•à¥‡ à¤²à¤¿à¤ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¹à¥ˆà¤‚</span>
            <h2>à¤•à¤¿à¤¸à¥€ à¤­à¥€ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤®à¥‡à¤‚ à¤¹à¤®à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚</h2>
            <p>à¤¬à¥à¤•à¤¿à¤‚à¤—, à¤à¤œà¥‡à¤‚à¤Ÿ à¤¯à¤¾ à¤…à¤¨à¥à¤¯ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾ à¤Ÿà¥€à¤® à¤¸à¥‡ à¤¬à¤¾à¤¤ à¤•à¤°à¥‡à¤‚à¥¤</p>
          </div>
          <div className="support-actions">
            <a href={`tel:+${SUPPORT_PHONE}`}><Phone size={17} /> à¤•à¥‰à¤² à¤•à¤°à¥‡à¤‚</a>
            <a href={`https://wa.me/${SUPPORT_PHONE}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} /> WhatsApp
            </a>
          </div>
        </section>

        <footer className="customer-footer">
          <span>Â© Borewells Mitra</span>
          <span>Customer Portal</span>
        </footer>
      </main>
    </div>
  );
}
