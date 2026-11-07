
import "./AdminDashboard.css";
import React, { useCallback, useEffect, useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";
import {
  LayoutDashboard, Users, BadgeCheck, IndianRupee, ClipboardList,
  Settings, LogOut, ArrowLeft, RefreshCw, CheckCircle2, XCircle,
  Menu, X, ShieldCheck, Clock3, Droplets, UserCheck,
  Handshake, Save, Search, Power, Trash2, RotateCcw
} from "lucide-react";

const API = "http://localhost:4000/api";

async function apiRequest(path, options = {}, user = null) {
  const token =
    user?.token ||
    localStorage.getItem("bmm-token") ||
    localStorage.getItem("bm_token") ||
    localStorage.getItem("token") ||
    "";

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Server से सही JSON उत्तर नहीं मिला।");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request असफल (${response.status})`);
  }

  return data;
}

const money = value =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const getError = error =>
  error?.message || "कुछ गलत हुआ। कृपया दोबारा प्रयास करें।";

const getUserId = person =>
  person?.id ?? person?.user_id ?? person?.userId;

const getBookingId = booking =>
  booking?.id ?? booking?.booking_id;

const getAgentId = agent =>
  agent?.id ?? agent?.agent_id ?? agent?.user_id ?? agent?.userId;

const getServiceId = service =>
  service?.id ?? service?.service_id;

const isArchived = agent =>
  agent?.is_archived === true ||
  Number(agent?.is_archived) === 1 ||
  Boolean(agent?.deleted_at || agent?.deletedAt);

const isActive = agent => {
  if (agent?.is_active !== undefined && agent?.is_active !== null) {
    return agent.is_active === true ||
      Number(agent.is_active) === 1;
  }

  if (agent?.active !== undefined && agent?.active !== null) {
    return agent.active === true || Number(agent.active) === 1;
  }

  return ["approved", "active"].includes(
    String(agent?.status || "").toLowerCase()
  );
};

const isServiceActive = service => {
  if (service?.active !== undefined && service?.active !== null) {
    return service.active === true || Number(service.active) === 1;
  }

  if (service?.is_active !== undefined && service?.is_active !== null) {
    return service.is_active === true ||
      Number(service.is_active) === 1;
  }

  return true;
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bmm-stat">
      <div className={`bmm-stat-icon ${color}`}>
        <Icon size={23} />
      </div>
      <div>
        <p>{title}</p>
        <h2>{value ?? 0}</h2>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, onRefresh, loading }) {
  return (
    <div className="bmm-section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <button
        className="bmm-btn bmm-btn-light"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw
          size={16}
          className={loading ? "bmm-spin" : ""}
        />
        Refresh
      </button>
    </div>
  );
}

export default function AdminDashboard({
  user,
  onLogout,
  onBack
}) {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [pendingUsers, setPendingUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [rates, setRates] = useState([]);
  const [services, setServices] = useState([]);
  const [referrals, setReferrals] = useState([]);

  const [serviceForm, setServiceForm] = useState({
    name: "",
    unit: "प्रति फीट"
  });

  const [editingServiceId, setEditingServiceId] = useState(null);

  const [rateLocation, setRateLocation] = useState({
    district: "",
    block: ""
  });

  const [dynamicRateValues, setDynamicRateValues] = useState({});

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({});
  const [agentBookings, setAgentBookings] = useState([]);
  const [showAgentBookings, setShowAgentBookings] = useState(false);
  const [showArchivedAgents, setShowArchivedAgents] = useState(false);

  const [expandedReferralId, setExpandedReferralId] = useState(null);
  const [referralMembers, setReferralMembers] = useState({});
  const [membersLoadingId, setMembersLoadingId] = useState(null);

  const [stats, setStats] = useState({
    users: 0,
    pending: 0,
    bookings: 0,
    completed: 0
  });

  const flash = message => {
    setNotice(message);
    setError("");
  };

  const fail = message => {
    setError(message);
    setNotice("");
  };

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  // ================= LOAD DATA =================

  const loadPendingUsers = useCallback(async () => {
    const data = await apiRequest(
      "/admin/users/pending",
      {},
      user
    );

    const list = Array.isArray(data)
      ? data
      : data.users || data.pendingUsers || [];

    setPendingUsers(list);
    return list;
  }, [user]);

  const loadBookings = useCallback(async () => {
    const [bookingData, agentData] = await Promise.all([
      apiRequest("/admin/bookings", {}, user),
      apiRequest("/admin/agents", {}, user)
    ]);

    setBookings(
      Array.isArray(bookingData)
        ? bookingData
        : bookingData.bookings || []
    );

    setAgents(
      Array.isArray(agentData)
        ? agentData
        : agentData.agents || []
    );
  }, [user]);

  const loadRates = useCallback(async () => {
    const data = await apiRequest("/admin/rates", {}, user);

    const list = Array.isArray(data)
      ? data
      : data.rates || [];

    setRates(list);
    return list;
  }, [user]);

  const loadServices = useCallback(async () => {
    const data = await apiRequest("/admin/services", {}, user);

    const list = Array.isArray(data)
      ? data
      : data.services || [];

    setServices(list);
    return list;
  }, [user]);

  const loadReferrals = useCallback(async () => {
    const data = await apiRequest(
      "/admin/referrals",
      {},
      user
    );

    const list = Array.isArray(data)
      ? data
      : data.referrals || [];

    setReferrals(list);
    return list;
  }, [user]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    clearMessages();

    const results = await Promise.allSettled([
      loadPendingUsers(),
      loadBookings(),
      loadRates(),
      loadServices(),
      loadReferrals()
    ]);

    const failures = results
      .filter(result => result.status === "rejected")
      .map(result => getError(result.reason));

    if (failures.length) {
      fail("कुछ जानकारी लोड नहीं हुई: " + failures.join(" | "));
    }

    setLoading(false);
  }, [
    loadPendingUsers,
    loadBookings,
    loadRates,
    loadServices,
    loadReferrals
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setStats({
      users: agents.length + pendingUsers.length,
      pending: pendingUsers.length,
      bookings: bookings.length,
      completed: bookings.filter(b =>
        ["पूर्ण", "काम पूरा", "completed", "complete"].includes(
          String(b.status || "").toLowerCase()
        )
      ).length
    });
  }, [agents, pendingUsers, bookings]);

  // ================= NAVIGATION =================

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "approvals", label: "User Approval", icon: BadgeCheck },
    { id: "bookings", label: "Booking Management", icon: ClipboardList },
    { id: "rates", label: "Rate Management", icon: IndianRupee },
    { id: "agents", label: "Agent Management", icon: UserCheck },
    { id: "referrals", label: "Referral Management", icon: Handshake },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const navigate = page => {
    setActivePage(page);
    setSidebarOpen(false);
    setSearch("");
    clearMessages();

    if (page === "approvals") {
      loadPendingUsers().catch(e => fail(getError(e)));
    }

    if (page === "bookings" || page === "agents") {
      loadBookings().catch(e => fail(getError(e)));
    }

    if (page === "rates") {
      Promise.all([loadRates(), loadServices()])
        .catch(e => fail(getError(e)));
    }

    if (page === "referrals") {
      loadReferrals().catch(e => fail(getError(e)));
    }
  };

  // ================= USER APPROVAL =================

  const updateUserStatus = async (person, status) => {
    const id = getUserId(person);

    if (!id) {
      fail("User ID नहीं मिली।");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/users/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status })
        },
        user
      );

      flash(
        status === "approved"
          ? "यूज़र स्वीकृत हो गया।"
          : "यूज़र की स्थिति अपडेट हो गई।"
      );

      await loadPendingUsers();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  // ================= BOOKING ASSIGNMENT =================

  const updateBookingAssignment = async (booking, agentId) => {
    const id = getBookingId(booking);

    if (!id) {
      fail("Booking ID नहीं मिली।");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      if (agentId) {
        await apiRequest(
          `/admin/bookings/${id}/assign`,
          {
            method: "PATCH",
            body: JSON.stringify({
              agent_id: Number(agentId)
            })
          },
          user
        );
      } else {
        await apiRequest(
          `/admin/bookings/${id}/unassign`,
          { method: "PATCH" },
          user
        );
      }

      flash(
        agentId
          ? "Agent बुकिंग पर नियुक्त हो गया।"
          : "Booking से Agent हटा दिया गया।"
      );

      await loadBookings();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  // ================= SERVICE MANAGEMENT =================

  const resetServiceForm = () => {
    setServiceForm({
      name: "",
      unit: "प्रति फीट"
    });
    setEditingServiceId(null);
  };

  const saveService = async event => {
    event.preventDefault();
    clearMessages();

    const name = serviceForm.name.trim();
    const unit = serviceForm.unit.trim();

    if (!name || !unit) {
      fail("सर्विस का नाम और यूनिट भरना आवश्यक है।");
      return;
    }

    setLoading(true);

    try {
      const payload = { name, unit };

      if (editingServiceId) {
        const existing = services.find(
          item => String(getServiceId(item)) ===
            String(editingServiceId)
        );

        await apiRequest(
          `/admin/services/${editingServiceId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...payload,
              active: isServiceActive(existing || {})
            })
          },
          user
        );

        flash("सर्विस अपडेट हो गई।");
      } else {
        await apiRequest(
          "/admin/services",
          {
            method: "POST",
            body: JSON.stringify(payload)
          },
          user
        );

        flash("नई सर्विस जोड़ दी गई।");
      }

      resetServiceForm();
      await loadServices();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const editService = service => {
    setEditingServiceId(getServiceId(service));

    setServiceForm({
      name: service.name || "",
      unit: service.unit || "प्रति फीट"
    });
  };

  const toggleService = async service => {
    const id = getServiceId(service);

    if (!id) {
      fail("Service ID नहीं मिली।");
      return;
    }

    const nextActive = !isServiceActive(service);

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/services/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: service.name,
            unit: service.unit || "",
            active: nextActive
          })
        },
        user
      );

      flash(
        nextActive
          ? "सर्विस Active कर दी गई।"
          : "सर्विस Inactive कर दी गई।"
      );

      await loadServices();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async service => {
    const id = getServiceId(service);

    if (!id) {
      fail("Service ID नहीं मिली।");
      return;
    }

    if (!window.confirm(
      `"${service.name}" सर्विस Delete करना चाहते हैं?`
    )) return;

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/services/${id}`,
        { method: "DELETE" },
        user
      );

      flash("सर्विस Delete कर दी गई।");
      await loadServices();
      await loadRates();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };


  // ================= DYNAMIC RATE MANAGEMENT =================

  // पुराने सेव किए गए रेट को जिला और ब्लॉक के अनुसार पढ़ना
  const buildRateValues = (district, block, rateList = rates) => {
    const values = {};

    rateList.forEach(rate => {
      const rateDistrict = String(rate.district || "").trim();
      const rateBlock = String(rate.block || "").trim();

      if (
        rateDistrict.toLowerCase() === district.trim().toLowerCase() &&
        rateBlock.toLowerCase() === block.trim().toLowerCase()
      ) {
        const name = String(
          rate.service || rate.service_name || ""
        ).trim();

        if (name) {
          values[name] = String(rate.rate ?? "");
        }
      }
    });

    return values;
  };

  // जिला और ब्लॉक चुनने पर पुराने रेट दिखाएँ
  const selectRateLocation = (district, block) => {
    setRateLocation({ district, block });

    if (!district || !block) {
      setDynamicRateValues({});
      return;
    }

    setDynamicRateValues(
      buildRateValues(district, block, rates)
    );
  };

  // सभी सर्विस रेट सेव करें
  const saveDynamicRates = async event => {
    event.preventDefault();
    clearMessages();

    const district = rateLocation.district.trim();
    const block = rateLocation.block.trim();

    if (!district || !block) {
      fail("जिला और ब्लॉक चुनना आवश्यक है।");
      return;
    }

    const activeServices = services.filter(isServiceActive);

    if (!activeServices.length) {
      fail("पहले कम से कम एक Active Service जोड़ें।");
      return;
    }

    const rateItems = [];

    for (const service of activeServices) {
      const value = dynamicRateValues[service.name];

      if (
        value === undefined ||
        String(value).trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      ) {
        fail(`${service.name} का सही रेट भरें।`);
        return;
      }

      rateItems.push({
        service: service.name,
        rate: Number(value)
      });
    }

    setLoading(true);

    try {
      await apiRequest(
        "/admin/rates/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            district,
            block,
            rates: rateItems
          })
        },
        user
      );

      // सेव होने के बाद नई Rate List प्राप्त करें
      const updatedRates = await loadRates();

      // नई Rate List से इनपुट अपडेट करें
      setDynamicRateValues(
        buildRateValues(district, block, updatedRates)
      );

      flash(
        `${district} - ${block} के सभी सर्विस रेट सफलतापूर्वक अपडेट हो गए।`
      );

    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  // पुराना रेट Edit करने के लिए उसी जिला-ब्लॉक पर जाएँ
  const editRate = rate => {
    const district = String(rate.district || "").trim();
    const block = String(rate.block || "").trim();

    setRateLocation({ district, block });

    setDynamicRateValues(
      buildRateValues(district, block, rates)
    );

    setActivePage("rates");
    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // सेव किए गए रेट को Delete करें
  const deleteRate = async rate => {
    const id = rate.id ?? rate.rate_id;

    if (!id) {
      fail("Rate ID नहीं मिली।");
      return;
    }

    if (
      !window.confirm(
        "क्या आप यह सर्विस रेट हटाना चाहते हैं?"
      )
    ) {
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/rates/${id}`,
        { method: "DELETE" },
        user
      );

      const updatedRates = await loadRates();

      setDynamicRateValues(
        buildRateValues(
          rateLocation.district || rate.district || "",
          rateLocation.block || rate.block || "",
          updatedRates
        )
      );

      flash("सर्विस रेट हटा दिया गया।");

    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };


  // ================= AGENT MANAGEMENT =================

  const toggleAgentStatus = async agent => {
    const id = getAgentId(agent);

    if (!id) {
      fail("Agent ID नहीं मिली।");
      return;
    }

    if (String(agent.status || "").toLowerCase() === "pending") {
      fail("पहले Agent को Approve करें।");
      return;
    }

    const nextActive = !isActive(agent);

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/agents/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: nextActive,
            active: nextActive,
            status: nextActive ? "approved" : "inactive"
          })
        },
        user
      );

      flash(
        nextActive
          ? "Agent Active कर दिया गया।"
          : "Agent Inactive कर दिया गया।"
      );

      await loadBookings();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const openAgentEdit = agent => {
    setSelectedAgent(agent);

    setAgentForm({
      name: agent.name || "",
      mobile: agent.mobile || agent.phone || "",
      district: agent.district || "",
      block: agent.block || agent.tehsil || "",
      address: agent.address || "",
      status: agent.status || "approved"
    });

    setEditingAgent(true);
    setShowAgentBookings(false);
  };

  const saveAgentEdit = async event => {
    event.preventDefault();

    if (!selectedAgent) return;

    const id = getAgentId(selectedAgent);

    if (!id) {
      fail("Agent ID नहीं मिली।");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/agents/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(agentForm)
        },
        user
      );

      flash("Agent की जानकारी अपडेट हो गई।");

      setEditingAgent(false);
      setSelectedAgent(null);

      await loadBookings();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const archiveAgent = async agent => {
    const id = getAgentId(agent);

    if (!id) {
      fail("Agent ID नहीं मिली।");
      return;
    }

    if (!window.confirm(
      `${agent.name || "इस Agent"} को Archive करना चाहते हैं?`
    )) return;

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/agents/${id}/archive`,
        { method: "PATCH" },
        user
      );

      flash("Agent Archive कर दिया गया।");
      setSelectedAgent(null);

      await loadBookings();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const restoreAgent = async agent => {
    const id = getAgentId(agent);

    if (!id) {
      fail("Agent ID नहीं मिली।");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/agents/${id}/restore`,
        { method: "PATCH" },
        user
      );

      flash("Agent Restore कर दिया गया।");

      await loadBookings();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  const openAgentBookings = async agent => {
    const id = getAgentId(agent);

    if (!id) {
      fail("Agent ID नहीं मिली।");
      return;
    }

    setSelectedAgent(agent);
    setShowAgentBookings(true);
    setEditingAgent(false);
    setLoading(true);
    clearMessages();

    try {
      const data = await apiRequest(
        `/admin/agents/${id}/bookings`,
        {},
        user
      );

      setAgentBookings(
        Array.isArray(data)
          ? data
          : data.bookings || []
      );
    } catch (e) {
      fail(getError(e));
      setAgentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const closeAgentDetails = () => {
    setSelectedAgent(null);
    setEditingAgent(false);
    setShowAgentBookings(false);
    setAgentBookings([]);
  };

  // ================= REFERRAL MANAGEMENT =================

  const loadReferralMembers = async referral => {
    const id =
      referral.id ??
      referral.referral_id ??
      referral.user_id;

    if (!id) {
      fail("Referral ID नहीं मिली।");
      return;
    }

    setMembersLoadingId(id);
    clearMessages();

    try {
      const data = await apiRequest(
        `/admin/referrals/${id}/members`,
        {},
        user
      );

      const members = Array.isArray(data)
        ? data
        : data.members || data.referrals || [];

      setReferralMembers(prev => ({
        ...prev,
        [id]: members
      }));

      setExpandedReferralId(id);
    } catch (e) {
      fail(getError(e));
    } finally {
      setMembersLoadingId(null);
    }
  };

  const toggleReferralMembers = referral => {
    const id =
      referral.id ??
      referral.referral_id ??
      referral.user_id;

    if (!id) return;

    if (String(expandedReferralId) === String(id)) {
      setExpandedReferralId(null);
      return;
    }

    if (referralMembers[id]) {
      setExpandedReferralId(id);
      return;
    }

    loadReferralMembers(referral);
  };

  const updateReferralCommission = async (referral, amount) => {
    const id = referral.id ?? referral.referral_id;

    if (!id) {
      fail("Referral ID नहीं मिली।");
      return;
    }

    const commission = Number(amount);

    if (!Number.isFinite(commission) || commission < 0) {
      fail("सही कमीशन राशि भरें।");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      await apiRequest(
        `/admin/referrals/${id}/commission`,
        {
          method: "PATCH",
          body: JSON.stringify({
            commission,
            amount: commission
          })
        },
        user
      );

      flash("Referral Commission अपडेट हो गया।");

      await loadReferrals();
    } catch (e) {
      fail(getError(e));
    } finally {
      setLoading(false);
    }
  };

  // ================= SEARCH & HELPERS =================

  const matchesSearch = item => {
    if (!search.trim()) return true;

    const query = search.toLowerCase();

    return Object.values(item || {}).some(value =>
      String(value ?? "").toLowerCase().includes(query)
    );
  };

  const visibleAgents = agents.filter(agent => {
    const archiveMatch = showArchivedAgents
      ? isArchived(agent)
      : !isArchived(agent);

    return archiveMatch && matchesSearch(agent);
  });

  const visibleBookings = bookings.filter(matchesSearch);
  const visiblePendingUsers = pendingUsers.filter(matchesSearch);
  const visibleRates = rates.filter(matchesSearch);
  const visibleReferrals = referrals.filter(matchesSearch);

  const approvedActiveAgents = agents.filter(agent =>
    !isArchived(agent) &&
    isActive(agent) &&
    String(agent.status || "").toLowerCase() !== "pending"
  );

  const getPersonName = person =>
    person?.name ||
    person?.full_name ||
    person?.customer_name ||
    "—";

  const getPersonMobile = person =>
    person?.mobile ||
    person?.phone ||
    person?.mobile_number ||
    person?.customer_mobile ||
    "—";

  const getBookingStatus = booking =>
    booking?.status || "Pending";

  const getBookingService = booking =>
    booking?.service ||
    booking?.service_name ||
    booking?.service_type ||
    "—";

  const getBookingDistrict = booking =>
    booking?.district || "—";

  const getBookingBlock = booking =>
    booking?.block || booking?.tehsil || "—";

  const getBookingAddress = booking =>
    booking?.address || "—";

  const getAssignedAgent = booking =>
    booking?.agent_name ||
    booking?.assigned_agent_name ||
    booking?.agent?.name ||
    "अभी नियुक्त नहीं";

  const getAssignedAgentMobile = booking =>
    booking?.agent_mobile ||
    booking?.assigned_agent_mobile ||
    booking?.agent?.mobile ||
    booking?.agent_phone ||
    "—";

  const getReferralName = referral =>
    referral?.name || referral?.referrer_name || "—";

  const getReferralCode = referral =>
    referral?.referral_code || referral?.code || "—";

  const getReferralCommission = referral =>
    referral?.commission ??
    referral?.commission_amount ??
    referral?.amount ??
    0;

  const getRateServiceName = rate =>
    rate?.service || rate?.service_name || "—";

  const getRateUnit = rate => {
    const service = services.find(item =>
      String(item.name || "").toLowerCase() ===
      String(getRateServiceName(rate)).toLowerCase()
    );

    return service?.unit || "—";
  };

  const getReferralMembers = referral => {
    const id =
      referral.id ??
      referral.referral_id ??
      referral.user_id;

    return referralMembers[id] || [];
  };

  // ================= DASHBOARD =================

  const renderDashboard = () => (
    <>
      <SectionTitle
        title="Admin Dashboard"
        subtitle="Borewell Mitra MP — Website Overview"
        onRefresh={loadDashboard}
        loading={loading}
      />

      <div className="bmm-stats-grid">
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Pending Approvals"
          value={stats.pending}
          icon={Clock3}
          color="orange"
        />

        <StatCard
          title="Total Bookings"
          value={stats.bookings}
          icon={ClipboardList}
          color="purple"
        />

        <StatCard
          title="Completed Bookings"
          value={stats.completed}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      <div className="bmm-dashboard-grid">
        <div className="bmm-card">
          <h3>Quick Navigation</h3>

          <div className="bmm-quick-grid">
            {navItems.slice(1).map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className="bmm-quick-item"
                  onClick={() => navigate(item.id)}
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bmm-card">
          <h3>Booking Overview</h3>

          <div className="bmm-overview-row">
            <span>Total Bookings</span>
            <strong>{bookings.length}</strong>
          </div>

          <div className="bmm-overview-row">
            <span>Pending Bookings</span>
            <strong>
              {bookings.filter(b =>
                String(b.status || "")
                  .toLowerCase()
                  .includes("pending")
              ).length}
            </strong>
          </div>

          <div className="bmm-overview-row">
            <span>Active Agents</span>
            <strong>{approvedActiveAgents.length}</strong>
          </div>

          <div className="bmm-overview-row">
            <span>Total Services</span>
            <strong>{services.length}</strong>
          </div>
        </div>
      </div>

      <div className="bmm-card">
        <h3>Recent Bookings</h3>

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Service</th>
                <th>District</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {bookings.slice(0, 6).map((booking, index) => (
                <tr key={getBookingId(booking) || index}>
                  <td>
                    {booking.booking_code ||
                      booking.bookingId ||
                      getBookingId(booking) ||
                      "—"}
                  </td>
                  <td>{getPersonName(booking)}</td>
                  <td>{getPersonMobile(booking)}</td>
                  <td>{getBookingService(booking)}</td>
                  <td>{getBookingDistrict(booking)}</td>
                  <td>
                    <span className="bmm-badge">
                      {getBookingStatus(booking)}
                    </span>
                  </td>
                </tr>
              ))}

              {!bookings.length && (
                <tr>
                  <td colSpan={6}>अभी कोई Booking उपलब्ध नहीं है।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ================= USER APPROVAL =================

  const renderApprovals = () => (
    <>
      <SectionTitle
        title="User Approval"
        subtitle="नए Customer और Agent अकाउंट की जाँच एवं स्वीकृति"
        onRefresh={loadPendingUsers}
        loading={loading}
      />

      <div className="bmm-card">
        <div className="bmm-toolbar">
          <h3>Pending Users ({visiblePendingUsers.length})</h3>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="नाम / मोबाइल / जिला खोजें"
          />
        </div>

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>नाम</th>
                <th>मोबाइल</th>
                <th>यूज़र प्रकार</th>
                <th>जिला</th>
                <th>ब्लॉक</th>
                <th>स्थिति</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visiblePendingUsers.map((person, index) => (
                <tr key={getUserId(person) || index}>
                  <td><strong>{getPersonName(person)}</strong></td>
                  <td>{getPersonMobile(person)}</td>
                  <td>{person.role || person.user_type || "Customer"}</td>
                  <td>{person.district || "—"}</td>
                  <td>{person.block || person.tehsil || "—"}</td>
                  <td>
                    <span className="bmm-badge bmm-warning">
                      Pending
                    </span>
                  </td>
                  <td>
                    <div className="bmm-actions">
                      <button
                        className="bmm-btn bmm-btn-success"
                        disabled={loading}
                        onClick={() =>
                          updateUserStatus(person, "approved")
                        }
                      >
                        <CheckCircle2 size={15} />
                        Approve
                      </button>

                      <button
                        className="bmm-btn bmm-btn-danger"
                        disabled={loading}
                        onClick={() =>
                          updateUserStatus(person, "rejected")
                        }
                      >
                        <XCircle size={15} />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!visiblePendingUsers.length && (
                <tr>
                  <td colSpan={7}>कोई Pending User नहीं है।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ================= BOOKING MANAGEMENT =================

  const renderBookings = () => (
    <>
      <SectionTitle
        title="Booking Management"
        subtitle="सभी Customer Bookings और Agent Assignment"
        onRefresh={loadBookings}
        loading={loading}
      />

      <div className="bmm-card">
        <div className="bmm-toolbar">
          <h3>Total Bookings ({visibleBookings.length})</h3>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Booking / Customer / Mobile खोजें"
          />
        </div>

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Service</th>
                <th>District / Block</th>
                <th>Address</th>
                <th>Agent</th>
                <th>Agent Mobile</th>
                <th>Status</th>
                <th>Agent Assign</th>
              </tr>
            </thead>

            <tbody>
              {visibleBookings.map((booking, index) => (
                <tr key={getBookingId(booking) || index}>
                  <td>
                    {booking.booking_code ||
                      booking.bookingId ||
                      getBookingId(booking) ||
                      "—"}
                  </td>

                  <td><strong>{getPersonName(booking)}</strong></td>
                  <td>{getPersonMobile(booking)}</td>
                  <td>{getBookingService(booking)}</td>

                  <td>
                    {getBookingDistrict(booking)} / {getBookingBlock(booking)}
                  </td>

                  <td>{getBookingAddress(booking)}</td>
                  <td>{getAssignedAgent(booking)}</td>
                  <td>{getAssignedAgentMobile(booking)}</td>

                  <td>
                    <span className="bmm-badge">
                      {getBookingStatus(booking)}
                    </span>
                  </td>

                  <td>
                    <select
                      value={
                        booking.agent_id ||
                        booking.assigned_agent_id ||
                        ""
                      }
                      onChange={e =>
                        updateBookingAssignment(booking, e.target.value)
                      }
                      disabled={loading}
                    >
                      <option value="">-- Agent चुनें --</option>

                      {approvedActiveAgents.map(agent => (
                        <option
                          key={getAgentId(agent)}
                          value={getAgentId(agent)}
                        >
                          {getPersonName(agent)} - {getPersonMobile(agent)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}

              {!visibleBookings.length && (
                <tr>
                  <td colSpan={10}>कोई Booking उपलब्ध नहीं है।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ================= RATE & SERVICE MANAGEMENT =================

  const renderRates = () => {
    const activeServices = services.filter(isServiceActive);

    return (
      <>
        <SectionTitle
          title="Rate & Service Management"
          subtitle="सर्विस जोड़ें और हर जिला-ब्लॉक का अलग रेट तय करें"
          onRefresh={() =>
            Promise.all([loadRates(), loadServices()])
              .catch(e => fail(getError(e)))
          }
          loading={loading}
        />

        <div className="bmm-card">
          <h3>Service Management</h3>

          <p className="bmm-muted">
            नई सर्विस जोड़ें, नाम बदलें या Active / Inactive करें।
          </p>

          <form className="bmm-form-grid" onSubmit={saveService}>
            <label>
              सर्विस का नाम

              <input
                value={serviceForm.name}
                onChange={e =>
                  setServiceForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))
                }
                placeholder="जैसे: Borewell Drilling"
                required
              />
            </label>

            <label>
              रेट यूनिट

              <input
                value={serviceForm.unit}
                onChange={e =>
                  setServiceForm(prev => ({
                    ...prev,
                    unit: e.target.value
                  }))
                }
                placeholder="जैसे: प्रति फीट"
                required
              />
            </label>

            <div className="bmm-form-actions">
              <button
                type="submit"
                className="bmm-btn bmm-btn-primary"
                disabled={loading}
              >
                <Save size={16} />
                {editingServiceId
                  ? "सर्विस अपडेट करें"
                  : "नई सर्विस जोड़ें"}
              </button>

              {editingServiceId && (
                <button
                  type="button"
                  className="bmm-btn bmm-btn-light"
                  onClick={resetServiceForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="bmm-table-wrap" style={{ marginTop: 20 }}>
            <table className="bmm-table">
              <thead>
                <tr>
                  <th>सर्विस</th>
                  <th>यूनिट</th>
                  <th>स्थिति</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {services.map(service => (
                  <tr key={getServiceId(service)}>
                    <td><strong>{service.name}</strong></td>
                    <td>{service.unit || "—"}</td>

                    <td>
                      <span
                        className={`bmm-badge ${
                          isServiceActive(service)
                            ? "bmm-success"
                            : "bmm-warning"
                        }`}
                      >
                        {isServiceActive(service) ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="bmm-actions">
                        <button
                          type="button"
                          className="bmm-btn bmm-btn-light"
                          onClick={() => editService(service)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`bmm-btn ${
                            isServiceActive(service)
                              ? "bmm-btn-danger"
                              : "bmm-btn-success"
                          }`}
                          disabled={loading}
                          onClick={() => toggleService(service)}
                        >
                          <Power size={14} />
                          {isServiceActive(service) ? "Inactive" : "Active"}
                        </button>

                        <button
                          type="button"
                          className="bmm-btn bmm-btn-danger"
                          disabled={loading}
                          onClick={() => deleteService(service)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!services.length && (
                  <tr>
                    <td colSpan={4}>अभी कोई सर्विस नहीं है।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bmm-card">
          <h3>District → Block Rate Management</h3>

          <form onSubmit={saveDynamicRates}>
            <div className="bmm-form-grid">
              <label>
                जिला चुनें

                <select
                  value={rateLocation.district}
                  onChange={e =>
                    selectRateLocation(e.target.value, "")
                  }
                  required
                >
                  <option value="">-- जिला चुनें --</option>

                  {DISTRICTS.map(district => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                ब्लॉक चुनें

                <select
                  value={rateLocation.block}
                  onChange={e =>
                    selectRateLocation(
                      rateLocation.district,
                      e.target.value
                    )
                  }
                  disabled={!rateLocation.district}
                  required
                >
                  <option value="">-- ब्लॉक चुनें --</option>

                  {(BLOCKS[rateLocation.district] || []).map(block => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {rateLocation.district && rateLocation.block && (
              <div className="bmm-dynamic-rates">
                <h3>
                  {rateLocation.district} — {rateLocation.block} के सर्विस रेट
                </h3>

                {!activeServices.length ? (
                  <p className="bmm-muted">
                    पहले Service Management में Active सर्विस जोड़ें।
                  </p>
                ) : (
                  <div className="bmm-rate-grid">
                    {activeServices.map(service => (
                      <label key={getServiceId(service)}>
                        <span>
                          {service.name}
                          <small>
                            {service.unit || "यूनिट निर्धारित नहीं"}
                          </small>
                        </span>

                        <div className="bmm-rate-input">
                          <span>₹</span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="रेट भरें"
                            value={
                              dynamicRateValues[service.name] ?? ""
                            }
                            onChange={e =>
                              setDynamicRateValues(prev => ({
                                ...prev,
                                [service.name]: e.target.value
                              }))
                            }
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="bmm-btn bmm-btn-primary"
                  disabled={loading || !activeServices.length}
                >
                  <Save size={16} />
                  सभी रेट सेव करें
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="bmm-card">
          <h3>सभी सेव किए गए रेट ({visibleRates.length})</h3>

          <div className="bmm-toolbar">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="जिला / ब्लॉक / सर्विस खोजें"
            />
          </div>

          <div className="bmm-table-wrap">
            <table className="bmm-table">
              <thead>
                <tr>
                  <th>जिला</th>
                  <th>ब्लॉक</th>
                  <th>सर्विस</th>
                  <th>यूनिट</th>
                  <th>रेट</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleRates.map((rate, index) => (
                  <tr key={rate.id ?? rate.rate_id ?? index}>
                    <td>{rate.district || "—"}</td>
                    <td><strong>{rate.block || "—"}</strong></td>
                    <td>{getRateServiceName(rate)}</td>
                    <td>{getRateUnit(rate)}</td>
                    <td>{money(rate.rate)}</td>

                    <td>
                      <div className="bmm-actions">
                        <button
                          className="bmm-btn bmm-btn-light"
                          onClick={() => editRate(rate)}
                        >
                          Edit
                        </button>

                        <button
                          className="bmm-btn bmm-btn-danger"
                          disabled={loading}
                          onClick={() => deleteRate(rate)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!visibleRates.length && (
                  <tr>
                    <td colSpan={6}>अभी कोई रेट उपलब्ध नहीं है।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  // ================= AGENT MANAGEMENT =================

  const renderAgents = () => (
    <>
      <SectionTitle
        title="Agent Management"
        subtitle="Agent की जानकारी, स्थिति और Booking History"
        onRefresh={loadBookings}
        loading={loading}
      />

      {selectedAgent && editingAgent && (
        <div className="bmm-card">
          <div className="bmm-toolbar">
            <h3>Agent Edit — {getPersonName(selectedAgent)}</h3>

            <button
              className="bmm-btn bmm-btn-light"
              onClick={closeAgentDetails}
            >
              <X size={16} />
              Close
            </button>
          </div>

          <form className="bmm-form-grid" onSubmit={saveAgentEdit}>
            <label>
              नाम

              <input
                value={agentForm.name || ""}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              मोबाइल नंबर

              <input
                value={agentForm.mobile || ""}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    mobile: e.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              जिला

              <select
                value={agentForm.district || ""}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    district: e.target.value,
                    block: ""
                  }))
                }
              >
                <option value="">जिला चुनें</option>
                {DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <label>
              ब्लॉक

              <select
                value={agentForm.block || ""}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    block: e.target.value
                  }))
                }
              >
                <option value="">ब्लॉक चुनें</option>
                {(BLOCKS[agentForm.district] || []).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>

            <label>
              पता

              <input
                value={agentForm.address || ""}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    address: e.target.value
                  }))
                }
              />
            </label>

            <label>
              स्थिति

              <select
                value={agentForm.status || "approved"}
                onChange={e =>
                  setAgentForm(prev => ({
                    ...prev,
                    status: e.target.value
                  }))
                }
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div className="bmm-form-actions">
              <button
                type="submit"
                className="bmm-btn bmm-btn-primary"
                disabled={loading}
              >
                <Save size={16} />
                Save Changes
              </button>

              <button
                type="button"
                className="bmm-btn bmm-btn-light"
                onClick={closeAgentDetails}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedAgent && showAgentBookings && (
        <div className="bmm-card">
          <div className="bmm-toolbar">
            <div>
              <h3>Booking History</h3>
              <p>{getPersonName(selectedAgent)}</p>
              <p>{getPersonMobile(selectedAgent)}</p>
            </div>

            <button
              className="bmm-btn bmm-btn-light"
              onClick={closeAgentDetails}
            >
              <X size={16} /> Close
            </button>
          </div>

          <div className="bmm-table-wrap">
            <table className="bmm-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Service</th>
                  <th>जिला</th>
                  <th>ब्लॉक</th>
                  <th>स्थिति</th>
                  <th>तारीख</th>
                </tr>
              </thead>

              <tbody>
                {agentBookings.map((booking, index) => (
                  <tr key={getBookingId(booking) || index}>
                    <td>
                      {booking.booking_code ||
                        getBookingId(booking) ||
                        "—"}
                    </td>
                    <td>{getPersonName(booking)}</td>
                    <td>{getPersonMobile(booking)}</td>
                    <td>{getBookingService(booking)}</td>
                    <td>{getBookingDistrict(booking)}</td>
                    <td>{getBookingBlock(booking)}</td>
                    <td>{getBookingStatus(booking)}</td>
                    <td>
                      {formatDate(
                        booking.created_at || booking.createdAt
                      )}
                    </td>
                  </tr>
                ))}

                {!agentBookings.length && (
                  <tr>
                    <td colSpan={8}>इस Agent की Booking उपलब्ध नहीं है।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bmm-card">
        <div className="bmm-toolbar">
          <h3>
            {showArchivedAgents ? "Archived Agents" : "All Agents"}
            {" "}({visibleAgents.length})
          </h3>

          <div className="bmm-actions">
            <button
              className="bmm-btn bmm-btn-light"
              onClick={() => setShowArchivedAgents(!showArchivedAgents)}
            >
              <RotateCcw size={15} />
              {showArchivedAgents ? "Active Agents" : "Archived Agents"}
            </button>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Agent नाम / मोबाइल खोजें"
            />
          </div>
        </div>

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>Agent ID</th>
                <th>नाम</th>
                <th>मोबाइल</th>
                <th>जिला</th>
                <th>ब्लॉक</th>
                <th>स्थिति</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleAgents.map((agent, index) => (
                <tr key={getAgentId(agent) || index}>
                  <td>{agent.user_code || agent.userId || getAgentId(agent)}</td>

                  <td><strong>{getPersonName(agent)}</strong></td>
                  <td>{getPersonMobile(agent)}</td>
                  <td>{agent.district || "—"}</td>
                  <td>{agent.block || agent.tehsil || "—"}</td>

                  <td>
                    <span
                      className={`bmm-badge ${
                        isActive(agent) ? "bmm-success" : "bmm-warning"
                      }`}
                    >
                      {isActive(agent) ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    <div className="bmm-actions">
                      {!isArchived(agent) ? (
                        <>
                          <button
                            className="bmm-btn bmm-btn-light"
                            onClick={() => openAgentEdit(agent)}
                          >
                            Edit
                          </button>

                          <button
                            className={`bmm-btn ${
                              isActive(agent)
                                ? "bmm-btn-danger"
                                : "bmm-btn-success"
                            }`}
                            disabled={
                              loading ||
                              String(agent.status || "").toLowerCase() === "pending"
                            }
                            onClick={() => toggleAgentStatus(agent)}
                          >
                            <Power size={14} />
                            {isActive(agent) ? "Inactive" : "Active"}
                          </button>

                          <button
                            className="bmm-btn bmm-btn-light"
                            onClick={() => openAgentBookings(agent)}
                          >
                            <ClipboardList size={14} />
                            Bookings
                          </button>

                          <button
                            className="bmm-btn bmm-btn-danger"
                            disabled={loading}
                            onClick={() => archiveAgent(agent)}
                          >
                            <Trash2 size={14} />
                            Archive
                          </button>
                        </>
                      ) : (
                        <button
                          className="bmm-btn bmm-btn-success"
                          disabled={loading}
                          onClick={() => restoreAgent(agent)}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!visibleAgents.length && (
                <tr>
                  <td colSpan={7}>कोई Agent उपलब्ध नहीं है।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ================= REFERRAL MANAGEMENT =================

  const renderReferrals = () => (
    <>
      <SectionTitle
        title="Referral Management"
        subtitle="Referral Members और Commission Management"
        onRefresh={loadReferrals}
        loading={loading}
      />

      <div className="bmm-card">
        <div className="bmm-toolbar">
          <h3>Total Referrals ({visibleReferrals.length})</h3>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="नाम / Referral Code खोजें"
          />
        </div>

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>नाम</th>
                <th>मोबाइल</th>
                <th>Referral Code</th>
                <th>Members</th>
                <th>Commission ₹</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleReferrals.map((referral, index) => {
                const id =
                  referral.id ??
                  referral.referral_id ??
                  referral.user_id;

                return (
                  <React.Fragment key={id || index}>
                    <tr>
                      <td><strong>{getReferralName(referral)}</strong></td>
                      <td>{getPersonMobile(referral)}</td>
                      <td>{getReferralCode(referral)}</td>
                      <td>
                        <button
                          className="bmm-btn bmm-btn-light"
                          onClick={() => toggleReferralMembers(referral)}
                          disabled={membersLoadingId === id}
                        >
                          {membersLoadingId === id
                            ? "Loading..."
                            : "View Members"}
                        </button>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          defaultValue={getReferralCommission(referral)}
                          id={`commission-${id}`}
                          style={{ width: 100 }}
                        />
                      </td>

                      <td>
                        <div className="bmm-actions">
                          <button
                            className="bmm-btn bmm-btn-primary"
                            disabled={loading}
                            onClick={() => {
                              const input = document.getElementById(
                                `commission-${id}`
                              );

                              updateReferralCommission(
                                referral,
                                input?.value
                              );
                            }}
                          >
                            <Save size={14} />
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>

                    {String(expandedReferralId) === String(id) && (
                      <tr>
                        <td colSpan={6}>
                          <div className="bmm-card">
                            <h3>
                              {getReferralName(referral)} के Referral Members
                            </h3>

                            <div className="bmm-table-wrap">
                              <table className="bmm-table">
                                <thead>
                                  <tr>
                                    <th>नाम</th>
                                    <th>मोबाइल</th>
                                    <th>जिला</th>
                                    <th>ब्लॉक</th>
                                    <th>Service</th>
                                    <th>स्थिति</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {getReferralMembers(referral).map(
                                    (member, memberIndex) => (
                                      <tr key={
                                        member.id ||
                                        member.user_id ||
                                        memberIndex
                                      }>
                                        <td>{getPersonName(member)}</td>
                                        <td>{getPersonMobile(member)}</td>
                                        <td>{member.district || "—"}</td>
                                        <td>{member.block || "—"}</td>
                                        <td>{getBookingService(member)}</td>
                                        <td>
                                          {member.status || "Pending"}
                                        </td>
                                      </tr>
                                    )
                                  )}

                                  {!getReferralMembers(referral).length && (
                                    <tr>
                                      <td colSpan={6}>
                                        कोई Referral Member नहीं मिला।
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {!visibleReferrals.length && (
                <tr>
                  <td colSpan={6}>कोई Referral उपलब्ध नहीं है।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ================= SETTINGS =================

  const renderSettings = () => (
    <>
      <SectionTitle
        title="Admin Settings"
        subtitle="Admin Account और Website Information"
        onRefresh={loadDashboard}
        loading={loading}
      />

      <div className="bmm-card">
        <h3>Admin Account</h3>

        <div className="bmm-overview-row">
          <span>नाम</span>
          <strong>{user?.name || user?.full_name || "Admin"}</strong>
        </div>

        <div className="bmm-overview-row">
          <span>मोबाइल</span>
          <strong>{user?.mobile || user?.phone || "—"}</strong>
        </div>

        <div className="bmm-overview-row">
          <span>User ID</span>
          <strong>{user?.userId || user?.user_id || user?.id || "—"}</strong>
        </div>

        <div className="bmm-overview-row">
          <span>Role</span>
          <strong>{user?.role || "Admin"}</strong>
        </div>
      </div>

      <div className="bmm-card">
        <h3>Website Information</h3>

        <div className="bmm-overview-row">
          <span>Website</span>
          <strong>Borewell Mitra MP</strong>
        </div>

        <div className="bmm-overview-row">
          <span>Service Areas</span>
          <strong>मध्य प्रदेश</strong>
        </div>

        <div className="bmm-overview-row">
          <span>Total Districts</span>
          <strong>{DISTRICTS.length}</strong>
        </div>

        <div className="bmm-overview-row">
          <span>Total Services</span>
          <strong>{services.length}</strong>
        </div>
      </div>

      <div className="bmm-card">
        <h3>Account Actions</h3>

        <div className="bmm-actions">
          {onBack && (
            <button
              className="bmm-btn bmm-btn-light"
              onClick={onBack}
            >
              <ArrowLeft size={16} />
              Back to Website
            </button>
          )}

          <button
            className="bmm-btn bmm-btn-danger"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </>
  );

  // ================= MAIN RENDER =================

  const renderPage = () => {
    switch (activePage) {
      case "approvals":
        return renderApprovals();

      case "bookings":
        return renderBookings();

      case "rates":
        return renderRates();

      case "agents":
        return renderAgents();

      case "referrals":
        return renderReferrals();

      case "settings":
        return renderSettings();

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="bmm-admin-layout">

      {/* MOBILE HEADER */}

      <div className="bmm-mobile-header">
        <button
          className="bmm-menu-button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div>
          <strong>Borewell Mitra MP</strong>
          <small>Admin Panel</small>
        </div>
      </div>

      {/* SIDEBAR */}

      <aside className={`bmm-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="bmm-sidebar-brand">
          <div className="bmm-brand-icon">
            <Droplets size={28} />
          </div>

          <div>
            <h2>Borewell Mitra</h2>
            <p>MP Admin Panel</p>
          </div>
        </div>

        <div className="bmm-admin-profile">
          <div className="bmm-admin-avatar">
            <ShieldCheck size={25} />
          </div>

          <div>
            <strong>{user?.name || "Administrator"}</strong>
            <span>Super Admin</span>
          </div>
        </div>

        <nav className="bmm-sidebar-nav">
          <p className="bmm-nav-heading">MAIN MENU</p>

          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={
                  activePage === item.id
                    ? "bmm-nav-item active"
                    : "bmm-nav-item"
                }
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {item.id === "approvals" && pendingUsers.length > 0 && (
                  <span className="bmm-nav-count">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="bmm-sidebar-bottom">
          {onBack && (
            <button
              className="bmm-nav-item"
              onClick={onBack}
            >
              <ArrowLeft size={18} />
              Website पर वापस जाएँ
            </button>
          )}

          <button
            className="bmm-nav-item bmm-logout"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="bmm-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}

      <main className="bmm-admin-main">

        <header className="bmm-topbar">
          <div>
            <h2>
              {navItems.find(item => item.id === activePage)?.label}
            </h2>
            <p>Welcome to Borewell Mitra MP Admin Panel</p>
          </div>

          <div className="bmm-topbar-actions">
            <button
              className="bmm-btn bmm-btn-light"
              onClick={loadDashboard}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "bmm-spin" : ""}
              />
              Refresh
            </button>

            <div className="bmm-topbar-user">
              <ShieldCheck size={19} />
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="bmm-admin-content">

          {error && (
            <div className="bmm-alert bmm-alert-error">
              <XCircle size={19} />
              <span>{error}</span>
              <button onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}

          {notice && (
            <div className="bmm-alert bmm-alert-success">
              <CheckCircle2 size={19} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")}>
                <X size={17} />
              </button>
            </div>
          )}

          {loading && (
            <div className="bmm-loading">
              <RefreshCw size={17} className="bmm-spin" />
              Processing...
            </div>
          )}

          {renderPage()}

          <footer className="bmm-admin-footer">
            <p>
              © {new Date().getFullYear()} Borewell Mitra MP.
              All Rights Reserved.
            </p>
          </footer>

        </div>
      </main>
    </div>
  );
}
