import React, { useEffect, useState } from 'react';
import { DISTRICTS, BLOCKS } from './areas.js';
import CustomerRegistration from './CustomerRegistration';
import './CustomerRegistration.css';
import AdminDashboard from './AdminDashboard';
import AgentDashboard from './AgentDashboard.jsx';
import RateList from "./RateList";
import Rules from "./Rules.jsx";
import AgentContact from './AgentContact.jsx';
import Calculator from './Calculator.jsx';
import Home from "./Home.jsx";
import "./Home.css";
import {
  Droplets, Menu, X, MapPin, Phone, ArrowRight, Drill,
  ShieldCheck, Users, ClipboardList, LogIn, LogOut,
  Gauge, LocateFixed, MessageCircle
} from 'lucide-react';

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

const SERVICES = [
  { value: 'Drilling', label: 'à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤²' },
  { value: 'Repairing', label: 'à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤—' }
];

const EMPTY_BOOKING = {
  name: '',
  phone: '',
  address: '',
  district: '',
  tehsil: '',
  block: '',
  service: '',
  latitude: null,
  longitude: null
};

async function api(path, options = {}) {
  const token = localStorage.getItem("bm_token") || localStorage.getItem("bmm-token");

  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || 'à¤…à¤¨à¥à¤°à¥‹à¤§ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤'
    );
  }

  return data;
}

// à¤¸à¤­à¥€ Dashboard à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤¹à¥€ à¤ªà¥‡à¤œ
function dashboardPage(role) {
  if (role === 'admin') return 'admin';
  if (role === 'agent') return 'agent';
  return 'dashboard';
}
// à¤¸à¤­à¥€ Pages à¤•à¥‡ URL
const PAGE_URLS = {
  home: '/',
  rates: '/rates',
  'agent-contact': '/agents',
  calculator: '/calculator',
  booking: '/booking',
  'booking-status': '/booking-status',
  rules: '/rules',
  auth: '/login',
  dashboard: '/customer-dashboard',
  agent: '/agent-dashboard',
  admin: '/admin-dashboard'
};

// URL à¤¸à¥‡ Page à¤ªà¤¹à¤šà¤¾à¤¨à¤¨à¤¾
function getPageFromURL() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  const routes = {
    '/': 'home',
    '/rates': 'rates',
    '/agents': 'agent-contact',
    '/agent-contact': 'agent-contact',
    '/calculator': 'calculator',
    '/booking': 'booking',
    '/booking-status': 'booking-status',
    '/rules': 'rules',
    '/login': 'auth',
    '/register': 'auth',
    '/customer-dashboard': 'dashboard',
    '/agent-dashboard': 'agent',
    '/admin-dashboard': 'admin'
  };

  return routes[path] || 'home';
}
export default function App() {

  const [page, setPage] = useState(getPageFromURL);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bm_user'));
    } catch {
      return null;
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [users, setUsers] = useState([]);

  const [publicAgents, setPublicAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [booking, setBooking] = useState({ ...EMPTY_BOOKING });
  const [adminBooking, setAdminBooking] = useState({ ...EMPTY_BOOKING });

  const [area, setArea] = useState({
    district: '',
    tehsil: '',
    block: ''
  });

  const [authMode, setAuthMode] = useState('login');
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const [registrationArea, setRegistrationArea] = useState({
    district: '',
    block: ''
  });

  const [authForm, setAuthForm] = useState({
    name: '',
    login: '',
    mobile: '',
    password: '',
    role: 'customer',
    district: '',
    tehsil: '',
    block: '',
    address: '',
    agencyName: '',
    officeAddress: '',
    service: 'New Borewell',
    referralCode: ''
  });

  const [agent, setAgent] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    district: '',
    block: '',
    agencyName: '',
    address: '',
    officeAddress: ''
  });

  const [rateDraft, setRateDraft] = useState([]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }

  function go(next) {
  const url = PAGE_URLS[next] || '/';

  window.history.pushState({}, '', url);

  setPage(next);
  setMenuOpen(false);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
// Browser Back à¤”à¤° Forward URL Control
useEffect(() => {
  function handlePopState() {
    setPage(getPageFromURL());
    setMenuOpen(false);
  }

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);
  const setField = (setter, field, value) => {
    setter(old => ({
      ...old,
      [field]: value
    }));
  };

  // à¤²à¥‰à¤—à¤¿à¤¨ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° à¤¸à¤¹à¥€ Dashboard à¤–à¥‹à¤²à¥‡à¤‚
  useEffect(() => {
    if (!user) return;

    if (page === 'dashboard' && user.role !== 'customer') {
      setPage(dashboardPage(user.role));
    }

    if (page === 'agent' && user.role !== 'agent') {
      setPage(dashboardPage(user.role));
    }

    if (page === 'admin' && user.role !== 'admin') {
      setPage(dashboardPage(user.role));
    }
  }, [user, page]);

  // District à¤”à¤° Block à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° Rate List
  useEffect(() => {
    if (!area.district || !area.block) {
      setRates([]);
      return;
    }

    let cancelled = false;

    async function loadAreaRates() {
      setRatesLoading(true);

      try {
        const query = new URLSearchParams({
          district: area.district,
          block: area.block
        });

        const data = await api(`/rates?${query.toString()}`);

        if (!cancelled) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data.rates)
              ? data.rates
              : [];

          setRates(list);
        }
      } catch (error) {
        if (!cancelled) {
          setRates([]);
          console.error('Rate List Error:', error);
        }
      } finally {
        if (!cancelled) {
          setRatesLoading(false);
        }
      }
    }

    loadAreaRates();

    return () => {
      cancelled = true;
    };
  }, [area.district, area.block]);

  // à¤¸à¤¾à¤°à¥à¤µà¤œà¤¨à¤¿à¤• à¤à¤œà¥‡à¤‚à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ
  async function loadPublicAgents() {
    setAgentsLoading(true);

    try {
      const result = await api('/public/agents');

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result.agents)
          ? result.agents
          : [];

      setPublicAgents(list);
    } catch (error) {
      console.error('Public agents loading error:', error);
      setPublicAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }

  useEffect(() => {
    loadPublicAgents();
  }, []);

  useEffect(() => {
    if (page === 'agent-contact' || page === 'home') {
      loadPublicAgents();
    }
  }, [page]);

  // Customer à¤”à¤° Admin à¤¡à¥‡à¤Ÿà¤¾
  useEffect(() => {
    if (!user || !['dashboard', 'admin'].includes(page)) return;

    async function loadDashboardData() {
      try {
        if (user.role === 'customer') {
          const result = await api('/customer/bookings');

          setBookings(
            Array.isArray(result)
              ? result
              : result.bookings || []
          );
        }

        if (user.role === 'admin') {
          const [b, u, r] = await Promise.all([
            api('/bookings'),
            api('/admin/users'),
            api('/rates')
          ]);

          setBookings(
            Array.isArray(b) ? b : b.bookings || []
          );

          setUsers(
            Array.isArray(u) ? u : u.users || []
          );

          const rateList = Array.isArray(r)
            ? r
            : r.rates || [];

          setRates(rateList);
          setRateDraft(rateList);
        }
      } catch (error) {
        flash(error.message);
      }
    }

    loadDashboardData();
  }, [page, user?.id]);

  // LOGIN à¤”à¤° REGISTRATION
  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);

    try {

      if (authMode === 'register') {

        const result = await api('/auth/register', {
          method: 'POST',

          body: JSON.stringify({
            name: authForm.name.trim(),
            mobile: authForm.mobile.trim(),
            password: authForm.password,
            role: authForm.role,

            district: registrationArea.district,
            tehsil: registrationArea.block,
            block: registrationArea.block,

            address:
              authForm.role === 'customer'
                ? authForm.address.trim()
                : authForm.officeAddress.trim(),

            officeAddress:
              authForm.role === 'agent'
                ? authForm.officeAddress.trim()
                : '',

            agencyName:
              authForm.role === 'agent'
                ? authForm.agencyName.trim()
                : '',

            service:
              authForm.role === 'customer'
                ? authForm.service
                : null,

            referralCode: ''
          })
        });

        setRegistrationSuccess({
          userId: result.userId,
          role: authForm.role,
          name: authForm.name.trim(),
          mobile: authForm.mobile.trim(),
          status: result.user?.status || 'pending'
        });

        setAuthForm(old => ({
          ...old,
          login: old.mobile,
          password: ''
        }));

        return;
      }

      // LOGIN
      const result = await api('/auth/login', {
        method: 'POST',

        body: JSON.stringify({
          login: authForm.login.trim(),
          password: authForm.password
        })
      });

      localStorage.setItem('bm_token', result.token);

      // AgentDashboard à¤•à¥‡ à¤ªà¥à¤°à¤¾à¤¨à¥‡ token key à¤¸à¥‡ à¤­à¥€ compatibility
      localStorage.setItem('bmm-token', result.token);

      localStorage.setItem(
        'bm_user',
        JSON.stringify(result.user)
      );

      setUser(result.user);

      flash('à¤²à¥‰à¤—à¤¿à¤¨ à¤¸à¤«à¤² à¤¹à¥à¤†à¥¤');

      go(dashboardPage(result.user?.role));

    } catch (error) {
      flash(error.message);
    } finally {
      setBusy(false);
    }
  }

  // LOGOUT
  function logout() {
    localStorage.removeItem('bm_token');
    localStorage.removeItem('bmm-token');
    localStorage.removeItem('bm_user');

    setUser(null);
    setBookings([]);

    go('home');

    flash('à¤†à¤ª à¤²à¥‰à¤—à¤†à¤‰à¤Ÿ à¤¹à¥‹ à¤—à¤ à¤¹à¥ˆà¤‚à¥¤');
  }

  // BOOKING SUBMIT
  async function sendBooking(e, isAdmin = false) {
    e.preventDefault();

    const form = isAdmin ? adminBooking : booking;

    const payload = {
      ...form,

      name: String(form.name || '').trim(),

      mobile: String(form.phone || '').trim(),

      district: String(
        area.district || form.district || ''
      ).trim(),

      block: String(
        area.block || form.block || ''
      ).trim(),

      service: String(form.service || '').trim(),

      address: String(form.address || '').trim(),

      village: String(
        form.village || form.address || ''
      ).trim(),

      tehsil: String(
        area.tehsil || form.tehsil || ''
      ).trim(),

      ...(isAdmin ? { createdByAdmin: true } : {})
    };

    if (
      !payload.name ||
      !payload.mobile ||
      !payload.district ||
      !payload.block ||
      !payload.service
    ) {
      flash('à¤¨à¤¾à¤®, à¤®à¥‹à¤¬à¤¾à¤‡à¤², à¤œà¤¿à¤²à¤¾, à¤¬à¥à¤²à¥‰à¤• à¤”à¤° à¤¸à¥‡à¤µà¤¾ à¤­à¤°à¤¨à¤¾ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤');
      return;
    }

    setBusy(true);

    try {
      const result = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!result.success) {
        throw new Error(
          result.message || 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¦à¤°à¥à¤œ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¥€à¥¤'
        );
      }

      if (isAdmin) {
        setAdminBooking({ ...EMPTY_BOOKING });

        flash(
          `à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¦à¤°à¥à¤œ à¤¹à¥à¤ˆà¥¤ ID: ${
            result.bookingCode ||
            result.bookingId ||
            'à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'
          }`
        );

      } else {

        setBookingSuccess({
          bookingCode:
            result.bookingCode ||
            (
              result.bookingId
                ? `KB${String(result.bookingId).padStart(6, '0')}`
                : 'ID à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'
            ),

          status: result.status || 'Pending',

          message:
            result.message ||
            'à¤†à¤ªà¤•à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¦à¤°à¥à¤œ à¤¹à¥‹ à¤—à¤ˆ à¤¹à¥ˆà¥¤',

          booking: result.booking || payload
        });

        setBooking({ ...EMPTY_BOOKING });

        setArea({
          district: '',
          tehsil: '',
          block: ''
        });

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }

    } catch (error) {
      flash(error.message);
    } finally {
      setBusy(false);
    }
  }

  // GPS LOCATION
  function locate() {
    if (!navigator.geolocation) {
      return flash('à¤‡à¤¸ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤®à¥‡à¤‚ GPS à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤');
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setBooking(old => ({
          ...old,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
      },

      () => flash('à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤¦à¥‡à¤‚ à¤”à¤° à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤')
    );
  }

  // ADMIN: AGENT CREATE
  async function createAgent(e) {
    e.preventDefault();
    setBusy(true);

    try {
      await api('/admin/agents', {
        method: 'POST',
        body: JSON.stringify(agent)
      });

      setAgent({
        name: '',
        phone: '',
        email: '',
        password: '',
        district: '',
        block: '',
        agencyName: '',
        address: '',
        officeAddress: ''
      });

      flash('à¤à¤œà¥‡à¤‚à¤Ÿ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤');

      await loadPublicAgents();

    } catch (error) {
      flash(error.message);
    } finally {
      setBusy(false);
    }
  }

  // ADMIN: BOOKING UPDATE
  async function updateBooking(id, patch) {
    try {
      await api(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });

      const result = await api('/bookings');

      setBookings(
        Array.isArray(result)
          ? result
          : result.bookings || []
      );

      flash('à¤¬à¥à¤•à¤¿à¤‚à¤— à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¹à¥à¤ˆà¥¤');

    } catch (error) {
      flash(error.message);
    }
  }

  // ADMIN: RATE SAVE
  async function saveRates() {
    try {
      const result = await api('/admin/rates', {
        method: 'PUT',
        body: JSON.stringify({
          rates: rateDraft
        })
      });

      const list = Array.isArray(result)
        ? result
        : result.rates || [];

      setRates(list);
      setRateDraft(list);

      flash('à¤°à¥‡à¤Ÿ à¤¸à¥‡à¤µ à¤¹à¥‹ à¤—à¤à¥¤');

    } catch (error) {
      flash(error.message);
    }
  }

  const nav = [
    ['home', 'à¤¹à¥‹à¤®'],
    ['rates', 'à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ'],
    ['agent-contact', 'à¤à¤œà¥‡à¤‚à¤Ÿ à¤¸à¤‚à¤ªà¤°à¥à¤•'],
    ['calculator', 'à¤•à¥ˆà¤²à¤•à¥à¤²à¥‡à¤Ÿà¤°'],
    ['booking', 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤°à¥‡à¤‚'],
    ['booking-status', 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸'],
    ['rules', 'à¤¨à¤¿à¤¯à¤® à¤à¤µà¤‚ à¤¶à¤°à¥à¤¤à¥‡à¤‚']
  ];

  return (
    <div className="app-shell">

      {/* HEADER */}
      <header className="topbar">

        <div className="nav-wrap">

          <button
            className="brand"
            onClick={() => go('home')}
          >
            <span className="brand-icon">
              <Droplets size={25} />
            </span>

            <span>
              <b>Borewells Mitra</b>
              <small>à¤†à¤ªà¤•à¥‡ à¤ªà¤¾à¤¨à¥€ à¤•à¤¾ à¤­à¤°à¥‹à¤¸à¥‡à¤®à¤‚à¤¦ à¤¸à¤¾à¤¥à¥€</small>
            </span>
          </button>

          <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>

            {nav.map(([id, label]) => (
              <button
                key={id}
                className={page === id ? 'active' : ''}
                onClick={() => go(id)}
              >
                {label}
              </button>
            ))}

            {user && (
              <button
                onClick={() => go(dashboardPage(user.role))}
              >
                à¤®à¥‡à¤°à¤¾ à¤¡à¥ˆà¤¶à¤¬à¥‹à¤°à¥à¤¡
              </button>
            )}

            {!user ? (
              <button
                className="nav-login"
                onClick={() => {
                  setAuthMode('login');
                  setRegistrationSuccess(null);
                  go('auth');
                }}
              >
                <LogIn size={16} />
                à¤²à¥‰à¤—à¤¿à¤¨ / à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤°
              </button>
            ) : (
              <button
                className="nav-login"
                onClick={logout}
              >
                <LogOut size={16} />
                à¤²à¥‰à¤—à¤†à¤‰à¤Ÿ
              </button>
            )}

          </nav>

          <button
            className="mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

        </div>

      </header>

      {/* NOTIFICATION */}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice('')}>Ã—</button>
        </div>
      )}

      <main>

        {/* HOME */}
        {page === 'home' && (
          <Home
            go={go}
            agents={publicAgents}
            agentsLoading={agentsLoading}
          />
        )}

    

{/* RATE LIST */}
{page === 'rates' && <RateList />}

        {/* RULES & CONDITIONS */}
        {page === 'rules' && <Rules />}

        {/* NEW AGENT CONTACT */}
{page === 'agent-contact' && (
  <AgentContact />
)}

        {/* CALCULATOR */}
        {page === 'calculator' && <Calculator />}

        {/* BOOKING STATUS */}
        {page === 'booking-status' && <BookingStatus />}

        {/* BOOKING */}
        {page === 'booking' && (
          <section className="section container narrow">

            <SectionTitle
              eyebrow="BOOK A SERVICE"
              title="à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¬à¥à¤•à¤¿à¤‚à¤— à¤«à¥‰à¤°à¥à¤®"
              subtitle="à¤¬à¤¿à¤¨à¤¾ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤¿à¤ à¤…à¤ªà¤¨à¥€ à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤"
            />

            {bookingSuccess ? (

              <div className="form-card booking-status-result">

                <div className="section-heading">

                  <div>
                    <span className="eyebrow">
                      BOOKING SUCCESSFUL
                    </span>

                    <h2>à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¦à¤°à¥à¤œ à¤¹à¥à¤ˆ!</h2>
                  </div>

                  <span className="status-chip">
                    {bookingSuccess.status}
                  </span>

                </div>

                <p>{bookingSuccess.message}</p>

                <div className="booking-status-details">

                  <p>
                    <b>à¤†à¤ªà¤•à¥€ Booking ID:</b>
                    <strong>{bookingSuccess.bookingCode}</strong>
                  </p>

                  <p>
                    <b>à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¥à¤¥à¤¿à¤¤à¤¿:</b>
                    <span>{bookingSuccess.status}</span>
                  </p>

                  <p>
                    <b>à¤¸à¥‡à¤µà¤¾:</b>
                    <span>
                      {bookingSuccess.booking?.service || 'â€”'}
                    </span>
                  </p>

                  <p>
                    <b>à¤œà¤¿à¤²à¤¾ / à¤¬à¥à¤²à¥‰à¤•:</b>
                    <span>
                      {bookingSuccess.booking?.district || 'â€”'}
                      {' / '}
                      {bookingSuccess.booking?.block || 'â€”'}
                    </span>
                  </p>

                </div>

                <div
                  className="hero-actions"
                  style={{ marginTop: 20 }}
                >

                  <button
                    className="btn primary"
                    onClick={() => {
                      setBookingSuccess(null);
                      go(user ? dashboardPage(user.role) : 'booking-status');
                    }}
                  >
                    {user ? 'à¤®à¥‡à¤°à¤¾ à¤¡à¥ˆà¤¶à¤¬à¥‹à¤°à¥à¤¡ à¤¦à¥‡à¤–à¥‡à¤‚' : 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸ à¤¦à¥‡à¤–à¥‡à¤‚'}
                  </button>

                  <button
                    className="btn outline"
                    onClick={() => setBookingSuccess(null)}
                  >
                    à¤¨à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤°à¥‡à¤‚
                  </button>

                </div>

              </div>

            ) : (

              <form
                className="form-card"
                onSubmit={e => sendBooking(e)}
              >

                <BookingFields
                  value={booking}
                  onChange={(k, v) =>
                    setField(setBooking, k, v)
                  }
                  area={area}
                  setArea={setArea}
                />

                <button
                  type="button"
                  className="btn outline"
                  onClick={locate}
                >
                  <LocateFixed size={17} />
                  {booking.latitude
                    ? 'à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤®à¤¿à¤² à¤—à¤ˆ'
                    : 'à¤®à¥‡à¤°à¥€ GPS à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤œà¥‹à¤¡à¤¼à¥‡à¤‚'}
                </button>

                {booking.latitude && (
                  <p className="muted">
                    GPS: {booking.latitude.toFixed(5)},
                    {' '}
                    {booking.longitude.toFixed(5)}
                  </p>
                )}

                <button
                  disabled={busy}
                  className="btn primary full-btn"
                >
                  {busy
                    ? 'à¤­à¥‡à¤œ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚â€¦'
                    : 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¤°à¥‡à¤‚'}
                </button>

              </form>

            )}

          </section>
        )}

        {/* LOGIN / REGISTER */}
        {['auth', 'login', 'register'].includes(page) && (
          <section className="section container narrow">

            <SectionTitle
              eyebrow="YOUR ACCOUNT"
              title={
                authMode === 'login'
                  ? 'à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚'
                  : 'à¤…à¤ªà¤¨à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤à¤'
              }
              subtitle="Borewells Mitra à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥‡à¤‚ à¤”à¤° à¤…à¤ªà¤¨à¥€ à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¤¾ à¤²à¤¾à¤­ à¤²à¥‡à¤‚à¥¤"
            />

            <div className="auth-switch">

              <button
                type="button"
                className={authMode === 'login' ? 'selected' : ''}
                onClick={() => setAuthMode('login')}
              >
                à¤²à¥‰à¤—à¤¿à¤¨
              </button>

              <button
                type="button"
                className={authMode === 'register' ? 'selected' : ''}
                onClick={() => setAuthMode('register')}
              >
                à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤°
              </button>

            </div>

            {registrationSuccess ? (

              <div className="form-card auth-card registration-success">

                <h2>à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£ à¤¸à¤«à¤² à¤¹à¥à¤†!</h2>

                <p>
                  à¤†à¤ªà¤•à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¨ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤
                  à¤…à¤ªà¤¨à¥€ User ID à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¤–à¥‡à¤‚à¥¤
                </p>

                <div className="registration-user-id">
                  <span>à¤†à¤ªà¤•à¥€ User ID</span>
                  <strong>{registrationSuccess.userId}</strong>
                </div>

                <p>
                  <strong>à¤¨à¤¾à¤®:</strong>
                  {' '}
                  {registrationSuccess.name}
                </p>

                <p>
                  <strong>à¤®à¥‹à¤¬à¤¾à¤‡à¤²:</strong>
                  {' '}
                  {registrationSuccess.mobile}
                </p>

                <p>
                  <strong>à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ:</strong>
                  {' '}
                  {registrationSuccess.role === 'agent'
                    ? 'à¤à¤œà¥‡à¤‚à¤Ÿ'
                    : 'à¤—à¥à¤°à¤¾à¤¹à¤•'}
                </p>

                <p className="muted">
                  à¤¸à¥à¤¥à¤¿à¤¤à¤¿: Pending â€” à¤à¤¡à¤®à¤¿à¤¨ à¤•à¥€ à¤®à¤‚à¤œà¤¼à¥‚à¤°à¥€ à¤•à¥‡ à¤¬à¤¾à¤¦
                  à¤†à¤ªà¤•à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¹à¥‹à¤—à¤¾à¥¤ à¤‰à¤¸à¤•à¥‡ à¤¬à¤¾à¤¦ User ID
                  à¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤”à¤° à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¸à¥‡ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚à¥¤
                </p>

                <button
                  type="button"
                  className="btn primary full-btn"
                  onClick={() => {
                    setRegistrationSuccess(null);
                    setAuthMode('login');

                    setAuthForm(old => ({
                      ...old,
                      login: registrationSuccess.mobile,
                      password: ''
                    }));
                  }}
                >
                  à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚
                </button>

                <button
                  type="button"
                  className="btn full-btn"
                  onClick={() => setRegistrationSuccess(null)}
                >
                  à¤µà¤¾à¤ªà¤¸
                </button>

              </div>

            ) : (

              <form
                className="form-card auth-card"
                onSubmit={submitAuth}
              >

                {authMode === 'register' && (
                  <>

                    <label>
                      à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® *

                      <input
                        required
                        value={authForm.name}
                        onChange={e =>
                          setField(
                            setAuthForm,
                            'name',
                            e.target.value
                          )
                        }
                        placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
                      />
                    </label>

                    <label>
                      à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *

                      <input
                        required
                        inputMode="numeric"
                        maxLength="10"
                        pattern="[6-9][0-9]{9}"
                        value={authForm.mobile}
                        onChange={e =>
                          setField(
                            setAuthForm,
                            'mobile',
                            e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 10)
                          )
                        }
                        placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
                      />
                    </label>

                    <label>
                      à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤ªà¥à¤°à¤•à¤¾à¤° *

                      <select
                        value={authForm.role}
                        onChange={e =>
                          setField(
                            setAuthForm,
                            'role',
                            e.target.value
                          )
                        }
                      >
                        <option value="customer">à¤—à¥à¤°à¤¾à¤¹à¤•</option>
                        <option value="agent">
                          à¤à¤œà¥‡à¤‚à¤Ÿ (à¤®à¤‚à¤œà¤¼à¥‚à¤°à¥€ à¤†à¤µà¤¶à¥à¤¯à¤•)
                        </option>
                      </select>
                    </label>

                    <RegistrationAreaFields
                      area={registrationArea}
                      setArea={setRegistrationArea}
                    />

                    {authForm.role === 'customer' ? (

                      <>

                        <label>
                          à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *

                          <textarea
                            required
                            rows="3"
                            value={authForm.address}
                            onChange={e =>
                              setField(
                                setAuthForm,
                                'address',
                                e.target.value
                              )
                            }
                            placeholder="à¤—à¤¾à¤à¤µ, à¤µà¤¾à¤°à¥à¤¡, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾ à¤”à¤° à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾"
                          />
                        </label>

                        <label>
                          à¤•à¥Œà¤¨-à¤¸à¥€ à¤¸à¥‡à¤µà¤¾ à¤šà¤¾à¤¹à¤¿à¤? *

                          <select
                            required
                            value={authForm.service}
                            onChange={e =>
                              setField(
                                setAuthForm,
                                'service',
                                e.target.value
                              )
                            }
                          >
                            <option value="New Borewell">
                              à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤²
                            </option>

                            <option value="Repairing">
                              à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤—
                            </option>

                          </select>
                        </label>

                      </>

                    ) : (

                      <>

                        <label>
                          à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤® *

                          <input
                            required
                            value={authForm.agencyName}
                            onChange={e =>
                              setField(
                                setAuthForm,
                                'agencyName',
                                e.target.value
                              )
                            }
                            placeholder="à¤…à¤ªà¤¨à¥€ à¤à¤œà¥‡à¤‚à¤¸à¥€ à¤•à¤¾ à¤¨à¤¾à¤®"
                          />
                        </label>

                        <label>
                          à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *

                          <textarea
                            required
                            rows="3"
                            value={authForm.officeAddress}
                            onChange={e =>
                              setField(
                                setAuthForm,
                                'officeAddress',
                                e.target.value
                              )
                            }
                            placeholder="à¤‘à¤«à¤¿à¤¸ à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾"
                          />
                        </label>

                      </>

                    )}

                  </>
                )}

                {authMode === 'login' && (
                  <label>
                    User ID à¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *

                    <input
                      required
                      value={authForm.login}
                      onChange={e =>
                        setField(
                          setAuthForm,
                          'login',
                          e.target.value
                        )
                      }
                      placeholder="ADMIN / KC00001 / 9876543210"
                    />
                  </label>
                )}

                <label>
                  à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ *

                  <input
                    required
                    type="password"
                    minLength={
                      authMode === 'register' ? 8 : undefined
                    }
                    value={authForm.password}
                    onChange={e =>
                      setField(
                        setAuthForm,
                        'password',
                        e.target.value
                      )
                    }
                    placeholder={
                      authMode === 'register'
                        ? 'à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤°'
                        : 'à¤…à¤ªà¤¨à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤²à¤¿à¤–à¥‡à¤‚'
                    }
                  />
                </label>

                <button
                  disabled={busy}
                  className="btn primary full-btn"
                >
                  {busy
                    ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¾ à¤•à¤°à¥‡à¤‚â€¦'
                    : authMode === 'login'
                      ? 'à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚'
                      : 'à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤° à¤•à¤°à¥‡à¤‚'}
                </button>

                <p className="switch-auth">

                  {authMode === 'login'
                    ? 'à¤¨à¤¯à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤šà¤¾à¤¹à¤¿à¤?'
                    : 'à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¹à¥ˆ?'}

                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationSuccess(null);

                      setAuthMode(
                        authMode === 'login'
                          ? 'register'
                          : 'login'
                      );
                    }}
                  >
                    {authMode === 'login'
                      ? 'à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤° à¤•à¤°à¥‡à¤‚'
                      : 'à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚'}
                  </button>

                </p>

                {authMode === 'register' && (
                  <p className="muted tiny">
                    à¤à¤œà¥‡à¤‚à¤Ÿ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤à¤¡à¤®à¤¿à¤¨ à¤•à¥€ à¤®à¤‚à¤œà¤¼à¥‚à¤°à¥€ à¤•à¥‡ à¤¬à¤¾à¤¦
                    à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¹à¥‹à¤—à¤¾à¥¤ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¤® à¤¸à¥‡ à¤•à¤® 8 à¤…à¤•à¥à¤·à¤° à¤•à¤¾ à¤°à¤–à¥‡à¤‚à¥¤
                  </p>
                )}

              </form>

            )}

          </section>
        )}

        {/* CUSTOMER DASHBOARD */}
        {page === 'dashboard' && (
          user?.role === 'customer' ? (

            <section className="section container">

              <SectionTitle
                eyebrow="MY ACCOUNT"
                title={`à¤¨à¤®à¤¸à¥à¤¤à¥‡, ${user?.name || 'à¤¯à¥‚à¤œà¤¼à¤°'}!`}
                subtitle="à¤¯à¤¹à¤¾à¤ à¤…à¤ªà¤¨à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤”à¤° à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¦à¥‡à¤–à¥‡à¤‚à¥¤"
              />

              <div className="stats-grid">

                <Stat
                  icon={<ClipboardList />}
                  title="à¤®à¥‡à¤°à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤—"
                  value={bookings.length}
                />

                <Stat
                  icon={<Users />}
                  title="à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤ªà¥à¤°à¤•à¤¾à¤°"
                  value={roleLabel(user?.role)}
                />

                <Stat
                  icon={<ShieldCheck />}
                  title="à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¸à¥à¤¥à¤¿à¤¤à¤¿"
                  value={
                    ['pending', 'pending_approval'].includes(user?.status)
                      ? 'à¤®à¤‚à¤œà¤¼à¥‚à¤°à¥€ à¤¬à¤¾à¤•à¥€'
                      : 'à¤¸à¤•à¥à¤°à¤¿à¤¯'
                  }
                />

              </div>

              <div className="section-heading">

                <h2>à¤®à¥‡à¤°à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤—</h2>

                <button
                  className="btn primary"
                  onClick={() => go('booking')}
                >
                  + à¤¨à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤—
                </button>

              </div>

              <BookingList bookings={bookings} />

            </section>

          ) : (

            <section className="section container">
              <Empty text="à¤¯à¤¹ à¤¡à¥ˆà¤¶à¤¬à¥‹à¤°à¥à¤¡ à¤•à¥‡à¤µà¤² à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¥‡ à¤²à¤¿à¤ à¤¹à¥ˆà¥¤" />
            </section>

          )
        )}

        {/* AGENT DASHBOARD */}
        {page === 'agent' && (
          user?.role === 'agent' ? (

            <AgentDashboard
              user={user}
              onLogout={logout}
            />

          ) : (

            <section className="section container">
              <div className="login-prompt">
                <p>à¤¯à¤¹ à¤ªà¥‡à¤œ à¤•à¥‡à¤µà¤² à¤à¤œà¥‡à¤‚à¤Ÿ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¥‡ à¤¬à¤¾à¤¦ à¤–à¥à¤²à¥‡à¤—à¤¾à¥¤</p>

                <button
                  className="btn primary"
                  onClick={() => {
                    setAuthMode('login');
                    go('auth');
                  }}
                >
                  à¤à¤œà¥‡à¤‚à¤Ÿ à¤²à¥‰à¤—à¤¿à¤¨
                </button>
              </div>
            </section>

          )
        )}

        {/* ADMIN DASHBOARD */}
        {page === 'admin' && (
          user?.role === 'admin' ? (

            <AdminDashboard
              user={user}
              onLogout={logout}
              onBack={() => go('home')}
            />

          ) : (

            <section className="section container">
              <div className="login-prompt">

                <p>
                  à¤¯à¤¹ à¤ªà¥‡à¤œ à¤•à¥‡à¤µà¤² à¤à¤¡à¤®à¤¿à¤¨ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¥‡ à¤¬à¤¾à¤¦ à¤–à¥à¤²à¥‡à¤—à¤¾à¥¤
                </p>

                <button
                  className="btn primary"
                  onClick={() => {
                    setAuthMode('login');
                    go('auth');
                  }}
                >
                  à¤à¤¡à¤®à¤¿à¤¨ à¤²à¥‰à¤—à¤¿à¤¨
                </button>

              </div>
            </section>

          )
        )}

      </main>

      {/* FOOTER */}
      <footer className="footer">

        <div className="container footer-inner">

          <div className="brand footer-brand">

            <span className="brand-icon">
              <Droplets />
            </span>

            <span>
              <b>Borewells Mitra</b>
              <small>à¤®à¤§à¥à¤¯ à¤ªà¥à¤°à¤¦à¥‡à¤¶ à¤®à¥‡à¤‚ à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¤¾ à¤®à¤‚à¤š</small>
            </span>

          </div>

          <p>
            <MapPin size={15} />
            à¤®à¤§à¥à¤¯ à¤ªà¥à¤°à¤¦à¥‡à¤¶, à¤­à¤¾à¤°à¤¤
          </p>

          <p>
            <Phone size={15} />
            à¤¸à¤‚à¤ªà¤°à¥à¤• à¤µà¤¿à¤µà¤°à¤£ à¤à¤¡à¤®à¤¿à¤¨ à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤œà¥‹à¤¡à¤¼à¤¾ à¤œà¤¾à¤¨à¤¾ à¤¹à¥ˆ
          </p>

          <small>
            Â© {new Date().getFullYear()} Borewells Mitra
          </small>

        </div>

      </footer>

    </div>
  );
}

/* =====================================
   PUBLIC AGENT LIST
===================================== */

function AgentList({ agents = [], loading = false, limit }) {

  if (loading) {
    return (
      <div className="empty">
        <p>à¤à¤œà¥‡à¤‚à¤Ÿà¥‹à¤‚ à¤•à¥€ à¤¸à¥‚à¤šà¥€ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</p>
      </div>
    );
  }

  const visibleAgents = limit
    ? agents.slice(0, limit)
    : agents;

  if (!visibleAgents.length) {
    return (
      <div className="empty">
        <Users size={28} />
        <p>
          à¤…à¤­à¥€ à¤†à¤ªà¤•à¥‡ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥‹à¤ˆ à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤”à¤° à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤à¤œà¥‡à¤‚à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤
        </p>
      </div>
    );
  }

  return (
    <div className="agent-contact-grid">

      {visibleAgents.map((agent, index) => {

        const mobile = String(
          agent.mobile || ''
        ).replace(/\D/g, '');

        const validMobile = /^\d{10}$/.test(mobile);

        return (

          <article
            className="agent-contact-card"
            key={agent.id || `${agent.mobile}-${index}`}
          >

            <div className="agent-contact-header">

              <div>
                <span className="eyebrow">
                  BOREWELLS MITRA AGENT
                </span>

                <h3>{agent.name || 'à¤à¤œà¥‡à¤‚à¤Ÿ'}</h3>
              </div>

              <span className="agent-active-label">
                à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤à¤œà¥‡à¤‚à¤Ÿ
              </span>

            </div>

            {agent.agency_name && (
              <p className="agent-agency">
                <b>à¤à¤œà¥‡à¤‚à¤¸à¥€:</b>
                {' '}
                {agent.agency_name}
              </p>
            )}

            <div className="agent-contact-details">

              <p>
                <MapPin size={16} />

                <span>
                  {agent.district || 'à¤œà¤¿à¤²à¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'}
                  {agent.block ? `, ${agent.block}` : ''}
                </span>
              </p>

              {agent.office_address && (
                <p>
                  <MapPin size={16} />
                  <span>{agent.office_address}</span>
                </p>
              )}

              <p>
                <Phone size={16} />
                <span>
                  {agent.mobile || 'à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'}
                </span>
              </p>

            </div>

            {validMobile ? (

              <div className="agent-contact-actions">

                <a
                  className="btn primary"
                  href={`tel:${mobile}`}
                >
                  <Phone size={16} />
                  à¤•à¥‰à¤² à¤•à¤°à¥‡à¤‚
                </a>

                <a
                  className="btn outline"
                  href={`https://wa.me/91${mobile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>

              </div>

            ) : (

              <p className="muted tiny">
                à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤¹à¥€ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤
              </p>

            )}

          </article>

        );
      })}

    </div>
  );
}


/* =====================================
   PUBLIC BOOKING STATUS
===================================== */

function BookingStatus() {

  const [bookingId, setBookingId] = useState('');
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchBooking(e) {
    e.preventDefault();

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api('/public/booking-status', {
        method: 'POST',

        body: JSON.stringify({
          bookingId: bookingId.trim().toUpperCase(),
          mobile: mobile.trim()
        })
      });

      if (data.success && data.booking) {
        setResult(data.booking);
      } else {
        setError(
          data.message || 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤'
        );
      }

    } catch (error) {
      setError(
        error.message || 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤–à¥‹à¤œà¤¨à¥‡ à¤®à¥‡à¤‚ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤¹à¥à¤ˆà¥¤'
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return 'à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚';

    const parsed = new Date(
      String(date).replace(' ', 'T')
    );

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleString('hi-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <section className="section container narrow">

      <SectionTitle
        eyebrow="TRACK YOUR BOOKING"
        title="à¤…à¤ªà¤¨à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤•à¤¾ à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸ à¤¦à¥‡à¤–à¥‡à¤‚"
        subtitle="à¤…à¤ªà¤¨à¥€ Booking ID à¤”à¤° à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤°à¥à¤¡ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤"
      />

      <form
        className="form-card"
        onSubmit={searchBooking}
      >

        <label>
          Booking ID *

          <input
            required
            value={bookingId}
            onChange={e =>
              setBookingId(e.target.value.toUpperCase())
            }
            placeholder="à¤‰à¤¦à¤¾à¤¹à¤°à¤£: KB000001"
          />
        </label>

        <label>
          à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤°à¥à¤¡ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *

          <input
            required
            type="tel"
            inputMode="numeric"
            maxLength="10"
            pattern="[0-9]{10}"
            value={mobile}
            onChange={e =>
              setMobile(
                e.target.value.replace(/\D/g, '').slice(0, 10)
              )
            }
            placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn primary full-btn"
        >
          {loading
            ? 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤–à¥‹à¤œ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...'
            : 'à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸ à¤¦à¥‡à¤–à¥‡à¤‚'}
        </button>

        {error && (
          <div className="empty">
            <p>{error}</p>
          </div>
        )}

      </form>

      {result && (

        <div className="form-card booking-status-result">

          <div className="section-heading">

            <div>
              <span className="eyebrow">BOOKING DETAILS</span>
              <h2>{result.bookingCode}</h2>
            </div>

            <span className="status-chip">
              {result.status}
            </span>

          </div>

          <div className="booking-status-details">

            <p>
              <b>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤®:</b>
              <span>{result.customerName}</span>
            </p>

            <p>
              <b>à¤¸à¥‡à¤µà¤¾:</b>
              <span>{result.service}</span>
            </p>

            <p>
              <b>à¤œà¤¿à¤²à¤¾:</b>
              <span>{result.district}</span>
            </p>

            <p>
              <b>à¤¬à¥à¤²à¥‰à¤•:</b>
              <span>{result.block}</span>
            </p>

            <p>
              <b>à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¤à¤¾à¤°à¥€à¤–:</b>
              <span>{formatDate(result.bookingDate)}</span>
            </p>

            <p>
              <b>à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¥à¤¥à¤¿à¤¤à¤¿:</b>

              <span>
                {result.paymentVerified
                  ? 'à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤'
                  : 'à¤…à¤­à¥€ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¨à¤¹à¥€à¤‚'}
              </span>
            </p>

          </div>

          <div className="divider"></div>

          <h3>à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€</h3>

          {result.agent ? (

            <div className="agent-contact-details">

              <p>
                <b>à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¤¾ à¤¨à¤¾à¤®:</b>
                {result.agent.name || 'à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'}
              </p>

              <p>
                <b>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°:</b>
                {result.agent.mobile || 'à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚'}
              </p>

              {result.agent.agencyName && (
                <p>
                  <b>à¤à¤œà¥‡à¤‚à¤¸à¥€:</b>
                  {result.agent.agencyName}
                </p>
              )}

              {result.agent.mobile && (
                <a
                  className="btn primary"
                  href={`tel:${result.agent.mobile}`}
                >
                  <Phone size={16} />
                  à¤à¤œà¥‡à¤‚à¤Ÿ à¤•à¥‹ à¤•à¥‰à¤² à¤•à¤°à¥‡à¤‚
                </a>
              )}

            </div>

          ) : (

            <p className="muted">
              à¤…à¤­à¥€ à¤‡à¤¸ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤ªà¤° à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤† à¤¹à¥ˆà¥¤
              à¤à¤¡à¤®à¤¿à¤¨ à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤à¤œà¥‡à¤‚à¤Ÿ à¤¨à¤¿à¤¯à¥à¤•à¥à¤¤ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤¯à¤¹à¤¾à¤ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤—à¥€à¥¤
            </p>

          )}

          <button
            type="button"
            className="btn outline"
            onClick={() => {
              setResult(null);
              setError('');
              setBookingId('');
              setMobile('');
            }}
          >
            à¤¦à¥‚à¤¸à¤°à¥€ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤–à¥‹à¤œà¥‡à¤‚
          </button>

        </div>

      )}

    </section>
  );
}

/* =====================================
   COMMON COMPONENTS
===================================== */

function RegistrationAreaFields({ area, setArea }) {

  const blocks = area.district
    ? (BLOCKS[area.district] || [])
    : [];

  return (
    <>

      <label>
        à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          required
          value={area.district}
          onChange={e =>
            setArea({
              district: e.target.value,
              block: ''
            })
          }
        >
          <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {DISTRICTS.map(district => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}

        </select>
      </label>

      <label>
        à¤¤à¤¹à¤¸à¥€à¤² / à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          required
          disabled={!area.district}
          value={area.block}
          onChange={e =>
            setArea(old => ({
              ...old,
              block: e.target.value
            }))
          }
        >
          <option value="">-- à¤¤à¤¹à¤¸à¥€à¤² / à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {blocks.map(block => (
            <option key={block} value={block}>
              {block}
            </option>
          ))}

        </select>
      </label>

    </>
  );
}

function AreaFields({ area, setArea }) {

  const blocks = area.district
    ? (BLOCKS[area.district] || [])
    : [];

  return (
    <div className="area-select">

      <label>
        à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          value={area.district}
          onChange={e => {
            setArea({
              district: e.target.value,
              tehsil: '',
              block: ''
            });
          }}
        >
          <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {DISTRICTS.map(district => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}

        </select>
      </label>

      <label>
        à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          value={area.block}
          disabled={!area.district}
          onChange={e => {
            setArea(old => ({
              ...old,
              block: e.target.value
            }));
          }}
        >
          <option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {blocks.map(block => (
            <option key={block} value={block}>
              {block}
            </option>
          ))}

        </select>
      </label>

    </div>
  );
}

function BookingFields({ value, onChange, area, setArea }) {

  const blocks = area.district
    ? (BLOCKS[area.district] || [])
    : [];

  return (
    <div className="form-grid">

      <label>
        à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤® *

        <input
          type="text"
          required
          value={value.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
        />
      </label>

      <label>
        à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *

        <input
          type="tel"
          required
          inputMode="numeric"
          maxLength="10"
          pattern="[6-9][0-9]{9}"
          value={value.phone}
          onChange={e =>
            onChange(
              'phone',
              e.target.value.replace(/\D/g, '').slice(0, 10)
            )
          }
          placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
        />
      </label>

      <label>
        à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          required
          value={area.district}
          onChange={e => {
            setArea({
              district: e.target.value,
              tehsil: '',
              block: ''
            });
          }}
        >
          <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {DISTRICTS.map(district => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}

        </select>
      </label>

      <label>
        à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          required
          disabled={!area.district}
          value={area.block}
          onChange={e => {
            setArea(old => ({
              ...old,
              block: e.target.value
            }));
          }}
        >
          <option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>

          {blocks.map(block => (
            <option key={block} value={block}>
              {block}
            </option>
          ))}

        </select>
      </label>

      <label className="full">
        à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *

        <textarea
          required
          rows="3"
          value={value.address}
          onChange={e => onChange('address', e.target.value)}
          placeholder="à¤—à¤¾à¤à¤µ, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾, à¤ªà¥‹à¤¸à¥à¤Ÿ à¤”à¤° à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡ à¤¸à¤¹à¤¿à¤¤ à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ à¤²à¤¿à¤–à¥‡à¤‚"
        />
      </label>

      <label className="full">
        à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ *

        <select
          required
          value={value.service}
          onChange={e => onChange('service', e.target.value)}
        >
          <option value="">-- à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>
          <option value="Drilling">à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤²</option>
          <option value="Repairing">à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤—</option>
        </select>
      </label>

    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Stat({ icon, title, value }) {
  return (
    <article className="stat-card">

      <span className="stat-icon">
        {icon}
      </span>

      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>

    </article>
  );
}

function BookingList({ bookings = [] }) {

  return bookings.length ? (

    <div className="booking-list">

      {bookings.map(booking => (

        <article
          className="booking-row"
          key={booking.id}
        >

          <div>

            <b>{booking.service}</b>

            <small>
              {booking.bookingCode ||
                booking.booking_code ||
                booking.id ||
                'Booking'}

              {' Â· '}

              {(booking.createdAt || booking.created_at)
                ? new Date(
                    booking.createdAt || booking.created_at
                  ).toLocaleDateString('hi-IN')
                : ''}
            </small>

            <p>{booking.address}</p>

          </div>

          <span className="status-chip">
            {booking.status}
          </span>

        </article>

      ))}

    </div>

  ) : (

    <Empty text="à¤…à¤­à¥€ à¤†à¤ªà¤•à¥€ à¤•à¥‹à¤ˆ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤" />

  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <ClipboardList size={28} />
      <p>{text}</p>
    </div>
  );
}

function roleLabel(role) {
  return ({
    admin: 'à¤à¤¡à¤®à¤¿à¤¨',
    customer: 'à¤—à¥à¤°à¤¾à¤¹à¤•',
    agent: 'à¤à¤œà¥‡à¤‚à¤Ÿ',
    referrer: 'à¤°à¥‡à¤«à¤°à¤² à¤ªà¤¾à¤°à¥à¤Ÿà¤¨à¤°'
  })[role] || 'à¤¯à¥‚à¤œà¤¼à¤°';
}