import React, { useCallback, useEffect, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";
import {
  LayoutDashboard, Users, BadgeCheck, IndianRupee, ClipboardList, Settings,
  LogOut, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Menu, X, ShieldCheck,
  Clock3, AlertCircle, Droplets, UserCheck, Handshake, Save, Search, Power, Trash2, RotateCcw,
  Eye, BarChart3, MonitorSmartphone, Activity, Image as ImageIcon, UploadCloud
} from "lucide-react";

const API = "https://borewells-mitra-api.onrender.com/api";
const BOOKING_STATUSES = ["नई बुकिंग", "स्वीकृत", "कार्य प्रगति पर", "पूर्ण", "रद्द"];
const INITIAL_RATE = { district: "", block: "", service: "", rate: "" };
const INITIAL_SERVICE = { name: "", unit: "प्रति फुट", customUnit: "" };
const SERVICE_UNITS = ["प्रति फुट", "Feet", "Meter", "Nos", "Job", "Per Unit", "Kg", "Hour", "Day"];
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
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Server से सही JSON उत्तर नहीं मिला।"); }
  if (!response.ok || data.success === false) throw new Error(`${data.message || `Request असफल (${response.status})`}${data.path ? ` — ${data.path}` : ""}`);
  return data;
}
const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const getError = error => error?.message || "कुछ गलत हुआ। कृपया दोबारा प्रयास करें।";
const getUserId = person => person?.id ?? person?.user_id ?? person?.userId;
const getBookingId = booking => booking?.id ?? booking?.booking_id;
function formatDate(value) {
  if (!value) return "—";
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
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE);
  const [editingServiceId, setEditingServiceId] = useState(null);
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
  const loadServices = useCallback(async () => {
    const data = await apiRequest("/admin/services", {}, user);
    setServices((Array.isArray(data) ? data : data.services || []).sort((a, b) => Number(a.id) - Number(b.id)));
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
    const results = await Promise.allSettled([loadPendingUsers(), loadBookings(), loadRates(), loadServices(), loadReferrals()]);
    const failures = results.filter(r => r.status === "rejected").map(r => getError(r.reason));
    if (failures.length) fail("कुछ जानकारी लोड नहीं हुई: " + failures.join(" | "));
    setLoading(false);
  }, [loadPendingUsers, loadBookings, loadRates, loadServices, loadReferrals]);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => setStats({
    users: agents.length + pendingUsers.length, pending: pendingUsers.length, bookings: bookings.length,
    completed: bookings.filter(b => b.status === "पूर्ण" || b.status === "काम पूरा").length
  }), [agents, pendingUsers, bookings]);

  const updateUserStatus = async (person, status) => {
    const id = getUserId(person); if (!id) return fail("User ID नहीं मिली।");
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, user);
      flash(status === "approved" ? "यूज़र स्वीकृत हो गया।" : "यूज़र की स्थिति अपडेट हो गई।"); await loadPendingUsers();
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
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return fail("केवल PNG, JPG या WEBP इमेज चुनें।");
    if (file.size > 500 * 1024) return fail("इमेज 500 KB से छोटी होनी चाहिए।");
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  const saveBlockBanner = async () => {
    if (!bannerDistrict || !bannerBlock) return fail("जिला और ब्लॉक चुनें।");
    if (!bannerPreview) return fail("पहले Banner इमेज चुनें।");
    setBannerLoading(true); clearMessages();
    try {
      await apiRequest("/admin/block-banners", { method: "POST", body: JSON.stringify({ district: bannerDistrict, block: bannerBlock, imageData: bannerPreview }) }, user);
      flash("इस ब्लॉक का Banner सेव हो गया।");
      setBannerPreview("");
      await loadBlockBanners();
    } catch (e) { fail(getError(e)); }
    finally { setBannerLoading(false); }
  };
  const deleteBlockBanner = async banner => {
    if (!window.confirm(`${banner.district} - ${banner.block} का Banner हटाएँ?`)) return;
    setBannerLoading(true);
    try {
      await apiRequest(`/admin/block-banners/${banner.id}`, { method: "DELETE" }, user);
      flash("Block Banner हटा दिया गया।");
      await loadBlockBanners();
    } catch (e) { fail(getError(e)); }
    finally { setBannerLoading(false); }
  };

  // Backend में booking assignment के लिए अलग assign / unassign routes हैं।
  const updateBookingAssignment = async (booking, agentId) => {
    const id = getBookingId(booking);
    if (!id) return fail("Booking ID नहीं मिली।");
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
      flash(agentId ? "Agent बुकिंग पर नियुक्त हो गया।" : "Booking से Agent हटा दिया गया।");
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
      return fail("कृपया सभी फ़ील्ड भरें।");
    }
    if (!/^\d{10}$/.test(payload.mobile)) return fail("10 अंकों का सही मोबाइल नंबर दर्ज करें।");
    if (payload.password.length < 8) return fail("पासवर्ड कम से कम 8 अक्षर का होना चाहिए।");
    setLoading(true);
    try {
      const data = await apiRequest("/admin/agents", { method: "POST", body: JSON.stringify(payload) }, user);
      const result = data.agent || data.user || data;
      setCreatedAgent({ userId: data.userId || result.userId || result.user_id, name: result.name || payload.name, mobile: result.mobile || payload.mobile });
      setNewAgentForm(INITIAL_AGENT);
      flash(data.message || "नया Agent सफलतापूर्वक बनाया गया।");
      await loadBookings();
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const resetRateForm = () => { setRateForm(INITIAL_RATE); setEditingRateId(null); };
  const resetServiceForm = () => { setServiceForm(INITIAL_SERVICE); setEditingServiceId(null); };
  const saveService = async event => {
    event.preventDefault(); clearMessages();
    const unit = serviceForm.unit === "__custom__" ? serviceForm.customUnit.trim() : serviceForm.unit.trim();
    const payload = { name: serviceForm.name.trim(), unit };
    if (!payload.name || !payload.unit) return fail("Service का नाम और Unit भरना आवश्यक है।");
    setLoading(true);
    try {
      if (editingServiceId) {
        await apiRequest(`/admin/services/${editingServiceId}`, { method: "PATCH", body: JSON.stringify(payload) }, user);
        flash("Service अपडेट हो गई और पुराने जुड़े Rates सुरक्षित रखे गए।");
      } else {
        await apiRequest("/admin/services", { method: "POST", body: JSON.stringify(payload) }, user);
        flash("नई Service जोड़ दी गई।");
      }
      resetServiceForm(); await loadServices();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const editService = service => {
    const knownUnit = SERVICE_UNITS.includes(service.unit);
    setEditingServiceId(service.id);
    setServiceForm({ name: service.name || "", unit: knownUnit ? service.unit : "__custom__", customUnit: knownUnit ? "" : (service.unit || "") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleService = async service => {
    const active = !(Number(service.active) === 1 || service.active === true);
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/services/${service.id}`, { method: "PATCH", body: JSON.stringify({ active }) }, user);
      flash(active ? "Service Active कर दी गई।" : "Service Inactive कर दी गई। पुराने Rates सुरक्षित हैं।");
      await loadServices();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const deleteService = async service => {
    if (!window.confirm(`क्या आप “${service.name}” Service हटाना चाहते हैं? जिन Services के Rates/Requests मौजूद हैं, Backend उन्हें हटाने से रोकेगा।`)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/services/${service.id}`, { method: "DELETE" }, user);
      flash("Service हटा दी गई।"); await loadServices();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const saveRate = async event => {
    event.preventDefault(); clearMessages();
    const payload = { district: rateForm.district.trim(), block: rateForm.block.trim(), service: rateForm.service.trim(), rate: Number(rateForm.rate) };
    if (!payload.district || !payload.block || !payload.service || rateForm.rate === "" || !Number.isFinite(payload.rate) || payload.rate < 0) {
      return fail("जिला, ब्लॉक, Service और सही Rate भरना आवश्यक है।");
    }
    setLoading(true);
    try {
      if (editingRateId) {
        await apiRequest(`/admin/rates/${editingRateId}`, { method: "PUT", body: JSON.stringify(payload) }, user);
        flash("Block-wise Rate अपडेट हो गया।");
      } else {
        await apiRequest("/admin/rates", { method: "POST", body: JSON.stringify(payload) }, user);
        flash("Block-wise Rate सेव हो गया।");
      }
      resetRateForm(); await loadRates();
    } catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };
  const editRate = rate => {
    setEditingRateId(rate.id ?? rate.rate_id);
    setRateForm({ district: rate.district || "", block: rate.block || "", service: rate.service || rate.service_name || "", rate: String(rate.rate ?? "") });
    setActivePage("rates"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteRate = async rate => {
    const id = rate.id ?? rate.rate_id; if (!id) return fail("Rate ID नहीं मिली।");
    if (!window.confirm("क्या आप यह Block-wise Rate हटाना चाहते हैं?")) return;
    setLoading(true); clearMessages();
    try { await apiRequest(`/admin/rates/${id}`, { method: "DELETE" }, user); flash("Rate हटा दिया गया।"); await loadRates(); }
    catch (e) { fail(getError(e)); } finally { setLoading(false); }
  };

  // Referral partner की ID से जुड़े सभी यूज़र लोड करें
  const loadReferralMembers = async referral => {
    const id = referral.id ?? referral.user_id ?? referral.userId;
    if (!id) return fail("Referral Partner की User ID नहीं मिली।");
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
    if (page === "rates") { loadRates().catch(e => fail(getError(e))); loadServices().catch(e => fail(getError(e))); }
    if (page === "referrals") loadReferrals().catch(e => fail(getError(e)));
    if (page === "blockBanners") loadBlockBanners();
  };
const saveAgentDetails = async event => {
  event.preventDefault();

  if (!selectedAgent?.id) {
    return fail("Agent ID नहीं मिली।");
  }

  const payload = {
    name: (agentForm.name || "").trim(),
    agencyName: (agentForm.agency_name || "").trim(),
    district: (agentForm.district || "").trim(),
    block: (agentForm.block || "").trim()
  };

  if (!payload.name || !payload.district || !payload.block) {
    return fail("Agent का नाम, जिला और ब्लॉक भरना आवश्यक है।");
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

    flash("Agent की जानकारी अपडेट हो गई।");
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

  // Agent की सूची को सामान्य या archived mode में फिर से लोड करें।
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
    if (!id) return fail("Agent ID नहीं मिली।");
    const nextActive = !isAgentActive(agent);
    const message = nextActive ? "क्या इस Agent को Active करना चाहते हैं?" : "क्या इस Agent को Inactive करना चाहते हैं?";
    if (!window.confirm(message)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextActive })
      }, user);
      flash(nextActive ? "Agent Active कर दिया गया।" : "Agent Inactive कर दिया गया।");
      await refreshAgentList(showArchivedAgents);
      if (selectedAgent && String(getAgentRecordId(selectedAgent)) === String(id)) {
        setSelectedAgent(prev => ({ ...prev, is_active: nextActive ? 1 : 0 }));
      }
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const archiveAgent = async agent => {
    const id = getAgentRecordId(agent);
    if (!id) return fail("Agent ID नहीं मिली।");
    if (!window.confirm(`${agent.name || "इस Agent"} को सूची से हटाना चाहते हैं? इसे बाद में Restore किया जा सकेगा।`)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}`, { method: "DELETE" }, user);
      flash("Agent Archive कर दिया गया। Restore विकल्प से वापस ला सकते हैं।");
      if (selectedAgent && String(getAgentRecordId(selectedAgent)) === String(id)) {
        setSelectedAgent(null); setShowAgentBookings(false); setAgentBookings([]);
      }
      await refreshAgentList(showArchivedAgents);
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const restoreAgent = async agent => {
    const id = getAgentRecordId(agent);
    if (!id) return fail("Agent ID नहीं मिली।");
    if (!window.confirm(`${agent.name || "इस Agent"} को Restore करना चाहते हैं?`)) return;
    setLoading(true); clearMessages();
    try {
      await apiRequest(`/admin/agents/${id}/restore`, { method: "PATCH" }, user);
      flash("Agent Restore हो गया।");
      await refreshAgentList(showArchivedAgents);
    } catch (e) { fail(getError(e)); }
    finally { setLoading(false); }
  };

  const renderDashboard = () => <>
    <SectionTitle title="Admin Dashboard" subtitle="Borewells Mitra — सिस्टम की मुख्य जानकारी" onRefresh={loadDashboard} loading={loading}/>
    <div className="bmm-stats-grid">
      <StatCard title="कुल यूज़र" value={stats.users} icon={Users} color="blue"/><StatCard title="Approval Pending" value={stats.pending} icon={Clock3} color="orange"/>
      <StatCard title="कुल Booking" value={stats.bookings} icon={ClipboardList} color="purple"/><StatCard title="पूरी हुई Booking" value={stats.completed} icon={CheckCircle2} color="green"/>
    </div>
    <div className="bmm-section-title bmm-analytics-heading"><div><h2><Eye size={20}/> Visitor Analytics</h2><p>वेबसाइट पर आने वाले वास्तविक Visitors और Page Views</p></div><div className="bmm-analytics-controls"><select value={analyticsRange} onChange={e => setAnalyticsRange(e.target.value)}><option value="7d">पिछले 7 दिन</option><option value="30d">पिछले 30 दिन</option><option value="90d">पिछले 90 दिन</option><option value="all">शुरू से अब तक</option></select><button className="bmm-btn bmm-btn-light" onClick={() => loadAnalytics()} disabled={analyticsLoading}><RefreshCw size={15} className={analyticsLoading ? "bmm-spin" : ""}/> Refresh</button></div></div>
    {analyticsError ? <div className="bmm-card bmm-analytics-unavailable"><strong>Analytics Tracking API अभी उपलब्ध नहीं है।</strong><p className="bmm-muted">{analyticsError} वास्तविक Visitor गिनने के लिए Backend में tracking API और वेबसाइट के सभी pages पर tracking जोड़नी होगी।</p></div> : <><div className="bmm-stats-grid bmm-analytics-grid"><StatCard title="कुल Visitors" value={analytics?.totalVisitors ?? "—"} icon={Users} color="blue"/><StatCard title="कुल Page Views" value={analytics?.totalPageViews ?? "—"} icon={Eye} color="purple"/><StatCard title="आज के Visitors" value={analytics?.todayVisitors ?? "—"} icon={BarChart3} color="green"/><StatCard title="अभी Online" value={analytics?.onlineVisitors ?? "—"} icon={Activity} color="orange"/></div><div className="bmm-analytics-columns"><div className="bmm-card"><h3>दैनिक Visitors</h3>{!analytics?.daily?.length ? <p className="bmm-muted">अभी दैनिक Visitor रिपोर्ट उपलब्ध नहीं है।</p> : <div className="bmm-bars">{analytics.daily.map((day,i) => { const count = Number(day.visitors ?? day.count ?? 0); const max = Math.max(1,...analytics.daily.map(x => Number(x.visitors ?? x.count ?? 0))); return <div className="bmm-bar-item" key={day.date || i}><div className="bmm-bar-value">{count}</div><div className="bmm-bar-track"><div className="bmm-bar-fill" style={{height:`${Math.max(4,(count/max)*100)}%`}}/></div><small>{day.label || day.date || "—"}</small></div>; })}</div>}</div><div className="bmm-card"><h3>सबसे ज्यादा देखे गए Pages</h3>{!analytics?.topPages?.length ? <p className="bmm-muted">Page रिपोर्ट उपलब्ध नहीं है।</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>{analytics.topPages.map((page,i)=><tr key={page.path || page.url || i}><td>{page.title || page.path || page.url || "—"}</td><td>{Number(page.views ?? page.pageViews ?? page.page_views ?? 0).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>}</div></div><div className="bmm-card"><h3><MonitorSmartphone size={17}/> Device Breakdown</h3>{!analytics?.devices?.length ? <p className="bmm-muted">Device report उपलब्ध नहीं है।</p> : <div className="bmm-device-list">{analytics.devices.map((device,i)=><div key={device.device || device.name || i}><span>{device.device || device.name || "Other"}</span><strong>{Number(device.visitors ?? device.count ?? 0).toLocaleString("en-IN")}</strong></div>)}</div>}</div></>}
    <div className="bmm-card"><h3>Quick Actions</h3><div className="bmm-quick-actions">
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("bookings")}><ClipboardList size={17}/> Bookings देखें</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("approvals")}><BadgeCheck size={17}/> User Approval</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("rates")}><IndianRupee size={17}/> Block Rates</button>
      <button className="bmm-btn bmm-btn-primary" onClick={() => navigate("referrals")}><Handshake size={17}/> Referrals</button>
    </div></div>
    <div className="bmm-card"><h3>हाल की Bookings</h3>{!bookings.length ? <p className="bmm-muted">अभी कोई Booking उपलब्ध नहीं है।</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Booking ID</th><th>ग्राहक</th><th>क्षेत्र</th><th>सेवा</th><th>Status</th></tr></thead>
        <tbody>{bookings.slice(0,5).map(b => <tr key={getBookingId(b)}><td>#{getBookingId(b)}</td><td>{b.name}<br/>{b.mobile}</td><td>{b.district} / {b.block}</td><td>{b.service}</td><td><span className="bmm-badge">{b.status}</span></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderApprovals = () => <>
    <SectionTitle title="User Approval" subtitle="नए यूज़र की जाँच करके स्वीकृत करें" onRefresh={() => loadPendingUsers().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-toolbar"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="नाम, मोबाइल या User ID खोजें"/></div>
    <div className="bmm-card">{!filteredUsers.length ? <p className="bmm-muted">कोई Pending User नहीं मिला।</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>यूज़र</th><th>User ID</th><th>Role</th><th>स्थिति</th><th>Action</th></tr></thead>
        <tbody>{filteredUsers.map(p => <tr key={getUserId(p)}><td>{p.name}<br/>{p.mobile}</td><td>{p.userId || p.user_id || "—"}</td><td>{p.role || "customer"}</td><td>{p.status || "pending"}</td>
          <td><div className="bmm-actions"><button className="bmm-btn bmm-btn-success" disabled={loading} onClick={() => updateUserStatus(p,"approved")}><CheckCircle2 size={15}/> Approve</button>
          <button className="bmm-btn bmm-btn-danger" disabled={loading} onClick={() => updateUserStatus(p,"rejected")}><XCircle size={15}/> Reject</button></div></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderBookings = () => <>
    <SectionTitle title="Booking Management" subtitle="Booking देखें, एजेंट चुनें और काम की स्थिति अपडेट करें" onRefresh={() => loadBookings().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-toolbar"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ग्राहक, मोबाइल, जिला या Booking खोजें"/></div>
    <div className="bmm-card">{!filteredBookings.length ? <p className="bmm-muted">कोई Booking नहीं मिली।</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Booking</th><th>ग्राहक / स्थान</th><th>सेवा</th><th>Agent Assign</th><th>Status</th></tr></thead>
        <tbody>{filteredBookings.map(b => <tr key={getBookingId(b)}><td><strong>#{getBookingId(b)}</strong><br/><small>{b.created_at || ""}</small></td>
          <td>{b.name}<br/>{b.mobile}<br/><small>{[b.district,b.block,b.village].filter(Boolean).join(" / ")}</small></td><td>{b.service || "—"}</td>
          <td><select value={b.assigned_agent_id ?? ""} onChange={e => updateBookingAssignment(b, e.target.value)} disabled={loading}>
            <option value="">Agent चुनें / हटाएँ</option>{agents.filter(a => a.status === "approved" && (a.is_active === 1 || a.is_active === true || a.is_active == null) && !a.deleted_at).map(a => <option key={a.id} value={a.id}>{a.name} — {a.mobile}</option>)}</select></td>
          <td><span className="bmm-badge">{b.status || "नई बुकिंग"}</span></td></tr>)}</tbody>
      </table></div>}</div>
  </>;

  const renderRates = () => <>
    <SectionTitle title="Rate & Service Management" subtitle="पहले Service जोड़ें, फिर हर District और Block के लिए अलग Rate सेट करें" onRefresh={() => Promise.all([loadServices(), loadRates()]).catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-card">
      <h3>{editingServiceId ? "Service में बदलाव करें" : "Add Service / नई Service जोड़ें"}</h3>
      <form className="bmm-form-grid" onSubmit={saveService}>
        <label>Service Name<input value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} placeholder="जैसे Borewell Drilling" required /></label>
        <label>Qnt / Unit<select value={serviceForm.unit} onChange={e => setServiceForm(p => ({ ...p, unit: e.target.value }))}>
          {SERVICE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}<option value="__custom__">Custom Unit लिखें</option>
        </select></label>
        {serviceForm.unit === "__custom__" && <label>Custom Unit<input value={serviceForm.customUnit} onChange={e => setServiceForm(p => ({ ...p, customUnit: e.target.value }))} placeholder="अपनी Unit लिखें" required /></label>}
        <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" type="submit" disabled={loading}><Save size={16}/>{editingServiceId ? " Service Update करें" : " Add Service"}</button>{editingServiceId && <button className="bmm-btn bmm-btn-light" type="button" onClick={resetServiceForm}>Cancel</button>}</div>
      </form>
    </div>
    <div className="bmm-card"><h3>Services List ({services.length})</h3>{!services.length ? <p className="bmm-muted">अभी कोई Service नहीं है। ऊपर से नई Service जोड़ें।</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Service Name</th><th>Qnt / Unit</th><th>Status</th><th>Action</th></tr></thead><tbody>{services.map(service => {
        const active = Number(service.active) === 1 || service.active === true;
        return <tr key={service.id}><td><strong>{service.name}</strong></td><td>{service.unit || "—"}</td><td><span className="bmm-badge">{active ? "Active" : "Inactive"}</span></td><td><div className="bmm-actions"><button className="bmm-btn bmm-btn-light" onClick={() => editService(service)}>Edit</button><button className="bmm-btn bmm-btn-light" onClick={() => toggleService(service)} disabled={loading}>{active ? "Inactive करें" : "Active करें"}</button><button className="bmm-btn bmm-btn-danger" onClick={() => deleteService(service)} disabled={loading}>Delete</button></div></td></tr>;
      })}</tbody></table></div>}</div>
    <div className="bmm-card"><h3>{editingRateId ? "Block-wise Rate Edit करें" : "Add Block-wise Rate"}</h3>
      <form className="bmm-form-grid" onSubmit={saveRate}>
        <label>District / जिला<select value={rateForm.district} onChange={e => setRateForm(p => ({ ...p, district: e.target.value, block: "" }))} required><option value="">-- जिला चुनें --</option>{[...DISTRICTS].sort((a,b) => String(a).localeCompare(String(b), "hi")).map(d => <option key={d} value={d}>{d}</option>)}</select></label>
        <label>Block / ब्लॉक<select value={rateForm.block} onChange={e => setRateForm(p => ({ ...p, block: e.target.value }))} required disabled={!rateForm.district}><option value="">-- ब्लॉक चुनें --</option>{getBlocksForDistrict(rateForm.district).map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        <label>Service<select value={rateForm.service} onChange={e => setRateForm(p => ({ ...p, service: e.target.value }))} required><option value="">-- Service चुनें --</option>{services.map(service => <option key={service.id} value={service.name}>{service.name} ({service.unit}){Number(service.active) === 1 ? "" : " — Inactive"}</option>)}</select></label>
        <label>Rate (₹)<input type="number" min="0" step="0.01" value={rateForm.rate} onChange={e => setRateForm(p => ({ ...p, rate: e.target.value }))} placeholder="Rate दर्ज करें" required /></label>
        <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" disabled={loading || !services.length} type="submit"><Save size={16}/>{editingRateId ? " Rate Update करें" : " Rate Save करें"}</button>{editingRateId && <button className="bmm-btn bmm-btn-light" type="button" onClick={resetRateForm}>Cancel</button>}</div>
      </form>
      {!services.length && <p className="bmm-muted">Rate सेट करने से पहले कम से कम एक Service जोड़ें।</p>}
    </div>
    <div className="bmm-card"><h3>सभी District / Block Wise Rates ({rates.length})</h3>{!rates.length ? <p className="bmm-muted">अभी कोई Rate उपलब्ध नहीं है। ऊपर से Rate जोड़ें।</p> :
      <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>District</th><th>Block</th><th>Service</th><th>Qnt / Unit</th><th>Rate</th><th>Action</th></tr></thead><tbody>{rates.map(r => {
        const service = services.find(item => item.name === (r.service || r.service_name));
        return <tr key={r.id ?? r.rate_id}><td>{r.district}</td><td><strong>{r.block}</strong></td><td>{r.service || r.service_name || "—"}</td><td>{service?.unit || r.unit || "—"}</td><td>{money(r.rate)}</td><td><div className="bmm-actions"><button className="bmm-btn bmm-btn-light" onClick={() => editRate(r)}>Edit</button><button className="bmm-btn bmm-btn-danger" onClick={() => deleteRate(r)}>Delete</button></div></td></tr>;
      })}</tbody></table></div>}</div>
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
      return ["पूर्ण", "काम पूरा", "complete", "completed", "success", "successful"].includes(status);
    };

    const isCancelledBooking = b => {
      const status = getBookingStatus(b);
      return ["रद्द", "cancelled", "canceled", "reject", "rejected"].includes(status);
    };

    const totalAgentBookings = agentBookings.length;
    const successAgentBookings = agentBookings.filter(isSuccessfulBooking).length;
    const pendingAgentBookings = agentBookings.filter(
      b => !isSuccessfulBooking(b) && !isCancelledBooking(b)
    ).length;

    return <>
      <SectionTitle
        title="Agent Management"
        subtitle="एजेंट की जानकारी, कुल बुकिंग और बुकिंग हिस्ट्री"
        onRefresh={() => loadBookings().catch(e => fail(getError(e)))}
        loading={loading}
      />

      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:16}}>
        <div className="bmm-toolbar" style={{marginBottom:0,flex:1}}>
          <Search size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Agent नाम, मोबाइल या क्षेत्र खोजें" />
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
          {showArchivedAgents ? "सामान्य Agents देखें" : "Deleted / Archived देखें"}
        </button>
      </div>

      <div className="bmm-card">
        {!list.length ? (
          <p className="bmm-muted">{showArchivedAgents ? "कोई Archived Agent नहीं मिला।" : "Agent List खाली है या Backend से Agent API का उत्तर नहीं मिला।"}</p>
        ) : (
          <div className="bmm-table-wrap">
            <table className="bmm-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>User ID</th>
                  <th>क्षेत्र</th>
                  <th>Status</th>
                  <th>Active / Inactive</th>
                  <th>Delete / Restore</th>
                  <th>विवरण</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={getUserId(a)}>
                    <td><b>{a.name || "—"}</b><br/>{a.mobile || "—"}</td>
                    <td>{a.userId || a.user_id || "—"}</td>
                    <td>{a.district || "—"}<br/>{a.block || "—"}</td>
                    <td>
                      <span className="bmm-badge" style={{background:isAgentArchived(a) ? "#f1f5f9" : isAgentActive(a) ? "#e1f8eb" : "#fff0dc",color:isAgentArchived(a) ? "#64748b" : isAgentActive(a) ? "#14834a" : "#b96900"}}>
                        {isAgentArchived(a) ? "Archived" : isAgentActive(a) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {!isAgentArchived(a) && <button type="button" className={`bmm-btn ${isAgentActive(a) ? "bmm-btn-danger" : "bmm-btn-success"}`} disabled={loading} onClick={() => toggleAgentActive(a)}>
                        <Power size={14}/>{isAgentActive(a) ? "Inactive करें" : "Active करें"}
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
                      {!isAgentArchived(a) && <button type="button" className="bmm-btn bmm-btn-primary" onClick={() => openAgent(a)}>विवरण / Booking History</button>}
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
              <h3 style={{margin:"0 0 8px"}}>{selectedAgent.name || "Agent"} की जानकारी</h3>
              <p className="bmm-muted" style={{margin:"0 0 12px"}}>
                मोबाइल: {selectedAgent.mobile || "—"} | User ID: {selectedAgent.userId || selectedAgent.user_id || selectedAgent.id || "—"}
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
                <Save size={17}/>{editingAgent ? "Edit बंद करें" : "Agent Details Edit"}
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
              बंद करें
            </button>
          </div>

          {editingAgent && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:16}}>
              <input placeholder="Agent का नाम" value={agentForm.name || ""} onChange={e => setAgentForm(p => ({...p,name:e.target.value}))}/>
              <input placeholder="मोबाइल नंबर" value={agentForm.mobile || ""} onChange={e => setAgentForm(p => ({...p,mobile:e.target.value}))}/>
              <input placeholder="Agency Name" value={agentForm.agency_name || ""} onChange={e => setAgentForm(p => ({...p,agency_name:e.target.value}))}/>
              <input placeholder="जिला" value={agentForm.district || ""} onChange={e => setAgentForm(p => ({...p,district:e.target.value}))}/>
              <input placeholder="ब्लॉक" value={agentForm.block || ""} onChange={e => setAgentForm(p => ({...p,block:e.target.value}))}/>
              <input placeholder="ऑफिस का पता" value={agentForm.office_address || ""} onChange={e => setAgentForm(p => ({...p,office_address:e.target.value}))}/>
              <button type="button" className="bmm-btn bmm-btn-primary" onClick={saveAgentDetails} disabled={loading} style={{gridColumn:"1 / -1"}}>
                <Save size={16}/>{loading ? "सेव हो रहा है..." : "Save Agent Details"}
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

          <h3>Agent की पूरी Booking History ({totalAgentBookings})</h3>
          {!agentBookings.length ? (
            <p className="bmm-muted">इस Agent की कोई Booking नहीं मिली। अगर बुकिंग मौजूद है तो Backend के assigned agent ID field की जाँच करें।</p>
          ) : (
            <div className="bmm-table-wrap">
              <table className="bmm-table">
                <thead>
                  <tr>
                    <th>Booking No.</th>
                    <th>तारीख</th>
                    <th>Customer</th>
                    <th>क्षेत्र</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {agentBookings.map((b, index) => (
                    <tr key={getBookingId(b) || index}>
                      <td>{b.booking_number || b.booking_no || getBookingId(b) || "—"}</td>
                      <td>{formatDate(b.created_at || b.createdAt || b.booking_date)}</td>
                      <td>{b.customer_name || b.name || "—"}<br/>{b.customer_mobile || b.mobile || "—"}</td>
                      <td>{[b.district,b.block,b.village].filter(Boolean).join(" / ") || "—"}</td>
                      <td>{b.service || b.service_type || b.service_name || "—"}</td>
                      <td><span className="bmm-badge">{b.status || b.booking_status || "—"}</span></td>
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
    <SectionTitle title="Referral Management" subtitle="Referral ID, उससे जुड़े यूज़र और जुड़ने की तारीख" onRefresh={() => loadReferrals().catch(e => fail(getError(e)))} loading={loading}/>
    <div className="bmm-card"><h3>सभी Referral Partners ({referrals.length})</h3>
      {!referrals.length ? <p className="bmm-muted">Referral रिकॉर्ड नहीं मिले। Backend API और Referral Partner की स्थिति जाँचें।</p> :
        <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>Referral Partner</th><th>Referral ID</th><th>कुल जुड़े यूज़र</th><th>विवरण</th></tr></thead>
          <tbody>{referrals.map(item => {
            const id = item.id ?? item.user_id ?? item.userId;
            const code = item.referralCode ?? item.referral_code ?? item.referral_id ?? "—";
            const members = referralMembers[id] || [];
            const count = Number(item.referral_count ?? item.total_referred ?? item.member_count ?? members.length);
            return <React.Fragment key={id ?? code}>
              <tr><td><strong>{item.name || item.referrer_name || "—"}</strong><br/>{item.mobile || "—"}</td><td>{code}</td><td>{count}</td>
                <td><button className="bmm-btn bmm-btn-primary" disabled={!id || membersLoadingId === id} onClick={() => loadReferralMembers(item)}>{membersLoadingId === id ? "लोड हो रहा है..." : expandedReferralId === id ? "विवरण छिपाएँ" : "यूज़र देखें"}</button></td></tr>
              {expandedReferralId === id && <tr><td colSpan={4}><div style={{padding:"10px 0"}}><h3>Referral ID: {code} — जुड़े हुए यूज़र</h3>
                {membersLoadingId === id ? <p className="bmm-muted">यूज़र की जानकारी लोड हो रही है...</p> : !members.length ? <p className="bmm-muted">इस Referral ID से कोई यूज़र नहीं जुड़ा है।</p> :
                  <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>नाम</th><th>मोबाइल</th><th>User ID</th><th>Role</th><th>स्थिति</th><th>जुड़ने की तारीख</th></tr></thead>
                    <tbody>{members.map((p,i) => <tr key={p.id ?? p.user_id ?? p.userId ?? i}><td>{p.name || "—"}</td><td>{p.mobile || "—"}</td><td>{p.userId || p.user_id || "—"}</td><td>{p.role || "customer"}</td><td>{p.status || "—"}</td><td>{formatDate(p.created_at || p.createdAt)}</td></tr>)}</tbody>
                  </table></div>}</div></td></tr>}
            </React.Fragment>;
          })}</tbody></table></div>}
    </div>
  </>;

  const renderSettings = () => <><SectionTitle title="Settings" subtitle="Admin और API की स्थिति" onRefresh={loadDashboard} loading={loading}/><div className="bmm-card">
    <div className="bmm-setting-row"><ShieldCheck size={22}/><div><strong>Admin Session</strong><p>{user?.name || "Borewell Mitra Admin"}</p></div></div>
    <div className="bmm-setting-row"><Droplets size={22}/><div><strong>Backend API</strong><p>{API}</p></div></div>
    <p className="bmm-muted">पासवर्ड को Frontend में न रखें। Admin credentials केवल Backend में सुरक्षित रखें।</p>
  </div></>;

  const renderBlockBanners = () => <>
    <SectionTitle title="Block Banner Management" subtitle="हर जिले और ब्लॉक के लिए अलग Banner अपलोड और मैनेज करें" onRefresh={loadBlockBanners} loading={bannerLoading}/>
    <div className="bmm-card">
      <h3><ImageIcon size={18} style={{verticalAlign:"middle",marginRight:8}}/> नया Block Banner अपलोड करें</h3>
      <div className="bmm-form-grid">
        <label>जिला<select value={bannerDistrict} onChange={e=>{setBannerDistrict(e.target.value);setBannerBlock("");}}><option value="">-- जिला चुनें --</option>{[...DISTRICTS].sort((a,b)=>String(a).localeCompare(String(b),"hi")).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
        <label>ब्लॉक<select value={bannerBlock} onChange={e=>setBannerBlock(e.target.value)} disabled={!bannerDistrict}><option value="">-- ब्लॉक चुनें --</option>{getBlocksForDistrict(bannerDistrict).map(b=><option key={b} value={b}>{b}</option>)}</select></label>
        <label>Banner इमेज (PNG/JPG/WEBP, अधिकतम 500 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBannerFile}/></label>
        <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" type="button" disabled={bannerLoading} onClick={saveBlockBanner}><UploadCloud size={16}/> {bannerLoading ? "सेव हो रहा है..." : "Banner सेव करें"}</button><button className="bmm-btn bmm-btn-light" type="button" onClick={()=>{setBannerPreview("");setBannerDistrict("");setBannerBlock("");}}>Reset</button></div>
      </div>
      {bannerPreview && <div style={{marginTop:18}}><p className="bmm-muted">Preview</p><img src={bannerPreview} alt="Banner Preview" style={{width:"100%",maxWidth:650,maxHeight:220,objectFit:"contain",borderRadius:10,border:"1px solid #e3e8f0"}}/></div>}
    </div>
    <div className="bmm-card"><h3>सेव किए गए Block Banners ({blockBanners.length})</h3>
      {bannerLoading && !blockBanners.length ? <p className="bmm-muted">लोड हो रहा है...</p> : !blockBanners.length ? <p className="bmm-muted">अभी कोई Block Banner सेव नहीं है।</p> :
        <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>जिला</th><th>ब्लॉक</th><th>Banner</th><th>Action</th></tr></thead><tbody>{blockBanners.map(b=><tr key={b.id}><td>{b.district}</td><td>{b.block}</td><td>{(b.image_data || b.imageData || b.image_url || b.imageUrl) ? <img src={b.image_data || b.imageData || b.image_url || b.imageUrl} alt={`${b.block} Banner`} style={{width:180,maxHeight:65,objectFit:"cover",borderRadius:6}}/> : "—"}</td><td><button className="bmm-btn bmm-btn-danger" onClick={()=>deleteBlockBanner(b)}><Trash2 size={14}/> Delete</button></td></tr>)}</tbody></table></div>}
    </div>
  </>;

  const renderExtraSection = (page) => {
    const sections = {
      customers: { title: "Customer Management", subtitle: "ग्राहक पंजीकरण और उपलब्ध Approval रिकॉर्ड", body: <>
        <div className="bmm-card"><h3>Pending Customer / User Approvals ({pendingUsers.length})</h3>
          {!pendingUsers.length ? <p className="bmm-muted">कोई Pending Approval उपलब्ध नहीं है।</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>नाम</th><th>मोबाइल</th><th>User ID</th><th>Role</th><th>Action</th></tr></thead><tbody>{pendingUsers.map(p => <tr key={getUserId(p)}><td>{p.name || "—"}</td><td>{p.mobile || "—"}</td><td>{p.userId || p.user_id || "—"}</td><td>{p.role || "customer"}</td><td><div className="bmm-actions"><button className="bmm-btn bmm-btn-success" onClick={() => updateUserStatus(p,"approved")}>Approve</button><button className="bmm-btn bmm-btn-danger" onClick={() => updateUserStatus(p,"rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}
        </div><p className="bmm-muted">नोट: मौजूदा Backend केवल Pending Users की सूची देता है। सभी Customers की पूरी सूची और Profile Edit के लिए अलग API जोड़ना बाकी है।</p>
      </> },
      createAgent: { title: "Create Agent", subtitle: "Admin द्वारा नया Agent पंजीकरण", body: <>
        {createdAgent && <div className="bmm-card" style={{border:"1px solid #a8e5bf",background:"#f0fff5"}}><h3>Agent सफलतापूर्वक बन गया</h3><p><strong>Agent ID:</strong> {createdAgent.userId || "—"}</p><p><strong>नाम:</strong> {createdAgent.name} · <strong>मोबाइल:</strong> {createdAgent.mobile}</p><p className="bmm-muted">यह ID Agent को सुरक्षित रूप से दे दें।</p><button className="bmm-btn bmm-btn-light" onClick={() => setCreatedAgent(null)}>ठीक है</button></div>}
        <div className="bmm-card"><h3>नया Agent पंजीकरण</h3><p className="bmm-muted">Admin द्वारा बनाया गया Agent तुरंत Approved और Active रहेगा। पासवर्ड Agent को सुरक्षित तरीके से दें।</p>
          <form className="bmm-form-grid" onSubmit={createAgent}>
            <label>Agent का पूरा नाम<input value={newAgentForm.name} onChange={e=>setNewAgentForm(p=>({...p,name:e.target.value}))} placeholder="पूरा नाम" required /></label>
            <label>Agency का नाम<input value={newAgentForm.agency_name} onChange={e=>setNewAgentForm(p=>({...p,agency_name:e.target.value}))} placeholder="Agency Name" required /></label>
            <label>मोबाइल नंबर<input type="tel" inputMode="numeric" maxLength={10} value={newAgentForm.mobile} onChange={e=>setNewAgentForm(p=>({...p,mobile:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10 अंकों का मोबाइल" required /></label>
            <label>Login Password<input type="password" minLength={8} autoComplete="new-password" value={newAgentForm.password} onChange={e=>setNewAgentForm(p=>({...p,password:e.target.value}))} placeholder="कम से कम 8 अक्षर" required /></label>
            <label>जिला<select value={newAgentForm.district} onChange={e=>setNewAgentForm(p=>({...p,district:e.target.value,block:""}))} required><option value="">-- जिला चुनें --</option>{[...DISTRICTS].sort((a,b)=>String(a).localeCompare(String(b),"hi")).map(d=><option key={d} value={d}>{d}</option>)}</select></label>
            <label>ब्लॉक / तहसील<select value={newAgentForm.block} onChange={e=>setNewAgentForm(p=>({...p,block:e.target.value}))} required disabled={!newAgentForm.district}><option value="">-- ब्लॉक चुनें --</option>{getBlocksForDistrict(newAgentForm.district).map(b=><option key={b} value={b}>{b}</option>)}</select></label>
            <label style={{gridColumn:"1/-1"}}>Office Address<textarea rows={3} value={newAgentForm.office_address} onChange={e=>setNewAgentForm(p=>({...p,office_address:e.target.value}))} placeholder="एजेंसी / ऑफिस का पूरा पता" required /></label>
            <div className="bmm-form-actions"><button className="bmm-btn bmm-btn-primary" type="submit" disabled={loading}><Save size={16}/> {loading ? "Agent बनाया जा रहा है..." : "Agent Create करें"}</button><button className="bmm-btn bmm-btn-light" type="button" disabled={loading} onClick={()=>{setNewAgentForm(INITIAL_AGENT);setCreatedAgent(null);clearMessages();}}>Reset</button><button className="bmm-btn bmm-btn-light" type="button" onClick={()=>navigate("agents")}>Agent Management</button></div>
          </form>
        </div>
      </> },
      rules: { title: "Rules Management", subtitle: "वेबसाइट और Agent के नियम", body: <div className="bmm-card"><h3>वर्तमान Agent Rule</h3><p>नया Assigned Booking मिलने के बाद Agent को <strong>24 घंटे</strong> के भीतर स्वीकार करना होगा। समय पूरा होने पर Booking Admin के पास वापस जाएगी।</p><p className="bmm-muted">नोट: आपके Backend में Rules CRUD API उपलब्ध नहीं है। नियम को Dashboard से Save/Edit करने के लिए Backend API और database migration जोड़ना आवश्यक है।</p></div> },
      banners: { title: "Banner Management", subtitle: "Home Page के प्रचार बैनर", body: <div className="bmm-card"><h3>Banner Control</h3><p className="bmm-muted">Banner जोड़ने, बदलने, क्रम बदलने और हटाने के लिए अभी Backend में Banner API / Storage उपलब्ध नहीं है। इस सेक्शन का UI/API integration अगला काम रहेगा।</p></div> },
      calculator: { title: "Calculator Management", subtitle: "Calculator की सेव की गई गणनाएँ", body: <div className="bmm-card"><h3>Calculator Records</h3><p className="bmm-muted">Customer Calculator के Saved Records और PDF History दिखाने के लिए Backend में Admin Calculator Records API जोड़ना बाकी है।</p></div> },
      reports: { title: "Reports & Accounts", subtitle: "Booking, Agent और Commission की रिपोर्ट", body: <div className="bmm-card"><h3>वर्तमान रिपोर्ट सारांश</h3><div className="bmm-stats-grid"><div className="bmm-stat"><div><p>Total Bookings</p><h2>{bookings.length}</h2></div></div><div className="bmm-stat"><div><p>Completed</p><h2>{bookings.filter(b => ["पूर्ण","काम पूरा"].includes(b.status)).length}</h2></div></div><div className="bmm-stat"><div><p>Agents</p><h2>{agents.length}</h2></div></div><div className="bmm-stat"><div><p>Rates</p><h2>{rates.length}</h2></div></div></div><p className="bmm-muted">PDF / Excel Export और वास्तविक आय-व्यय Ledger के लिए Reports API जोड़ना बाकी है।</p></div> },
      admins: { title: "Admin Security", subtitle: "Single Main Admin — केवल एक Admin Account", body: <div className="bmm-card"><h3><ShieldCheck size={19}/> केवल एक Main Admin</h3><p>इस वेबसाइट में केवल एक Main Admin Account रहेगा। उसी Admin के पास Bookings, Agents, Customers, Rates, Commissions, Website और सभी Settings का पूरा अधिकार होगा।</p><ul className="bmm-security-list"><li>Sub-Admin Account बनाने की सुविधा नहीं होगी।</li><li>दूसरा Admin Account Register या Create नहीं किया जा सकेगा।</li><li>Admin Login और Password Backend पर सुरक्षित रखे जाएँगे।</li><li>महत्वपूर्ण बदलावों का Activity Log रखा जाएगा।</li></ul><p className="bmm-muted">यह Dashboard में तय की गई व्यवस्था है। Backend में भी एक ही Admin को enforce करने के लिए Admin registration/role APIs की जाँच जरूरी है।</p></div> },
      notifications: { title: "Notifications", subtitle: "Backend से प्राप्त Admin Alerts", body: <div className="bmm-card"><h3>Notifications ({adminNotifications.length})</h3>{!adminNotifications.length ? <p className="bmm-muted">कोई Notification नहीं मिली।</p> : <div className="bmm-table-wrap"><table className="bmm-table"><thead><tr><th>शीर्षक</th><th>विवरण</th><th>तारीख</th><th>स्थिति</th><th>Action</th></tr></thead><tbody>{adminNotifications.map(n => <tr key={n.id}><td>{n.title || n.type || "Notification"}</td><td>{n.message || "—"}</td><td>{formatDate(n.created_at)}</td><td>{Number(n.is_read) ? "पढ़ी गई" : "नई"}</td><td>{!Number(n.is_read) && <button className="bmm-btn bmm-btn-primary" onClick={async()=>{try{await apiRequest(`/admin/notifications/${n.id}/read`,{method:"PATCH"},user);await loadAdminNotifications();flash("Notification पढ़ी गई।")}catch(e){fail(getError(e))}}}>Read</button>}</td></tr>)}</tbody></table></div>}</div> },
      complaints: { title: "Complaints", subtitle: "Agent और Customer की शिकायतें", body: <div className="bmm-card"><h3>Complaint Management</h3><p className="bmm-muted">Agent Dashboard में Complaint सुविधा है, लेकिन Admin के लिए सभी शिकायतें देखने और Status बदलने का API अभी उपलब्ध Backend में नहीं मिला।</p></div> },
      feedback: { title: "Feedback & Ratings", subtitle: "Customer Feedback और 5-Star Rating", body: <div className="bmm-card"><h3>Customer Feedback</h3><p className="bmm-muted">Feedback और Rating को सेव/Approve/Reply करने के लिए Backend में संबंधित table और Admin API जोड़ना बाकी है।</p></div> },
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
        <div className="bmm-sidebar-bottom"><button onClick={onBack}><ArrowLeft size={17}/> वेबसाइट पर वापस</button><button onClick={onLogout}><LogOut size={17}/> Logout</button></div>
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
        <footer style={{textAlign:"center",color:"#98a3b5",fontSize:11,padding:"20px 0 5px"}}>© {new Date().getFullYear()} Borewells Mitra · Admin Panel</footer>
      </main>
    </div>
  </div>;
}
