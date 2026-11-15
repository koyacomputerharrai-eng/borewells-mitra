import React, { useCallback, useEffect, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";
import {
  LayoutDashboard, Users, BadgeCheck, IndianRupee, ClipboardList, Settings,
  LogOut, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Menu, X, ShieldCheck,
  Clock3, AlertCircle, Droplets, UserCheck, Handshake, Save, Search, Power, Trash2, RotateCcw,
  Eye, BarChart3, MonitorSmartphone, Activity, Image as ImageIcon, UploadCloud
} from "lucide-react";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";
const BOOKING_STATUSES = ["à¤¨à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤—", "à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤", "à¤•à¤¾à¤°à¥à¤¯ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤ªà¤°", "à¤ªà¥‚à¤°à¥à¤£", "à¤°à¤¦à¥à¤¦"];
const INITIAL_RATE = { district: "", tehsil: "", block: "", drilling: "", repairing: "", casingPipe: "", msPipe: "", otherServices: "" };
const INITIAL_AGENT = { name: "", agency_name: "", mobile: "", password: "", district: "", block: "", office_address: "" };
const getBlocksForDistrict = district => { const value = BLOCKS?.[district]; return Array.isArray(value) ? value : value && typeof value === "object" ? Object.keys(value) : []; };

async function apiRequest(path, options = {}, user = null) {
  const token = user?.token || localStorage.getItem("bmm-token") || localStorage.getItem("bm_token") || localStorage.getItem("token") || "";
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Server à¤¸à¥‡ à¤¸à¤¹à¥€ JSON à¤‰à¤¤à¥à¤¤à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤"); }
  if (!response.ok || data.success === false) throw new Error(`${data.message || `Request à¤…à¤¸à¤«à¤² (${response.status})`}${data.path ? ` â€” ${data.path}` : ""}`);
  return data;
}
const money = value => `â‚¹${Number(value || 0).toLocaleString("en-IN")}`;
const getError = error => error?.message || "à¤•à¥à¤› à¤—à¤²à¤¤ à¤¹à¥à¤†à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤";
const getUserId = person => person?.id ?? person?.user_id ?? person?.userId;
const getBookingId = booking => booking?.id ?? booking?.booking_id;
function formatDate(value) {
  if (!value) return "â€”";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function StatCard({ title, value, icon: Icon, color }) {
  return <div className="bmm-stat"><div className={`bmm-stat-icon ${color}`}><Icon size={23}/></div><div><p>{title}</p><h2>{value ?? 0}</h2></div></div>;
}
function SectionTitle({ title, subtitle, onRefresh, loading }) {
  return <div className="bmm-section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="bmm-btn bmm-btn-light" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "bmm-spin" : ""}/> Refresh</button></div>;
}

export default function AdminDashboard({ user, onLogout, onBack }) {
  const [activePage, setActivePage] = useState("dashboard"), [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [search, setSearch] = useState("");
  const [pendingUsers, setPendingUsers] = useState([]), [bookings, setBookings] = useState([]), [agents, setAgents] = useState([]), [rates, setRates] = useState([]), [referrals, setReferrals] = useState([]);
  const [rateForm, setRateForm] = useState(INITIAL_RATE), [editingRateId, setEditingRateId] = useState(null);
  const [expandedReferralId, setExpandedReferralId] = useState(null), [referralMembers, setReferralMembers] = useState({}), [membersLoadingId, setMembersLoadingId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
const [editingAgent, setEditingAgent] = useState(false);
const [agentForm, setAgentForm] = useState({});
const [agentBookings, setAgentBookings] = useState([]);
const [showAgentBookings, setShowAgentBookings] = useState(false);
  const [showArchivedAgents, setShowArchivedAgents] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState(INITIAL_AGENT);
  const [createdAgent, setCreatedAgent] = useState(null);
  const [stats, setStats] = useState({ users: 0, pending: 0, bookings: 0, completed: 0 });
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsRange, setAnalyticsRange] = useState("30d");
  const [blockBanners, setBlockBanners] = useState([]);
  const [bannerDistrict, setBannerDistrict] = useState("");
  const [bannerBlock, setBannerBlock] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);

  const flash = useCallback(message => { setNotice(message); setError(""); }, []);
  const fail = useCallback(message => { setError(message); setNotice(""); }, []);
  const clearMessages = () => { setError(""); setNotice(""); };

  const loadPendingUsers = useCallback(async () => {
    const data = await apiRequest("/admin/users/pending", {}, user);
    const list = Array.isArray(data) ? data : data.users || data.pendingUsers || [];
    setPendingUsers(list); return list;
  }, [user]);
  const loadBookings = useCallback(async () => {
    const [bd, ad] = await Promise.all([apiRequest("/admin/bookings", {}, user), apiRequest("/admin/agents", {}, user)]);
    setBookings(Array.isArray(bd) ? bd : bd.bookings || []);
    setAgents(Array.isArray(ad) ? ad : ad.agents || []);
  }, [user]);
  const loadRates = useCallback(async () => {
    const data = await apiRequest("/admin/rates", {}, user); setRates(Array.isArray(data) ? data : data.rates || []);
  }, [user]);
  const loadReferrals = useCallback(async () => {
    const data = await apiRequest("/admin/referrals", {}, user); setReferrals(Array.isArray(data) ? data : data.referrals || []);
  }, [user]);
  const loadAdminNotifications = useCallback(async () => {
    const data = await apiRequest("/admin/notifications", {}, user);
    setAdminNotifications(Array.isArray(data) ? data : data.notifications || []);
  }, [user]);
  const loadAnalytics = useCallback(async (range = analyticsRange) => {
    setAnalyticsLoading(true);
    try {
      const data = await apiRequest(`/admin/analytics?range=${encodeURIComponent(range)}`, {}, user);
      const summary = data.summary || data;
      setAnalytics({
        totalVisitors: summary.totalVisitors ?? summary.total_visitors ?? 0,
        totalPageViews: summary.totalPageViews ?? summary.total_page_views ?? 0,
        todayVisitors: summary.todayVisitors ?? summary.today_visitors ?? 0,
        onlineVisitors: summary.onlineVisitors ?? summary.online_visitors ?? 0,
        daily: data.daily || summary.daily || [],
        topPages: data.topPages || data.top_pages || summary.topPages || summary.top_pages || [],
        devices: data.devices || summary.devices || []
      });
      setAnalyticsError("");
    } catch (e) {
      setAnalytics(null);
      setAnalyticsError(getError(e));
    } finally { setAnalyticsLoading(false); }
  }, [analyticsRange, user]);
  const loadDashboard = useCallback(async () => {
    setLoading(true); clearMessages();
    const results = await Promise.allSettled([loadPendingUsers(), loadBookings(), loadRates(), loadReferrals()]);
    const failures = results.filter(r => r.status === "rejected").map(r => getError(r.reason));
    if (failures.length) fail("à¤•à¥à¤› à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤ˆ: " + failures.join(" | "));
    setLoading(false);
  }, [loadPendingUsers, loadBookings, loadRates, loadReferrals]);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => setStats({
    users: agents.length + pendingUsers.length, pending: pendingUsers.length, bookings: bookings.length,
    completed: bookings.filter(b => b.status === "à¤ªà¥‚à¤°à¥à¤£" || b.status === "à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾").length
  }), [agents, pendingUsers, bookings]);

  const updateUserStatus = async (person, status) => {
    const id = getUserId(person); if (!id) return fail("User ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, user);
      flash(status === "approved" ? "à¤¯à¥‚à¤œà¤¼à¤° à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤" : "à¤¯à¥‚à¤œà¤¼à¤° à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¹à¥‹ à¤—à¤ˆà¥¤"); await loadPendingUsers();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const loadBlockBanners = async () => {
    setBannerLoading(true);
    try {
      const data = await apiRequest("/admin/block-banners", {}, user);
      setBlockBanners(Array.isArray(data) ? data : data.banners || []);
    } catch (e) { fail(getError(e)); }
    finally { setBannerLoading(false); }
  };
  const handleBannerFile = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return fail("à¤•à¥‡à¤µà¤² PNG, JPG à¤¯à¤¾ WEBP à¤‡à¤®à¥‡à¤œ à¤šà¥à¤¨à¥‡à¤‚à¥¤");
    if (file.size > 500 * 1024) return fail("à¤‡à¤®à¥‡à¤œ 500 KB à¤¸à¥‡ à¤›à¥‹à¤Ÿà¥€ à¤¹à¥‹à¤¨à¥€ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const saveBlockBanner = async () => {
    if (!bannerDistrict || !bannerBlock) return fail("à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
    if (!bannerPreview) return fail("à¤ªà¤¹à¤²à¥‡ Banner à¤‡à¤®à¥‡à¤œ à¤šà¥à¤¨à¥‡à¤‚à¥¤");
    setBannerLoading(true); clearMessages();
    try {
      await apiRequest("/admin/block-banners", { method: "POST", body: JSON.stringify({ district: bannerDistrict, block: bannerBlock, imageData: bannerPreview }) }, user);
      flash("à¤‡à¤¸ à¤¬à¥à¤²à¥‰à¤• à¤•à¤¾ Banner à¤¸à¥‡à¤µ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤");
      setBannerPreview("");
      await loadBlockBanners();
    } catch (e) { fail(getError(e)); }
    finally { setBannerLoading(false); }
  };
  const deleteBlockBanner = async banner => {
    if (!window.confirm(`${banner.district} - ${banner.block} à¤•à¤¾ Banner à¤¹à¤Ÿà¤¾à¤à¤?`)) return;
    setBannerLoading(true);
    try {
      await apiRequest(`/admin/block-banners/${banner.id}`, { method: "DELETE" }, user);
      flash("Block Banner à¤¹à¤Ÿà¤¾ à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤");
      await loadBlockBanners();
    } catch (e) { fail(getError(e)); }
    finally { setBannerLoading(false); }
  };

  // Backend à¤®à¥‡à¤‚ booking assignment à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤²à¤— assign / unassign routes à¤¹à¥ˆà¤‚à¥¤
  const updateBookingAssignment = async (booking, agentId) => {
    const id = getBookingId(booking);
    if (!id) return fail("Booking ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    setLoading(true); clearMessages();
    try {
      if (agentId) {
        await apiRequest(`/admin/bookings/${id}/assign`, {
          method: "PATCH",
          body: JSON.stringify({ agent_id: Number(agentId) })
        }, user);
      } else {
        await apiRequest(`/admin/bookings/${id}/unassign`, { method: "PATCH" }, user);
      }
      flash(agentId ? "Agent à¤¬à¥à¤•à¤¿à¤‚à¤— à¤ªà¤° à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤" : "Booking à¤¸à¥‡ Agent à¤¹à¤Ÿà¤¾ à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤");
      await loadBookings();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const createAgent = async event => {
    event.preventDefault();
    clearMessages();
    const payload = {
      name: newAgentForm.name.trim(), agency_name: newAgentForm.agency_name.trim(),
      mobile: newAgentForm.mobile.trim(), password: newAgentForm.password,
      district: newAgentForm.district, block: newAgentForm.block,
      office_address: newAgentForm.office_address.trim()
    };
    if (!payload.name || !payload.agency_name || !payload.mobile || !payload.password || !payload.district || !payload.block || !payload.office_address) {
      return fail("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤­à¥€ à¤«à¤¼à¥€à¤²à¥à¤¡ à¤­à¤°à¥‡à¤‚à¥¤");
    }
    if (!/^\d{10}$/.test(payload.mobile)) return fail("10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤¸à¤¹à¥€ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤");
    if (payload.password.length < 8) return fail("à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤° à¤•à¤¾ à¤¹à¥‹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
    setLoading(true);
    try {
      const data = await apiRequest("/admin/agents", { method: "POST", body: JSON.stringify(payload) }, user);
      const result = data.agent || data.user || data;
      setCreatedAgent({ userId: data.userId || result.userId || result.user_id, name: result.name || payload.name, mobile: result.mobile || payload.mobile });
      setNewAgentForm(INITIAL_AGENT);
      flash(data.message || "à¤¨à¤¯à¤¾ Agent à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¨à¤¾à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤");
      await loadBookings();
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const resetRateForm = () => { setRateForm(INITIAL_RATE); setEditingRateId(null); };
  const saveRate = async event => {
    event.preventDefault(); clearMessages();
    if (!rateForm.district.trim() || !rateForm.tehsil.trim() || !rateForm.block.trim()) return fail("à¤œà¤¿à¤²à¤¾, à¤¤à¤¹à¤¸à¥€à¤² à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤­à¤°à¤¨à¤¾ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤");
    const payload = {
      district: rateForm.district.trim(), tehsil: rateForm.tehsil.trim(), block: rateForm.block.trim(),
      drilling: Number(rateForm.drilling || 0), repairing: Number(rateForm.repairing || 0),
      casingPipe: Number(rateForm.casingPipe || 0), msPipe: Number(rateForm.msPipe || 0), otherServices: Number(rateForm.otherServices || 0)
    };
    setLoading(true);
    try {
      if (editingRateId) {
        await apiRequest(`/admin/rates/${editingRateId}`, { method: "PUT", body: JSON.stringify(payload) }, user); flash("à¤°à¥‡à¤Ÿ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤");
      } else {
        await apiRequest("/admin/rates", { method: "POST", body: JSON.stringify(payload) }, user); flash("à¤¨à¤¯à¤¾ à¤¬à¥à¤²à¥‰à¤• à¤°à¥‡à¤Ÿ à¤¸à¥‡à¤µ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤");
      }
      resetRateForm(); await loadRates();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const editRate = rate => {
    setEditingRateId(rate.id ?? rate.rate_id);
    setRateForm({
      district: rate.district || "", tehsil: rate.tehsil || "", block: rate.block || "",
      drilling: String(rate.drilling ?? ""), repairing: String(rate.repairing ?? ""),
      casingPipe: String(rate.casingPipe ?? rate.casing_pipe ?? ""), msPipe: String(rate.msPipe ?? rate.ms_pipe ?? ""),
      otherServices: String(rate.otherServices ?? rate.other_services ?? "")
    });
    setActivePage("rates"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteRate = async rate => {
    const id = rate.id ?? rate.rate_id; if (!id) return fail("Rate ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    if (!window.confirm("à¤•à¥à¤¯à¤¾ à¤†à¤ª à¤¯à¤¹ à¤¬à¥à¤²à¥‰à¤• à¤°à¥‡à¤Ÿ à¤¹à¤Ÿà¤¾à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?")) return;
    setLoading(true); clearMessages();
    try { await apiRequest(`/admin/rates/${id}`, { method: "DELETE" }, user); flash("à¤°à¥‡à¤Ÿ à¤¹à¤Ÿà¤¾ à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤"); await loadRates(); }
    catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };

  // Referral partner à¤•à¥€ ID à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥‡ à¤¸à¤­à¥€ à¤¯à¥‚à¤œà¤¼à¤° à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚
  const loadReferralMembers = async referral => {
    const id = referral.id ?? referral.user_id ?? referral.userId;
    if (!id) return fail("Referral Partner à¤•à¥€ User ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    if (expandedReferralId === id) { setExpandedReferralId(null); return; }
    setExpandedReferralId(id);
    if (Object.prototype.hasOwnProperty.call(referralMembers, id)) return;
    setMembersLoadingId(id); clearMessages();
    try {
      const data = await apiRequest(`/admin/referrals/${id}/members`, {}, user);
      const list = Array.isArray(data) ? data : data.members || data.users || [];
      setReferralMembers(prev => ({ ...prev, [id]: list }));
    } catch (e) { fail(getError(e)); setExpandedReferralId(null); }
    finally { setMembersLoadingId(null); }
  };

  const filteredBookings = bookings.filter(b => [b.name,b.mobile,b.district,b.block,b.village,b.service,b.status].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const filteredUsers = pendingUsers.filter(p => [p.name,p.mobile,p.userId,p.user_id,p.role].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const navItems = [
    { id: "dashboard", label: "01. Overview", icon: LayoutDashboard },
    { id: "customers", label: "02. Customer Management", icon: Users },
    { id: "agents", label: "03. Agent Management", icon: UserCheck },
    { id: "createAgent", label: "04. Create Agent", icon: BadgeCheck },
    { id: "bookings", label: "05. Booking Management", icon: ClipboardList },
    { id: "rates", label: "06. Rate & Service Management", icon: IndianRupee },
    { id: "rules", label: "07. Rules Management", icon: ShieldCheck },
    { id: "banners", label: "08. Banner Management", icon: Droplets },
    { id: "referrals", label: "09. Referral & Commission", icon: Handshake },
    { id: "calculator", label: "10. Calculator Management", icon: IndianRupee },
    { id: "reports", label: "11. Reports & Accounts", icon: ClipboardList },
    { id: "admins", label: "12. Admin & Sub-Admin", icon: ShieldCheck },
    { id: "settings", label: "13. Website Settings", icon: Settings },
    { id: "notifications", label: "14. Notifications", icon: AlertCircle },
    { id: "complaints", label: "15. Complaints", icon: AlertCircle },
    { id: "feedback", label: "16. Feedback & Ratings", icon: CheckCircle2 },
    { id: "blockBanners", label: "17. Block Banner Management", icon: ImageIcon }
  ];
  const navigate = page => {
    setActivePage(page); setSidebarOpen(false); clearMessages();
    if (page === "customers") loadPendingUsers().catch(e => fail(getError(e)));
    if (page === "notifications") loadAdminNotifications().catch(e => fail(getError(e)));
    if (page === "approvals") loadPendingUsers().catch(e => fail(getError(e)));
    if (page === "bookings" || page === "agents") loadBookings().catch(e => fail(getError(e)));
    if (page === "rates") loadRates().catch(e => fail(getError(e)));
    if (page === "referrals") loadReferrals().catch(e => fail(getError(e)));
    if (page === "blockBanners") loadBlockBanners();
  };
const saveAgentDetails = async event => {
  event.preventDefault();

  if (!selectedAgent?.id) {
    return fail("Agent ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
  }

  const payload = {
    name: (agentForm.name || "").trim(),
    agencyName: (agentForm.agency_name || "").trim(),
    district: (agentForm.district || "").trim(),
    block: (agentForm.block || "").trim()
  };

  if (!payload.name || !payload.district || !payload.block) {
    return fail("Agent à¤•à¤¾ à¤¨à¤¾à¤®, à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤­à¤°à¤¨à¤¾ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤");
  }

  setLoading(true);
  clearMessages();

  try {
    await apiRequest(
      `/admin/agents/${selectedAgent.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      user
    );

    flash("Agent à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¹à¥‹ à¤—à¤ˆà¥¤");
    setEditingAgent(false);
    await loadBookings();

    setSelectedAgent(prev => ({
      ...prev,
      name: payload.name,
      agency_name: payload.agencyName,
      district: payload.district,
      block: payload.block
    }));
  } catch (e) {
    fail(getError(e));
  } finally {
    setLoading(false);
  }
};

  // Agent à¤•à¥€ à¤¸à¥‚à¤šà¥€ à¤•à¥‹ à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¯à¤¾ archived mode à¤®à¥‡à¤‚ à¤«à¤¿à¤° à¤¸à¥‡ à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚à¥¤
  const refreshAgentList = async (includeArchived = showArchivedAgents) => {
    const data = await apiRequest(`/admin/agents${includeArchived ? "?includeArchived=1" : ""}`, {}, user);
    setAgents(Array.isArray(data) ? data : data.agents || []);
  };

  const getAgentRecordId = agent => agent?.id ?? agent?.agent_id ?? agent?.user_id ?? agent?.userId;
  const isAgentArchived = agent => Boolean(
    agent?.is_archived === true || Number(agent?.is_archived) === 1 || agent?.deleted_at || agent?.deletedAt
  );
  const isAgentActive = agent => {
    if (agent?.is_active !== undefined && agent?.is_active !== null) {
      return agent.is_active === true || Number(agent.is_active) === 1;
    }
    return String(agent?.status || "").toLowerCase() === "approved" || String(agent?.status || "").toLowerCase() === "active";
  };

  const toggleAgentActive = async agent => {
    const id = getAgentRecordId(agent);
    if (!id) return fail("Agent ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    const nextActive = !isAgentActive(agent);
    const message = nextActive ? "à¤•à¥à¤¯à¤¾ à¤‡à¤¸ Agent à¤•à¥‹ Active à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?" : "à¤•à¥à¤¯à¤¾ à¤‡à¤¸ Agent à¤•à¥‹ Inactive à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?";
    if (!window.confirm(message)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextActive })
      }, user);
      flash(nextActive ? "Agent Active à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤" : "Agent Inactive à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤");
      await refreshAgentList(showArchivedAgents);
      if (selectedAgent && String(getAgentRecordId(selectedAgent)) === String(id)) {
        setSelectedAgent(prev => ({ ...prev, is_active: nextActive ? 1 : 0 }));
      }
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const archiveAgent = async agent => {
    const id = getAgentRecordId(agent);
    if (!id) return fail("Agent ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    if (!window.confirm(`${agent.name || "à¤‡à¤¸ Agent"} à¤•à¥‹ à¤¸à¥‚à¤šà¥€ à¤¸à¥‡ à¤¹à¤Ÿà¤¾à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚? à¤‡à¤¸à¥‡ à¤¬à¤¾à¤¦ à¤®à¥‡à¤‚ Restore à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤¸à¤•à¥‡à¤—à¤¾à¥¤`)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}`, { method: "DELETE" }, user);
      flash("Agent Archive à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤ Restore à¤µà¤¿à¤•à¤²à¥à¤ª à¤¸à¥‡ à¤µà¤¾à¤ªà¤¸ à¤²à¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤");
      if (selectedAgent && String(getAgentRecordId(selectedAgent)) === String(id)) {
        setSelectedAgent(null); setShowAgentBookings(false); setAgentBookings([]);
      }
      await refreshAgentList(showArchivedAgents);
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const restoreAgent = async agent => {
    const id = getAgentRecordId(agent);
    if (!id) return fail("Agent ID à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤");
    if (!window.confirm(`${agent.name || "à¤‡à¤¸ Agent"} à¤•à¥‹ Restore à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?`)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}/restore`, { method: "PATCH" }, user);
      flash("Agent Restore à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤");
      await refreshAgentList(showArchivedAgents);
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const renderDashboard = () => <>
    <SectionTitle title="Admin Dashboard" subtitle="Borewells Mitra â€” à¤¸à¤¿à¤¸à¥à¤Ÿà¤® à¤•à¥€ à¤®à¥à¤–à¥à¤¯ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€" onRefresh={loadDashboard} loading={loading}/>
    <div className="bmm-stats-grid">
      <StatCard title="à¤•à¥à¤² à¤¯à¥‚à¤œà¤¼à¤°" value={stats.users} icon={Users} color="blue"/><StatCard title="Approval Pending" value={stats.pending} icon={Clock3} color="orange"/>
      <StatCard title="à¤•à¥à¤² Booking" value={stats.bookings} icon={ClipboardList} color="purple"/><StatCard title="à¤ªà¥‚à¤°à¥€ à¤¹à¥à¤ˆ Booking" value={stats.completed} icon={CheckCircle2} color="green"/>
    </div>
    <div className="bmm-section-title bmm-analytics-heading"><div><h2><Eye size={20}/> Visitor Analytics</h2><p>à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤ªà¤° à¤†à¤¨à¥‡ à¤µà¤¾à¤²à¥‡ à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• Visitors à¤”à¤° Page Views</p></div><div className="bmm-analytics-controls"><select value={analyticsRange} onChange={e => setAnalyticsRange(e.target.value)}><option value="7d">à¤ªà¤¿à¤›à¤²à¥‡ 7 à¤¦à¤¿à¤¨</option><option value="30d">à¤ªà¤¿à¤›à¤²à¥‡ 30 à¤¦à¤¿à¤¨</option><option value="90d">à¤ªà¤¿à¤›à¤²à¥‡ 90 à¤¦à¤¿à¤¨</option><option value="all">à¤¶à¥à¤°à¥‚ à¤¸à¥‡ à¤…à¤¬ à¤¤à¤•</option></select><button className="bmm-btn bmm-btn-light" onClick={() => loadAnalytics()} disabled={analyticsLoading}><RefreshCw size={15} className={analyticsLoading ? "bmm-spin" : ""}/> Refresh</button></div></div>
    {analyticsError ? <div className="bmm-card bmm-analytics-unavailable"><strong>Analytics Tracking API à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</strong><p className="bmm-muted">{analyticsError} à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• Visitor à¤—à¤¿à¤¨à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ Backend à¤®à¥‡à¤‚ tracking API à¤”à¤° à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤•à¥‡ à¤¸à¤­à¥€ pages à¤ªà¤° tracking à¤œà¥‹à¤¡à¤¼à¤¨à¥€ à¤¹à¥‹à¤—à¥€à¥¤</p></div> : <><div className="bmm-stats-grid bmm-analytics-grid"><StatCard title="à¤•à¥à¤² Visitors" value={analytics?.totalVisitors ?? "â€”"} icon={Users} color="blue"/><StatCard title="à¤•à¥à¤² Page Views" value={analytics?.totalPageViews ?? "â€”"} icon={Eye} color="purple"/><StatCard title="à¤†à¤œ à¤•à¥‡ Visitors" value={analytics?.todayVisitors ?? "â€”"} icon={BarChart3} color="green"/><StatCard title="à¤…à¤­à¥€ Online" value={analytics?.onlineVisitors ?? "â€”"} icon={Activity} color="orange"/></div><div className="bmm-analytics-columns"><div className="bmm-card"><h3>à¤¦à¥ˆà¤¨à¤¿à¤• Visitors</h3>{!analytics?.daily?.length ? <p className="bmm-muted">à¤…à¤­à¥€ à¤¦à¥ˆà¤¨à¤¿à¤• Visitor à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> : <div className="bmm-bars">{analytics.daily.map((day,i) => { const count = Number(day.visitors ?? day.count ?? 0); const max = Math.max(1,...analytics.daily.map(x => Number(x.visitors ?? x.count ?? 0))); return <div className="bmm-bar-item" key={day.date || i}><div className="bmm-bar-value">{count}</div><div className="bmm-bar-track"><div className="bmm-bar-fill" style={{height:`${Math.max(4,(count/max)*100)}%`}}/></div><small>{day.label || day.date || "â€”"}</small></div>; })}</div>}</div><div className="bmm-card"><h3>à¤¸à¤¬à¤¸à¥‡ à¤œà¥à¤¯à¤¾à¤¦à¤¾ à¤¦à¥‡à¤–à¥‡ à¤—à¤ Pages</h3>{!analytics?.topPages?.length ? <p className="bmm-muted">Page à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>{analytics.topPages.map((page,i)=><tr key={page.path || page.url || i}><td>{page.title || page.path || page.url || "â€”"}</td><td>{Number(page.views ?? page.pageViews ?? page.page_views ?? 0).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>}</div></div><div className="bmm-card"><h3><MonitorSmartphone size={17}/> Device Breakdown</h3>{!analytics?.devices?.length ? <p className="bmm-muted">Device report à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> : <div className="bmm-device-list">{analytics.devices.map((device,i)=><div key={device.device || device.name || i}><span>{device.device || device.name || "Other"}</span><strong>{Number(device.visitors ?? device.count ?? 0).toLocaleString("en-IN")}</strong></div>)}</div>}</div></>}
    <div className="bmm-card"><h3>Quick Actions</h3><div className="bmm-quick-actions">
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("bookings")}><ClipboardList size={17}/> Bookings à¤¦à¥‡à¤–à¥‡à¤‚</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("approvals")}><BadgeCheck size={17}/> User Approval</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("rates")}><IndianRupee size={17}/> Block Rates</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("referrals")}><Handshake size={17}/> Referrals</button>
    </div></div>
    <div className="bmm-card"><h3>à¤¹à¤¾à¤² à¤•à¥€ Bookings</h3>{!bookings.length ? <p className="bmm-muted">à¤…à¤­à¥€ à¤•à¥‹à¤ˆ Booking à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Booking ID</th><th>à¤—à¥à¤°à¤¾à¤¹à¤•</th><th>à¤•à¥à¤·à¥‡à¤¤à¥à¤°</th><th>à¤¸à¥‡à¤µà¤¾</th><th>Status</th></tr></thead>
        <tbody>{bookings.slice(0,5).map(b => <tr key={getBookingId(b)}><td>#{getBookingId(b)}</td><td>{b.name}<br/>{b.mobile}</td><td>{b.district} / {b.block}</td><td>{b.service}</td><td><span className="bmm-badge">{b.status}</span></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderApprovals = () => <>
    <SectionTitle title="User Approval" subtitle="à¤¨à¤ à¤¯à¥‚à¤œà¤¼à¤° à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¤•à¥‡ à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤•à¤°à¥‡à¤‚" onRefresh={() => loadPendingUsers().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-toolbar"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="à¤¨à¤¾à¤®, à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¯à¤¾ User ID à¤–à¥‹à¤œà¥‡à¤‚"/></div>
    <div className="bmm-card">{!filteredUsers.length ? <p className="bmm-muted">à¤•à¥‹à¤ˆ Pending User à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤¯à¥‚à¤œà¤¼à¤°</th><th>User ID</th><th>Role</th><th>à¤¸à¥à¤¥à¤¿à¤¤à¤¿</th><th>Action</th></tr></thead>
        <tbody>{filteredUsers.map(p => <tr key={getUserId(p)}><td>{p.name}<br/>{p.mobile}</td><td>{p.userId || p.user_id || "â€”"}</td><td>{p.role || "customer"}</td><td>{p.status || "pending"}</td>
          <td><div className="bmm-actions"><button className="bmm-btn bmm-btn-success" disabled={loading} onClick={() => updateUserStatus(p,"approved")}><CheckCircle2 size={15}/> Approve</button>
          <button className="bmm-btn bmm-btn-danger" disabled={loading} onClick={() => updateUserStatus(p,"rejected")}><XCircle size={15}/> Reject</button></div></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderBookings = () => <>
    <SectionTitle title="Booking Management" subtitle="Booking à¤¦à¥‡à¤–à¥‡à¤‚, à¤à¤œà¥‡à¤‚à¤Ÿ à¤šà¥à¤¨à¥‡à¤‚ à¤”à¤° à¤•à¤¾à¤® à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚" onRefresh={() => loadBookings().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-toolbar"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="à¤—à¥à¤°à¤¾à¤¹à¤•, à¤®à¥‹à¤¬à¤¾à¤‡à¤², à¤œà¤¿à¤²à¤¾ à¤¯à¤¾ Booking à¤–à¥‹à¤œà¥‡à¤‚"/></div>
    <div className="bmm-card">{!filteredBookings.length ? <p className="bmm-muted">à¤•à¥‹à¤ˆ Booking à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Booking</th><th>à¤—à¥à¤°à¤¾à¤¹à¤• / à¤¸à¥à¤¥à¤¾à¤¨</th><th>à¤¸à¥‡à¤µà¤¾</th><th>Agent Assign</th><th>Status</th></tr></thead>
        <tbody>{filteredBookings.map(b => <tr key={getBookingId(b)}><td><strong>#{getBookingId(b)}</strong><br/><small>{b.created_at || ""}</small></td>
          <td>{b.name}<br/>{b.mobile}<br/><small>{[b.district,b.block,b.village].filter(Boolean).join(" / ")}</small></td><td>{b.service || "â€”"}</td>
          <td><select value={b.assigned_agent_id ?? ""} onChange={e => updateBookingAssignment(b, e.target.value)} disabled={loading}>
            <option value="">Agent à¤šà¥à¤¨à¥‡à¤‚ / à¤¹à¤Ÿà¤¾à¤à¤</option>{agents.filter(a => a.status === "approved" && (a.is_active === 1 || a.is_active === true || a.is_active == null) && !a.deleted_at).map(a => <option key={a.id} value={a.id}>{a.name} â€” {a.mobile}</option>)}</select></td>
          <td><span className="bmm-badge">{b.status || "à¤¨à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤—"}</span></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderRates = () => <>
    <SectionTitle title="Rate Management" subtitle="à¤¹à¤° à¤œà¤¿à¤²à¤¾, à¤¤à¤¹à¤¸à¥€à¤² à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤²à¤— à¤°à¥‡à¤Ÿ à¤¸à¥‡à¤µ à¤•à¤°à¥‡à¤‚" onRefresh={() => loadRates().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-card"><h3>{editingRateId ? "à¤°à¥‡à¤Ÿ à¤®à¥‡à¤‚ à¤¬à¤¦à¤²à¤¾à¤µ à¤•à¤°à¥‡à¤‚" : "à¤¨à¤¯à¤¾ à¤¬à¥à¤²à¥‰à¤• à¤°à¥‡à¤Ÿ à¤œà¥‹à¤¡à¤¼à¥‡à¤‚"}</h3>
      <form className="bmm-form-grid" onSubmit={saveRate}>
        <label>à¤œà¤¿à¤²à¤¾<select value={rateForm.district} onChange={e => setRateForm(p => ({...p,district:e.target.value,tehsil:"",block:""}))} required><option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
        <label>à¤¤à¤¹à¤¸à¥€à¤²<input value={rateForm.tehsil} onChange={e => setRateForm(p => ({...p,tehsil:e.target.value,block:""}))} placeholder="à¤¤à¤¹à¤¸à¥€à¤² à¤•à¤¾ à¤¨à¤¾à¤®" required/></label>
        <label>à¤¬à¥à¤²à¥‰à¤•<select value={rateForm.block} onChange={e => setRateForm(p => ({...p,block:e.target.value}))} required disabled={!rateForm.district}><option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>{(BLOCKS[rateForm.district] || []).map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        {[["drilling","Drilling Rate (â‚¹)"],["repairing","Repairing Rate (â‚¹)"],["casingPipe","Casing Pipe Rate (â‚¹)"],["msPipe","MS Pipe Rate (â‚¹)"],["otherServices","Other Services Rate (â‚¹)"]].map(([field,label]) => <label key={field}>{label}<input type="number" min="0" step="0.01" value={rateForm[field]} onChange={e => setRateForm(p => ({...p,[field]:e.target.value}))} placeholder="0"/></label>)}
        <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" disabled={loading} type="submit"><Save size={16}/>{editingRateId ? " à¤°à¥‡à¤Ÿ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚" : " à¤°à¥‡à¤Ÿ à¤¸à¥‡à¤µ à¤•à¤°à¥‡à¤‚"}</button>{editingRateId && <button className="bmm-btn bmm-btn-light" type="button" onClick={resetRateForm}>Cancel</button>}</div>
      </form>
    </div>
    <div className="bmm-card"><h3>à¤¸à¤­à¥€ Block Rates ({rates.length})</h3>{!rates.length ? <p className="bmm-muted">à¤°à¥‡à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚à¥¤ à¤Šà¤ªà¤° à¤¸à¥‡ à¤°à¥‡à¤Ÿ à¤œà¥‹à¤¡à¤¼à¥‡à¤‚à¥¤</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤œà¤¿à¤²à¤¾ / à¤¤à¤¹à¤¸à¥€à¤² / à¤¬à¥à¤²à¥‰à¤•</th><th>Drilling</th><th>Repairing</th><th>Casing Pipe</th><th>MS Pipe</th><th>Other</th><th>Action</th></tr></thead>
        <tbody>{rates.map(r => <tr key={r.id ?? r.rate_id}><td>{r.district}<br/>{r.tehsil}<br/><strong>{r.block}</strong></td><td>{money(r.drilling)}</td><td>{money(r.repairing)}</td><td>{money(r.casingPipe ?? r.casing_pipe)}</td><td>{money(r.msPipe ?? r.ms_pipe)}</td><td>{money(r.otherServices ?? r.other_services)}</td>
          <td><div className="bmm-actions"><button className="bmm-btn bmm-btn-light" onClick={() => editRate(r)}>Edit</button><button className="bmm-btn bmm-btn-danger" onClick={() => deleteRate(r)}>Delete</button></div></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderAgents = () => {
    const list = agents
      .filter(a => showArchivedAgents ? isAgentArchived(a) : !isAgentArchived(a))
      .filter(a => [a.name, a.mobile, a.userId, a.user_id, a.status, a.district, a.block]
        .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));

    const openAgent = a => {
      setSelectedAgent(a);
      setEditingAgent(false);
      setAgentForm({
        name: a.name || "",
        mobile: a.mobile || "",
        agency_name: a.agency_name || a.agencyName || "",
        district: a.district || "",
        block: a.block || "",
        office_address: a.office_address || a.officeAddress || ""
      });

      const agentIds = [
        a.id, a.user_id, a.userId, a.agent_id, a.agentId
      ].filter(value => value !== undefined && value !== null).map(String);

      const history = bookings.filter(b => {
        const assignedIds = [
          b.assigned_agent_id, b.agent_id, b.assignedAgentId,
          b.agentId, b.agent_user_id, b.assigned_agent_user_id
        ].filter(value => value !== undefined && value !== null).map(String);

        return assignedIds.some(id => agentIds.includes(id));
      });

      setAgentBookings(history);
      setShowAgentBookings(true);
    };

    const getBookingStatus = b =>
      String(b.status || b.booking_status || b.bookingStatus || "").trim().toLowerCase();

    const isSuccessfulBooking = b => {
      const status = getBookingStatus(b);
      return ["à¤ªà¥‚à¤°à¥à¤£", "à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾", "complete", "completed", "success", "successful"].includes(status);
    };

    const isCancelledBooking = b => {
      const status = getBookingStatus(b);
      return ["à¤°à¤¦à¥à¤¦", "cancelled", "canceled", "reject", "rejected"].includes(status);
    };

    const totalAgentBookings = agentBookings.length;
    const successAgentBookings = agentBookings.filter(isSuccessfulBooking).length;
    const pendingAgentBookings = agentBookings.filter(
      b => !isSuccessfulBooking(b) && !isCancelledBooking(b)
    ).length;

    return <>
      <SectionTitle
        title="Agent Management"
        subtitle="à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€, à¤•à¥à¤² à¤¬à¥à¤•à¤¿à¤‚à¤— à¤”à¤° à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¹à¤¿à¤¸à¥à¤Ÿà¥à¤°à¥€"
        onRefresh={() => loadBookings().catch(e => fail(getError(e)))}
        loading={loading}
      />

      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
        <div className="bmm-toolbar" style={{marginBottom:0,flex:1}}>
          <Search size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Agent à¤¨à¤¾à¤®, à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¯à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤–à¥‹à¤œà¥‡à¤‚" />
        </div>
        <button type="button" className={`bmm-btn ${showArchivedAgents ? "bmm-btn-primary" : "bmm-btn-light"}`} disabled={loading}
          onClick={async () => {
            const next = !showArchivedAgents;
            setShowArchivedAgents(next);
            setSelectedAgent(null); setShowAgentBookings(false); setAgentBookings([]);
            setLoading(true); clearMessages();
            try {
              const data = await apiRequest(`/admin/agents${next ? "?includeArchived=1" : ""}`, {}, user);
              setAgents(Array.isArray(data) ? data : data.agents || []);
            } catch (e) { fail(getError(e)); }
            finally { setLoading(false); }
          }}>
          {showArchivedAgents ? "à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ Agents à¤¦à¥‡à¤–à¥‡à¤‚" : "Deleted / Archived à¤¦à¥‡à¤–à¥‡à¤‚"}
        </button>
      </div>

      <div className="bmm-card">
        {!list.length ? (
          <p className="bmm-muted">{showArchivedAgents ? "à¤•à¥‹à¤ˆ Archived Agent à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤" : "Agent List à¤–à¤¾à¤²à¥€ à¤¹à¥ˆ à¤¯à¤¾ Backend à¤¸à¥‡ Agent API à¤•à¤¾ à¤‰à¤¤à¥à¤¤à¤° à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤"}</p>
        ) : (
          <div className="bmm-table-wrap">
            <table className="bmm-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>User ID</th>
                  <th>à¤•à¥à¤·à¥‡à¤¤à¥à¤°</th>
                  <th>Status</th>
                  <th>Active / Inactive</th>
                  <th>Delete / Restore</th>
                  <th>à¤µà¤¿à¤µà¤°à¤£</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={getUserId(a)}>
                    <td><b>{a.name || "â€”"}</b><br/>{a.mobile || "â€”"}</td>
                    <td>{a.userId || a.user_id || "â€”"}</td>
                    <td>{a.district || "â€”"}<br/>{a.block || "â€”"}</td>
                    <td>
                      <span className="bmm-badge" style={{background:isAgentArchived(a) ? "#f1f5f9" : isAgentActive(a) ? "#e1f8eb" : "#fff0dc",color:isAgentArchived(a) ? "#64748b" : isAgentActive(a) ? "#14834a" : "#b96900"}}>
                        {isAgentArchived(a) ? "Archived" : isAgentActive(a) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {!isAgentArchived(a) && <button type="button" className={`bmm-btn ${isAgentActive(a) ? "bmm-btn-danger" : "bmm-btn-success"}`} disabled={loading} onClick={() => toggleAgentActive(a)}>
                        <Power size={14}/>{isAgentActive(a) ? "Inactive à¤•à¤°à¥‡à¤‚" : "Active à¤•à¤°à¥‡à¤‚"}
                      </button>}
                    </td>
                    <td>
                      {isAgentArchived(a) ? (
                        <button type="button" className="bmm-btn bmm-btn-success" disabled={loading} onClick={() => restoreAgent(a)}><RotateCcw size={14}/> Restore</button>
                      ) : (
                        <button type="button" className="bmm-btn bmm-btn-danger" disabled={loading} onClick={() => archiveAgent(a)}><Trash2 size={14}/> Delete</button>
                      )}
                    </td>
                    <td>
                      {!isAgentArchived(a) && <button type="button" className="bmm-btn bmm-btn-primary" onClick={() => openAgent(a)}>à¤µà¤¿à¤µà¤°à¤£ / Booking History</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAgent && showAgentBookings && (
        <div className="bmm-card" style={{marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div>
              <h3 style={{margin:"0 0 8px"}}>{selectedAgent.name || "Agent"} à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€</h3>
              <p className="bmm-muted" style={{margin:"0 0 12px"}}>
                à¤®à¥‹à¤¬à¤¾à¤‡à¤²: {selectedAgent.mobile || "â€”"} | User ID: {selectedAgent.userId || selectedAgent.user_id || selectedAgent.id || "â€”"}
              </p>
              <button
                type="button"
                onClick={() => setEditingAgent(v => !v)}
                style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:9,
                  padding:"11px 20px", border:"1px solid #2563eb", borderRadius:10,
                  background:editingAgent ? "#eff6ff" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color:editingAgent ? "#1d4ed8" : "#fff", fontSize:14, fontWeight:600,
                  cursor:"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.18)"
                }}
              >
                <Save size={17}/>{editingAgent ? "Edit à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚" : "Agent Details Edit"}
              </button>
            </div>

            <button
              type="button"
              className="bmm-btn bmm-btn-light"
              onClick={() => {
                setSelectedAgent(null);
                setShowAgentBookings(false);
                setAgentBookings([]);
                setEditingAgent(false);
              }}
            >
              à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚
            </button>
          </div>

          {editingAgent && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:16}}>
              <input placeholder="Agent à¤•à¤¾ à¤¨à¤¾à¤®" value={agentForm.name || ""} onChange={e => setAgentForm(p => ({...p,name:e.target.value}))}/>
              <input placeholder="à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°" value={agentForm.mobile || ""} onChange={e => setAgentForm(p => ({...p,mobile:e.target.value}))}/>
              <input placeholder="Agency Name" value={agentForm.agency_name || ""} onChange={e => setAgentForm(p => ({...p,agency_name:e.target.value}))}/>
              <input placeholder="à¤œà¤¿à¤²à¤¾" value={agentForm.district || ""} onChange={e => setAgentForm(p => ({...p,district:e.target.value}))}/>
              <input placeholder="à¤¬à¥à¤²à¥‰à¤•" value={agentForm.block || ""} onChange={e => setAgentForm(p => ({...p,block:e.target.value}))}/>
              <input placeholder="à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¤¤à¤¾" value={agentForm.office_address || ""} onChange={e => setAgentForm(p => ({...p,office_address:e.target.value}))}/>
              <button type="button" className="bmm-btn bmm-btn-primary" onClick={saveAgentDetails} disabled={loading} style={{gridColumn:"1 / -1"}}>
                <Save size={16}/>{loading ? "à¤¸à¥‡à¤µ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : "Save Agent Details"}
              </button>
            </div>
          )}

          <hr style={{margin:"18px 0",opacity:.2}}/>
          <h3>Agent Booking Summary</h3>
          <div className="bmm-stats-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",marginBottom:20}}>
            <StatCard title="Total Booking" value={totalAgentBookings} icon={ClipboardList} color="purple"/>
            <StatCard title="Pending Booking" value={pendingAgentBookings} icon={Clock3} color="orange"/>
            <StatCard title="Success Booking" value={successAgentBookings} icon={CheckCircle2} color="green"/>
          </div>

          <h3>Agent à¤•à¥€ à¤ªà¥‚à¤°à¥€ Booking History ({totalAgentBookings})</h3>
          {!agentBookings.length ? (
            <p className="bmm-muted">à¤‡à¤¸ Agent à¤•à¥€ à¤•à¥‹à¤ˆ Booking à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤ à¤…à¤—à¤° à¤¬à¥à¤•à¤¿à¤‚à¤— à¤®à¥Œà¤œà¥‚à¤¦ à¤¹à¥ˆ à¤¤à¥‹ Backend à¤•à¥‡ assigned agent ID field à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¥‡à¤‚à¥¤</p>
          ) : (
            <div className="bmm-table-wrap">
              <table className="bmm-table">
                <thead>
                  <tr>
                    <th>Booking No.</th>
                    <th>à¤¤à¤¾à¤°à¥€à¤–</th>
                    <th>Customer</th>
                    <th>à¤•à¥à¤·à¥‡à¤¤à¥à¤°</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {agentBookings.map((b, index) => (
                    <tr key={getBookingId(b) || index}>
                      <td>{b.booking_number || b.booking_no || getBookingId(b) || "â€”"}</td>
                      <td>{formatDate(b.created_at || b.createdAt || b.booking_date)}</td>
                      <td>{b.customer_name || b.name || "â€”"}<br/>{b.customer_mobile || b.mobile || "â€”"}</td>
                      <td>{[b.district,b.block,b.village].filter(Boolean).join(" / ") || "â€”"}</td>
                      <td>{b.service || b.service_type || b.service_name || "â€”"}</td>
                      <td><span className="bmm-badge">{b.status || b.booking_status || "â€”"}</span></td>
                      <td>{money(b.amount ?? b.total_amount ?? b.price)}</td>
                      <td>{money(b.commission ?? b.agent_commission ?? b.commission_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>;
  };


    const renderReferrals = () => <>
    <SectionTitle title="Referral Management" subtitle="Referral ID, à¤‰à¤¸à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥‡ à¤¯à¥‚à¤œà¤¼à¤° à¤”à¤° à¤œà¥à¤¡à¤¼à¤¨à¥‡ à¤•à¥€ à¤¤à¤¾à¤°à¥€à¤–" onRefresh={() => loadReferrals().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-card"><h3>à¤¸à¤­à¥€ Referral Partners ({referrals.length})</h3>
      {!referrals.length ? <p className="bmm-muted">Referral à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥‡à¥¤ Backend API à¤”à¤° Referral Partner à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤œà¤¾à¤à¤šà¥‡à¤‚à¥¤</p> :
        <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Referral Partner</th><th>Referral ID</th><th>à¤•à¥à¤² à¤œà¥à¤¡à¤¼à¥‡ à¤¯à¥‚à¤œà¤¼à¤°</th><th>à¤µà¤¿à¤µà¤°à¤£</th></tr></thead>
          <tbody>{referrals.map(item => {
            const id = item.id ?? item.user_id ?? item.userId;
            const code = item.referralCode ?? item.referral_code ?? item.referral_id ?? "â€”";
            const members = referralMembers[id] || [];
            const count = Number(item.referral_count ?? item.total_referred ?? item.member_count ?? members.length);
            return <React.Fragment key={id ?? code}>
              <tr><td><strong>{item.name || item.referrer_name || "â€”"}</strong><br/>{item.mobile || "â€”"}</td><td>{code}</td><td>{count}</td>
                <td><button className="bmm-btn bmm-btn-primary" disabled={!id || membersLoadingId === id} onClick={() => loadReferralMembers(item)}>{membersLoadingId === id ? "à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : expandedReferralId === id ? "à¤µà¤¿à¤µà¤°à¤£ à¤›à¤¿à¤ªà¤¾à¤à¤" : "à¤¯à¥‚à¤œà¤¼à¤° à¤¦à¥‡à¤–à¥‡à¤‚"}</button></td></tr>
              {expandedReferralId === id && <tr><td colSpan={4}><div style={{padding:"10px 0"}}><h3>Referral ID: {code} â€” à¤œà¥à¤¡à¤¼à¥‡ à¤¹à¥à¤ à¤¯à¥‚à¤œà¤¼à¤°</h3>
                {membersLoadingId === id ? <p className="bmm-muted">à¤¯à¥‚à¤œà¤¼à¤° à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</p> : !members.length ? <p className="bmm-muted">à¤‡à¤¸ Referral ID à¤¸à¥‡ à¤•à¥‹à¤ˆ à¤¯à¥‚à¤œà¤¼à¤° à¤¨à¤¹à¥€à¤‚ à¤œà¥à¤¡à¤¼à¤¾ à¤¹à¥ˆà¥¤</p> :
                  <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤¨à¤¾à¤®</th><th>à¤®à¥‹à¤¬à¤¾à¤‡à¤²</th><th>User ID</th><th>Role</th><th>à¤¸à¥à¤¥à¤¿à¤¤à¤¿</th><th>à¤œà¥à¤¡à¤¼à¤¨à¥‡ à¤•à¥€ à¤¤à¤¾à¤°à¥€à¤–</th></tr></thead>
                    <tbody>{members.map((p,i) => <tr key={p.id ?? p.user_id ?? p.userId ?? i}><td>{p.name || "â€”"}</td><td>{p.mobile || "â€”"}</td><td>{p.userId || p.user_id || "â€”"}</td><td>{p.role || "customer"}</td><td>{p.status || "â€”"}</td><td>{formatDate(p.created_at || p.createdAt)}</td></tr>)}</tbody>
                  </table></div>}</div></td></tr>}
            </React.Fragment>;
          })}</tbody></table></div>}
    </div>
  </>;

  const renderSettings = () => <><SectionTitle title="Settings" subtitle="Admin à¤”à¤° API à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿" onRefresh={loadDashboard} loading={loading}/><div className="bmm-card">
    <div className="bmm-setting-row"><ShieldCheck size={22}/><div><strong>Admin Session</strong><p>{user?.name || "Borewell Mitra Admin"}</p></div></div>
    <div className="bmm-setting-row"><Droplets size={22}/><div><strong>Backend API</strong><p>{API}</p></div></div>
    <p className="bmm-muted">à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¥‹ Frontend à¤®à¥‡à¤‚ à¤¨ à¤°à¤–à¥‡à¤‚à¥¤ Admin credentials à¤•à¥‡à¤µà¤² Backend à¤®à¥‡à¤‚ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¤–à¥‡à¤‚à¥¤</p>
  </div></>;

  const renderBlockBanners = () => <>
    <SectionTitle title="Block Banner Management" subtitle="à¤¹à¤° à¤œà¤¿à¤²à¥‡ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤²à¤— Banner à¤…à¤ªà¤²à¥‹à¤¡ à¤”à¤° à¤®à¥ˆà¤¨à¥‡à¤œ à¤•à¤°à¥‡à¤‚" onRefresh={loadBlockBanners} loading={bannerLoading}/>
    <div className="bmm-card">
      <h3><ImageIcon size={18} style={{verticalAlign:"middle",marginRight:8}}/> à¤¨à¤¯à¤¾ Block Banner à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚</h3>
      <div className="bmm-form-grid">
        <label>à¤œà¤¿à¤²à¤¾<select value={bannerDistrict} onChange={e=>{setBannerDistrict(e.target.value);setBannerBlock("");}}><option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>{[...DISTRICTS].sort((a,b)=>String(a).localeCompare(String(b),"hi")).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
        <label>à¤¬à¥à¤²à¥‰à¤•<select value={bannerBlock} onChange={e=>setBannerBlock(e.target.value)} disabled={!bannerDistrict}><option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>{getBlocksForDistrict(bannerDistrict).map(b=><option key={b} value={b}>{b}</option>)}</select></label>
        <label>Banner à¤‡à¤®à¥‡à¤œ (PNG/JPG/WEBP, à¤…à¤§à¤¿à¤•à¤¤à¤® 500 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerFile}/></label>
        <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" type="button" disabled={bannerLoading} onClick={saveBlockBanner}><UploadCloud size={16}/> {bannerLoading ? "à¤¸à¥‡à¤µ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : "Banner à¤¸à¥‡à¤µ à¤•à¤°à¥‡à¤‚"}</button><button className="bmm-btn bmm-btn-light" type="button" onClick={()=>{setBannerPreview("");setBannerDistrict("");setBannerBlock("");}}>Reset</button></div>
      </div>
      {bannerPreview && <div style={{marginTop:18}}><p className="bmm-muted">Preview</p><img src={bannerPreview} alt="Banner Preview" style={{width:"100%",maxWidth:650,maxHeight:220,objectFit:"contain",borderRadius:10,border:"1px solid #e3e8f0"}}/></div>}
    </div>
    <div className="bmm-card"><h3>à¤¸à¥‡à¤µ à¤•à¤¿à¤ à¤—à¤ Block Banners ({blockBanners.length})</h3>
      {bannerLoading && !blockBanners.length ? <p className="bmm-muted">à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...</p> : !blockBanners.length ? <p className="bmm-muted">à¤…à¤­à¥€ à¤•à¥‹à¤ˆ Block Banner à¤¸à¥‡à¤µ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> :
        <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤œà¤¿à¤²à¤¾</th><th>à¤¬à¥à¤²à¥‰à¤•</th><th>Banner</th><th>Action</th></tr></thead><tbody>{blockBanners.map(b=><tr key={b.id}><td>{b.district}</td><td>{b.block}</td><td>{(b.image_data || b.imageData || b.image_url || b.imageUrl) ? <img src={b.image_data || b.imageData || b.image_url || b.imageUrl} alt={`${b.block} Banner`} style={{width:180,maxHeight:65,objectFit:"cover",borderRadius:6}}/> : "â€”"}</td><td><button className="bmm-btn bmm-btn-danger" onClick={()=>deleteBlockBanner(b)}><Trash2 size={14}/> Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  </>;

  const renderExtraSection = (page) => {
    const sections = {
      customers: { title: "Customer Management", subtitle: "à¤—à¥à¤°à¤¾à¤¹à¤• à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£ à¤”à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§ Approval à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡", body: <>
        <div className="bmm-card"><h3>Pending Customer / User Approvals ({pendingUsers.length})</h3>
          {!pendingUsers.length ? <p className="bmm-muted">à¤•à¥‹à¤ˆ Pending Approval à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤¨à¤¾à¤®</th><th>à¤®à¥‹à¤¬à¤¾à¤‡à¤²</th><th>User ID</th><th>Role</th><th>Action</th></tr></thead><tbody>{pendingUsers.map(p => <tr key={getUserId(p)}><td>{p.name || "â€”"}</td><td>{p.mobile || "â€”"}</td><td>{p.userId || p.user_id || "â€”"}</td><td>{p.role || "customer"}</td><td><div className="bmm-actions"><button className="bmm-btn bmm-btn-success" onClick={() => updateUserStatus(p,"approved")}>Approve</button><button className="bmm-btn bmm-btn-danger" onClick={() => updateUserStatus(p,"rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}
        </div><p className="bmm-muted">à¤¨à¥‹à¤Ÿ: à¤®à¥Œà¤œà¥‚à¤¦à¤¾ Backend à¤•à¥‡à¤µà¤² Pending Users à¤•à¥€ à¤¸à¥‚à¤šà¥€ à¤¦à¥‡à¤¤à¤¾ à¤¹à¥ˆà¥¤ à¤¸à¤­à¥€ Customers à¤•à¥€ à¤ªà¥‚à¤°à¥€ à¤¸à¥‚à¤šà¥€ à¤”à¤° Profile Edit à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤²à¤— API à¤œà¥‹à¤¡à¤¼à¤¨à¤¾ à¤¬à¤¾à¤•à¥€ à¤¹à¥ˆà¥¤</p>
      </> },
      createAgent: { title: "Create Agent", subtitle: "Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¨à¤¯à¤¾ Agent à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£", body: <>
        {createdAgent && <div className="bmm-card" style={{border:"1px solid #a8e5bf",background:"#f0fff5"}}><h3>Agent à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¨ à¤—à¤¯à¤¾</h3><p><strong>Agent ID:</strong> {createdAgent.userId || "â€”"}</p><p><strong>à¤¨à¤¾à¤®:</strong> {createdAgent.name} Â· <strong>à¤®à¥‹à¤¬à¤¾à¤‡à¤²:</strong> {createdAgent.mobile}</p><p className="bmm-muted">à¤¯à¤¹ ID Agent à¤•à¥‹ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¥‚à¤ª à¤¸à¥‡ à¤¦à¥‡ à¤¦à¥‡à¤‚à¥¤</p><button className="bmm-btn bmm-btn-light" onClick={() => setCreatedAgent(null)}>à¤ à¥€à¤• à¤¹à¥ˆ</button></div>}
        <div className="bmm-card"><h3>à¤¨à¤¯à¤¾ Agent à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£</h3><p className="bmm-muted">Admin à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¬à¤¨à¤¾à¤¯à¤¾ à¤—à¤¯à¤¾ Agent à¤¤à¥à¤°à¤‚à¤¤ Approved à¤”à¤° Active à¤°à¤¹à¥‡à¤—à¤¾à¥¤ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ Agent à¤•à¥‹ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¤à¤°à¥€à¤•à¥‡ à¤¸à¥‡ à¤¦à¥‡à¤‚à¥¤</p>
          <form className="bmm-form-grid" onSubmit={createAgent}>
            <label>Agent à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®<input value={newAgentForm.name} onChange={e=>setNewAgentForm(p=>({...p,name:e.target.value}))} placeholder="à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®" required /></label>
            <label>Agency à¤•à¤¾ à¤¨à¤¾à¤®<input value={newAgentForm.agency_name} onChange={e=>setNewAgentForm(p=>({...p,agency_name:e.target.value}))} placeholder="Agency Name" required /></label>
            <label>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°<input type="tel" inputMode="numeric" maxLength={10} value={newAgentForm.mobile} onChange={e=>setNewAgentForm(p=>({...p,mobile:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤²" required /></label>
            <label>Login Password<input type="password" minLength={8} autoComplete="new-password" value={newAgentForm.password} onChange={e=>setNewAgentForm(p=>({...p,password:e.target.value}))} placeholder="à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤°" required /></label>
            <label>à¤œà¤¿à¤²à¤¾<select value={newAgentForm.district} onChange={e=>setNewAgentForm(p=>({...p,district:e.target.value,block:""}))} required><option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>{[...DISTRICTS].sort((a,b)=>String(a).localeCompare(String(b),"hi")).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            <label>à¤¬à¥à¤²à¥‰à¤• / à¤¤à¤¹à¤¸à¥€à¤²<select value={newAgentForm.block} onChange={e=>setNewAgentForm(p=>({...p,block:e.target.value}))} required disabled={!newAgentForm.district}><option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>{getBlocksForDistrict(newAgentForm.district).map(b=><option key={b} value={b}>{b}</option>)}</select></label>
            <label style={{gridColumn:"1/-1"}}>Office Address<textarea rows={3} value={newAgentForm.office_address} onChange={e=>setNewAgentForm(p=>({...p,office_address:e.target.value}))} placeholder="à¤à¤œà¥‡à¤‚à¤¸à¥€ / à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾" required /></label>
            <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" type="submit" disabled={loading}><Save size={16}/> {loading ? "Agent à¤¬à¤¨à¤¾à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ..." : "Agent Create à¤•à¤°à¥‡à¤‚"}</button><button className="bmm-btn bmm-btn-light" type="button" disabled={loading} onClick={()=>{setNewAgentForm(INITIAL_AGENT);setCreatedAgent(null);clearMessages();}}>Reset</button><button className="bmm-btn bmm-btn-light" type="button" onClick={()=>navigate("agents")}>Agent Management</button></div>
          </form>
        </div>
      </> },
      rules: { title: "Rules Management", subtitle: "à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤”à¤° Agent à¤•à¥‡ à¤¨à¤¿à¤¯à¤®", body: <div className="bmm-card"><h3>à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ Agent Rule</h3><p>à¤¨à¤¯à¤¾ Assigned Booking à¤®à¤¿à¤²à¤¨à¥‡ à¤•à¥‡ à¤¬à¤¾à¤¦ Agent à¤•à¥‹ <strong>24 à¤˜à¤‚à¤Ÿà¥‡</strong> à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤•à¤°à¤¨à¤¾ à¤¹à¥‹à¤—à¤¾à¥¤ à¤¸à¤®à¤¯ à¤ªà¥‚à¤°à¤¾ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° Booking Admin à¤•à¥‡ à¤ªà¤¾à¤¸ à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤à¤—à¥€à¥¤</p><p className="bmm-muted">à¤¨à¥‹à¤Ÿ: à¤†à¤ªà¤•à¥‡ Backend à¤®à¥‡à¤‚ Rules CRUD API à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ à¤¨à¤¿à¤¯à¤® à¤•à¥‹ Dashboard à¤¸à¥‡ Save/Edit à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ Backend API à¤”à¤° database migration à¤œà¥‹à¤¡à¤¼à¤¨à¤¾ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤</p></div> },
      banners: { title: "Banner Management", subtitle: "Home Page à¤•à¥‡ à¤ªà¥à¤°à¤šà¤¾à¤° à¤¬à¥ˆà¤¨à¤°", body: <div className="bmm-card"><h3>Banner Control</h3><p className="bmm-muted">Banner à¤œà¥‹à¤¡à¤¼à¤¨à¥‡, à¤¬à¤¦à¤²à¤¨à¥‡, à¤•à¥à¤°à¤® à¤¬à¤¦à¤²à¤¨à¥‡ à¤”à¤° à¤¹à¤Ÿà¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤­à¥€ Backend à¤®à¥‡à¤‚ Banner API / Storage à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ à¤‡à¤¸ à¤¸à¥‡à¤•à¥à¤¶à¤¨ à¤•à¤¾ UI/API integration à¤…à¤—à¤²à¤¾ à¤•à¤¾à¤® à¤°à¤¹à¥‡à¤—à¤¾à¥¤</p></div> },
      calculator: { title: "Calculator Management", subtitle: "Calculator à¤•à¥€ à¤¸à¥‡à¤µ à¤•à¥€ à¤—à¤ˆ à¤—à¤£à¤¨à¤¾à¤à¤", body: <div className="bmm-card"><h3>Calculator Records</h3><p className="bmm-muted">Customer Calculator à¤•à¥‡ Saved Records à¤”à¤° PDF History à¤¦à¤¿à¤–à¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ Backend à¤®à¥‡à¤‚ Admin Calculator Records API à¤œà¥‹à¤¡à¤¼à¤¨à¤¾ à¤¬à¤¾à¤•à¥€ à¤¹à¥ˆà¥¤</p></div> },
      reports: { title: "Reports & Accounts", subtitle: "Booking, Agent à¤”à¤° Commission à¤•à¥€ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ", body: <div className="bmm-card"><h3>à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤¸à¤¾à¤°à¤¾à¤‚à¤¶</h3><div className="bmm-stats-grid"><div className="bmm-stat"><div><p>Total Bookings</p><h2>{bookings.length}</h2></div></div><div className="bmm-stat"><div><p>Completed</p><h2>{bookings.filter(b => ["à¤ªà¥‚à¤°à¥à¤£","à¤•à¤¾à¤® à¤ªà¥‚à¤°à¤¾"].includes(b.status)).length}</h2></div></div><div className="bmm-stat"><div><p>Agents</p><h2>{agents.length}</h2></div></div><div className="bmm-stat"><div><p>Rates</p><h2>{rates.length}</h2></div></div></div><p className="bmm-muted">PDF / Excel Export à¤”à¤° à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• à¤†à¤¯-à¤µà¥à¤¯à¤¯ Ledger à¤•à¥‡ à¤²à¤¿à¤ Reports API à¤œà¥‹à¤¡à¤¼à¤¨à¤¾ à¤¬à¤¾à¤•à¥€ à¤¹à¥ˆà¥¤</p></div> },
      admins: { title: "Admin Security", subtitle: "Single Main Admin â€” à¤•à¥‡à¤µà¤² à¤à¤• Admin Account", body: <div className="bmm-card"><h3><ShieldCheck size={19}/> à¤•à¥‡à¤µà¤² à¤à¤• Main Admin</h3><p>à¤‡à¤¸ à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤®à¥‡à¤‚ à¤•à¥‡à¤µà¤² à¤à¤• Main Admin Account à¤°à¤¹à¥‡à¤—à¤¾à¥¤ à¤‰à¤¸à¥€ Admin à¤•à¥‡ à¤ªà¤¾à¤¸ Bookings, Agents, Customers, Rates, Commissions, Website à¤”à¤° à¤¸à¤­à¥€ Settings à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤…à¤§à¤¿à¤•à¤¾à¤° à¤¹à¥‹à¤—à¤¾à¥¤</p><ul className="bmm-security-list"><li>Sub-Admin Account à¤¬à¤¨à¤¾à¤¨à¥‡ à¤•à¥€ à¤¸à¥à¤µà¤¿à¤§à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹à¤—à¥€à¥¤</li><li>à¤¦à¥‚à¤¸à¤°à¤¾ Admin Account Register à¤¯à¤¾ Create à¤¨à¤¹à¥€à¤‚ à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤¸à¤•à¥‡à¤—à¤¾à¥¤</li><li>Admin Login à¤”à¤° Password Backend à¤ªà¤° à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¤–à¥‡ à¤œà¤¾à¤à¤à¤—à¥‡à¥¤</li><li>à¤®à¤¹à¤¤à¥à¤µà¤ªà¥‚à¤°à¥à¤£ à¤¬à¤¦à¤²à¤¾à¤µà¥‹à¤‚ à¤•à¤¾ Activity Log à¤°à¤–à¤¾ à¤œà¤¾à¤à¤—à¤¾à¥¤</li></ul><p className="bmm-muted">à¤¯à¤¹ Dashboard à¤®à¥‡à¤‚ à¤¤à¤¯ à¤•à¥€ à¤—à¤ˆ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¾ à¤¹à¥ˆà¥¤ Backend à¤®à¥‡à¤‚ à¤­à¥€ à¤à¤• à¤¹à¥€ Admin à¤•à¥‹ enforce à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ Admin registration/role APIs à¤•à¥€ à¤œà¤¾à¤à¤š à¤œà¤°à¥‚à¤°à¥€ à¤¹à¥ˆà¥¤</p></div> },
      notifications: { title: "Notifications", subtitle: "Backend à¤¸à¥‡ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ Admin Alerts", body: <div className="bmm-card"><h3>Notifications ({adminNotifications.length})</h3>{!adminNotifications.length ? <p className="bmm-muted">à¤•à¥‹à¤ˆ Notification à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>à¤¶à¥€à¤°à¥à¤·à¤•</th><th>à¤µà¤¿à¤µà¤°à¤£</th><th>à¤¤à¤¾à¤°à¥€à¤–</th><th>à¤¸à¥à¤¥à¤¿à¤¤à¤¿</th><th>Action</th></tr></thead><tbody>{adminNotifications.map(n => <tr key={n.id}><td>{n.title || n.type || "Notification"}</td><td>{n.message || "â€”"}</td><td>{formatDate(n.created_at)}</td><td>{Number(n.is_read) ? "à¤ªà¤¢à¤¼à¥€ à¤—à¤ˆ" : "à¤¨à¤ˆ"}</td><td>{!Number(n.is_read) && <button className="bmm-btn bmm-btn-primary" onClick={async()=>{try{await apiRequest(`/admin/notifications/${n.id}/read`,{method:"PATCH"},user);await loadAdminNotifications();flash("Notification à¤ªà¤¢à¤¼à¥€ à¤—à¤ˆà¥¤")}catch(e){fail(getError(e))}}}>Read</button>}</td></tr>)}</tbody></table></div>}</div> },
      complaints: { title: "Complaints", subtitle: "Agent à¤”à¤° Customer à¤•à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤à¥‡à¤‚", body: <div className="bmm-card"><h3>Complaint Management</h3><p className="bmm-muted">Agent Dashboard à¤®à¥‡à¤‚ Complaint à¤¸à¥à¤µà¤¿à¤§à¤¾ à¤¹à¥ˆ, à¤²à¥‡à¤•à¤¿à¤¨ Admin à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤­à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤à¥‡à¤‚ à¤¦à¥‡à¤–à¤¨à¥‡ à¤”à¤° Status à¤¬à¤¦à¤²à¤¨à¥‡ à¤•à¤¾ API à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ Backend à¤®à¥‡à¤‚ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤</p></div> },
      feedback: { title: "Feedback & Ratings", subtitle: "Customer Feedback à¤”à¤° 5-Star Rating", body: <div className="bmm-card"><h3>Customer Feedback</h3><p className="bmm-muted">Feedback à¤”à¤° Rating à¤•à¥‹ à¤¸à¥‡à¤µ/Approve/Reply à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ Backend à¤®à¥‡à¤‚ à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ table à¤”à¤° Admin API à¤œà¥‹à¤¡à¤¼à¤¨à¤¾ à¤¬à¤¾à¤•à¥€ à¤¹à¥ˆà¥¤</p></div> },
    };
    const section = sections[page];
    if (!section) return null;
    return <><SectionTitle title={section.title} subtitle={section.subtitle} onRefresh={() => page === "customers" ? loadPendingUsers().catch(e=>fail(getError(e))) : page === "notifications" ? loadAdminNotifications().catch(e=>fail(getError(e))) : loadDashboard()} loading={loading}/>{section.body}</>;
  };

  return <div className="bmm-admin">
    <style>{`
      .bmm-admin{min-height:100vh;background:#f3f6fb;color:#172033;font-family:Inter,Arial,sans-serif}.bmm-layout{display:flex;min-height:100vh}
      .bmm-sidebar{width:260px;flex-shrink:0;background:#101b34;color:#fff;padding:22px 14px;display:flex;flex-direction:column}.bmm-brand{display:flex;gap:12px;align-items:center;padding:8px 10px 24px;border-bottom:1px solid #293650;margin-bottom:18px}
      .bmm-brand-icon{background:#1677ff;border-radius:12px;width:43px;height:43px;display:grid;place-items:center}.bmm-brand h2{font-size:16px;margin:0 0 4px}.bmm-brand p{font-size:12px;color:#aebbd2;margin:0}
      .bmm-nav{display:grid;gap:6px;overflow-y:auto;max-height:calc(100vh - 190px);padding-right:3px}.bmm-nav button{display:flex;align-items:center;gap:12px;border:0;background:transparent;color:#c4cde0;text-align:left;padding:12px;border-radius:9px;cursor:pointer;font-size:13px}.bmm-nav button:hover,.bmm-nav button.active{background:#1d3154;color:#fff}.bmm-nav button.active{box-shadow:inset 3px 0 #45a1ff}
      .bmm-sidebar-bottom{margin-top:auto;display:grid;gap:8px;padding-top:20px}.bmm-sidebar-bottom button{display:flex;align-items:center;gap:10px;background:transparent;color:#d6deed;border:1px solid #34435f;padding:11px;border-radius:8px;cursor:pointer}
      .bmm-main{flex:1;min-width:0;padding:28px}.bmm-topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:12px}.bmm-topbar h1{font-size:23px;margin:0}.bmm-topbar p{font-size:13px;color:#78859b;margin:5px 0 0}
      .bmm-icon-btn{border:1px solid #dce3ee;background:#fff;border-radius:9px;padding:9px;display:none;cursor:pointer}.bmm-section-title{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:22px}.bmm-section-title h2{font-size:22px;margin:0 0 6px}.bmm-section-title p{margin:0;color:#7a879b;font-size:13px}
      .bmm-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px}.bmm-stat,.bmm-card{background:#fff;border:1px solid #e6ebf3;border-radius:14px;box-shadow:0 3px 14px #17203308}.bmm-stat{display:flex;gap:14px;align-items:center;padding:20px}
      .bmm-stat-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:12px}.bmm-stat-icon.blue{background:#e6f0ff;color:#1769d2}.bmm-stat-icon.orange{background:#fff0dc;color:#b96900}.bmm-stat-icon.purple{background:#f0eaff;color:#7542d8}.bmm-stat-icon.green{background:#e1f8eb;color:#14834a}
      .bmm-stat p{font-size:12px;color:#77849a;margin:0 0 5px}.bmm-stat h2{font-size:24px;margin:0}.bmm-card{padding:20px;margin-bottom:20px;min-width:0}.bmm-card h3{font-size:16px;margin:0 0 18px}.bmm-quick-actions{display:flex;flex-wrap:wrap;gap:10px}
      .bmm-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:8px;padding:10px 13px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}.bmm-btn:disabled{opacity:.55;cursor:not-allowed}.bmm-btn-primary{background:#1769e0;color:#fff}.bmm-btn-success{background:#e2f8ea;color:#087a3f}.bmm-btn-danger{background:#ffebeb;color:#b42318}.bmm-btn-light{background:#edf2f8;color:#31425b}
      .bmm-toolbar{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e0e7f1;border-radius:10px;padding:0 13px;margin-bottom:16px;max-width:460px}.bmm-toolbar input{width:100%;border:0;outline:0;padding:13px 0;background:transparent;font-size:13px}
      .bmm-table-wrap{width:100%;overflow-x:auto}.bmm-table{border-collapse:collapse;width:100%;font-size:12px;min-width:700px}.bmm-table th{text-align:left;background:#f6f8fc;color:#62718a;font-weight:700}.bmm-table td,.bmm-table th{padding:13px 12px;border-bottom:1px solid #edf0f5;vertical-align:middle;line-height:1.6}.bmm-table td{color:#354158}
      .bmm-table select,.bmm-form-grid input,.bmm-form-grid select{border:1px solid #dce4ef;border-radius:8px;padding:9px;background:#fff;max-width:190px;font-size:12px;color:#243047}.bmm-actions{display:flex;gap:6px;flex-wrap:wrap}.bmm-badge{display:inline-block;border-radius:30px;background:#e9f2ff;color:#155bc0;padding:5px 9px;font-size:11px}.bmm-muted{color:#7a879b;font-size:13px;line-height:1.7}
      .bmm-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.bmm-form-grid label{display:grid;gap:7px;font-size:12px;font-weight:600;color:#536179}.bmm-form-grid input,.bmm-form-grid select{max-width:none;width:100%;box-sizing:border-box}.bmm-form-actions{grid-column:1/-1;display:flex;gap:10px}
      .bmm-alert{border-radius:9px;padding:12px 14px;margin-bottom:18px;font-size:13px;line-height:1.6}.bmm-alert.error{background:#fff0f0;border:1px solid #ffd4d4;color:#a11b1b}.bmm-alert.success{background:#e9f9ef;border:1px solid #c4efd3;color:#087a3f}.bmm-setting-row{display:flex;align-items:center;gap:13px;padding:15px 0;border-bottom:1px solid #edf0f5}.bmm-setting-row p{margin:5px 0 0;color:#78859b;font-size:13px}
      .bmm-analytics-heading{margin:26px 0 14px}.bmm-analytics-heading h2{display:flex;align-items:center;gap:8px}.bmm-analytics-controls{display:flex;gap:8px;align-items:center}.bmm-analytics-controls select{border:1px solid #dce4ef;border-radius:8px;padding:9px;background:#fff;color:#243047;font-size:12px}.bmm-analytics-unavailable{border-color:#f2d49a;background:#fffaf0}.bmm-analytics-grid{margin-bottom:16px}.bmm-analytics-columns{display:grid;grid-template-columns:1.2fr 1fr;gap:16px}.bmm-analytics-columns .bmm-card{min-width:0}.bmm-bars{height:190px;display:flex;align-items:flex-end;gap:10px;overflow-x:auto;padding:8px 2px 0}.bmm-bar-item{min-width:30px;flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px}.bmm-bar-value{font-size:10px;color:#64748b}.bmm-bar-track{height:130px;width:100%;max-width:34px;background:#edf2f8;border-radius:7px 7px 3px 3px;display:flex;align-items:flex-end;overflow:hidden}.bmm-bar-fill{width:100%;background:linear-gradient(180deg,#48a3ff,#1769e0);border-radius:7px 7px 0 0}.bmm-bar-item small{font-size:9px;color:#718096;white-space:nowrap}.bmm-device-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.bmm-device-list>div{display:flex;justify-content:space-between;gap:10px;background:#f6f8fc;border-radius:8px;padding:12px;font-size:12px}.bmm-security-list{color:#354158;font-size:13px;line-height:2;padding-left:20px}
      .bmm-spin{animation:bmmspin 1s linear infinite}@keyframes bmmspin{to{transform:rotate(360deg)}}@media(max-width:1050px){.bmm-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bmm-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.bmm-analytics-heading{align-items:flex-start;flex-direction:column}.bmm-analytics-controls{width:100%;flex-wrap:wrap}.bmm-analytics-columns{grid-template-columns:1fr}.bmm-device-list{grid-template-columns:1fr}.bmm-sidebar{position:fixed;z-index:50;top:0;bottom:0;left:0;transform:translateX(-100%);transition:transform .2s;width:260px}.bmm-sidebar.open{transform:translateX(0)}.bmm-main{padding:16px}.bmm-icon-btn{display:inline-flex}.bmm-topbar h1{font-size:18px}.bmm-stats-grid{grid-template-columns:1fr 1fr;gap:10px}.bmm-stat{padding:13px;gap:9px}.bmm-stat-icon{width:37px;height:37px}.bmm-stat h2{font-size:20px}.bmm-stat p{font-size:11px}.bmm-section-title h2{font-size:19px}.bmm-section-title p{font-size:12px}.bmm-form-grid{grid-template-columns:1fr}.bmm-form-actions{grid-column:auto}}
      @media(max-width:420px){.bmm-stats-grid{grid-template-columns:1fr}.bmm-section-title{align-items:flex-start}.bmm-section-title .bmm-btn{padding:9px}.bmm-quick-actions .bmm-btn{width:100%}}
    `}</style>
    <div className="bmm-layout">
      <aside className={`bmm-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="bmm-brand"><div className="bmm-brand-icon"><Droplets size={25}/></div><div><h2>Borewells Mitra</h2><p>Admin Control Panel</p></div></div>
        <nav className="bmm-nav">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={18}/>{item.label}</button>; })}</nav>
        <div className="bmm-sidebar-bottom"><button onClick={onBack}><ArrowLeft size={17}/> à¤µà¥‡à¤¬à¤¸à¤¾à¤‡à¤Ÿ à¤ªà¤° à¤µà¤¾à¤ªà¤¸</button><button onClick={onLogout}><LogOut size={17}/> Logout</button></div>
      </aside>
      <main className="bmm-main">
        <header className="bmm-topbar"><div style={{display:"flex",alignItems:"center",gap:12}}><button className="bmm-icon-btn" onClick={() => setSidebarOpen(v => !v)}>{sidebarOpen ? <X size={19}/> : <Menu size={19}/>}</button><div><h1>Borewells Mitra</h1><p>Welcome, {user?.name || "Admin"}</p></div></div>
          <button className="bmm-btn bmm-btn-light" onClick={loadDashboard} disabled={loading}><RefreshCw size={16} className={loading ? "bmm-spin" : ""}/> Refresh All</button></header>
        {error && <div className="bmm-alert error"><AlertCircle size={17} style={{verticalAlign:"middle",marginRight:7}}/>{error}</div>}
        {notice && <div className="bmm-alert success"><CheckCircle2 size={17} style={{verticalAlign:"middle",marginRight:7}}/>{notice}</div>}
        {activePage === "dashboard" && renderDashboard()}{activePage === "customers" && renderExtraSection("customers")}
        {activePage === "agents" && renderAgents()}{activePage === "createAgent" && renderExtraSection("createAgent")}
        {activePage === "bookings" && renderBookings()}{activePage === "rates" && renderRates()}
        {activePage === "rules" && renderExtraSection("rules")}{activePage === "banners" && renderExtraSection("banners")}
        {activePage === "referrals" && renderReferrals()}{activePage === "calculator" && renderExtraSection("calculator")}
        {activePage === "reports" && renderExtraSection("reports")}{activePage === "admins" && renderExtraSection("admins")}
        {activePage === "settings" && renderSettings()}{activePage === "notifications" && renderExtraSection("notifications")}
        {activePage === "complaints" && renderExtraSection("complaints")}{activePage === "feedback" && renderExtraSection("feedback")}
        {activePage === "blockBanners" && renderBlockBanners()}
        <footer style={{textAlign:"center",color:"#98a3b5",fontSize:11,padding:"20px 0 5px"}}>Â© {new Date().getFullYear()} Borewells Mitra Â· Admin Panel</footer>
      </main>
    </div>
  </div>;
}
