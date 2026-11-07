import React, { useEffect, useState } from 'react';
import { DISTRICTS, BLOCKS } from "./areas.js";
import CustomerRegistration from "./CustomerRegistration";
import "./CustomerRegistration.css";
import AdminDashboard from "./AdminDashboard";
import {
  Droplets, Menu, X, MapPin, Phone, ArrowRight, Drill,
  ShieldCheck, Users, ClipboardList, LogIn, LogOut,
  Gauge, LocateFixed, MessageCircle
} from 'lucide-react';

const API = `${window.location.protocol}//${window.location.hostname}:4000/api`;

const SERVICES = [
  { value: 'Drilling', label: 'नया बोरवेल' },
  { value: 'Repairing', label: 'बोरवेल रिपेयरिंग' }
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
  const token = localStorage.getItem('bm_token');

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
    throw new Error(data.message || data.error || 'अनुरोध पूरा नहीं हुआ।');
  }

  return data;
}

export default function App() {
  const [page, setPage] = useState('home');

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

  // सार्वजनिक एजेंट सूची
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
  const [registrationArea, setRegistrationArea] = useState({ district: '', block: '' });

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
  const [statusPage, setStatusPage] = useState(false);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }

  function go(next) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // District और Block के अनुसार Rate List लोड
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
        console.error("Rate List Error:", error);
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

  // सार्वजनिक एजेंट लिस्ट लोड
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

  // वेबसाइट खुलने पर एजेंट लिस्ट लोड करें
  useEffect(() => {
    loadPublicAgents();
  }, []);

  // एजेंट संपर्क पेज खोलने पर सूची दोबारा अपडेट करें
  useEffect(() => {
    if (page === 'agent-contact' || page === 'home') {
      loadPublicAgents();
    }
  }, [page]);

  // डैशबोर्ड और एडमिन डेटा
  useEffect(() => {
    if (!user || !['dashboard', 'admin'].includes(page)) return;

    (async () => {
      try {
        const b = user.role === 'customer'
          ? await api('/customer/bookings')
          : await api('/bookings');
        setBookings(Array.isArray(b) ? b : Array.isArray(b.bookings) ? b.bookings : []);

        if (user.role === 'admin') {
          const [u, r] = await Promise.all([
            api('/admin/users'),
            api('/rates')
          ]);

          setUsers(u);
          setRates(r);
          setRateDraft(r);
        }
      } catch (e) {
        flash(e.message);
      }
    })();
  }, [page, user?.id]);

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
            address: authForm.role === 'customer' ? authForm.address.trim() : authForm.officeAddress.trim(),
            officeAddress: authForm.role === 'agent' ? authForm.officeAddress.trim() : '',
            agencyName: authForm.role === 'agent' ? authForm.agencyName.trim() : '',
            service: authForm.role === 'customer' ? authForm.service : null,
            referralCode: authForm.referralCode.trim()
          })
        });

        setRegistrationSuccess({
          userId: result.userId,
          role: authForm.role,
          name: authForm.name.trim(),
          mobile: authForm.mobile.trim(),
          status: result.user?.status || 'pending'
        });
        setAuthForm(old => ({ ...old, login: old.mobile, password: '' }));
        return;
      }

      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: authForm.login.trim(),
          password: authForm.password
        })
      });

      localStorage.setItem('bm_token', result.token);
      localStorage.setItem('bm_user', JSON.stringify(result.user));

      setUser(result.user);

      flash('लॉगिन सफल हुआ।');

      go(result.user?.role === 'admin' ? 'admin' : 'dashboard');

    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('bm_token');
    localStorage.removeItem('bm_user');

    setUser(null);
    go('home');

    flash('आप लॉगआउट हो गए हैं।');
  }

  async function sendBooking(e, isAdmin = false) {
  e.preventDefault();

  const form = isAdmin ? adminBooking : booking;

  const payload = {
    ...form,
    name: String(form.name || '').trim(),
    mobile: String(form.phone || '').trim(),
    district: String(area.district || form.district || '').trim(),
    block: String(area.block || form.block || '').trim(),
    service: String(form.service || '').trim(),
    address: String(form.address || '').trim(),
    village: String(form.village || form.address || '').trim(),
    tehsil: String(area.tehsil || form.tehsil || '').trim(),
    ...(isAdmin ? { createdByAdmin: true } : {})
  };

  if (
    !payload.name ||
    !payload.mobile ||
    !payload.district ||
    !payload.block ||
    !payload.service
  ) {
    flash('नाम, मोबाइल, जिला, ब्लॉक और सेवा भरना आवश्यक है।');
    return;
  }

  setBusy(true);

  try {
    const result = await api('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!result.success) {
      throw new Error(result.message || 'बुकिंग दर्ज नहीं हो सकी।');
    }

    if (isAdmin) {
      setAdminBooking({ ...EMPTY_BOOKING });
      flash(`बुकिंग दर्ज हुई। ID: ${result.bookingCode || result.bookingId || 'उपलब्ध नहीं'}`);
    } else {
      setBookingSuccess({
        bookingCode: result.bookingCode || (result.bookingId ? `KB${String(result.bookingId).padStart(6, '0')}` : 'ID उपलब्ध नहीं'),
        status: result.status || 'Pending',
        message: result.message || 'आपकी बुकिंग सफलतापूर्वक दर्ज हो गई है।',
        booking: result.booking || payload
      });
      setBooking({ ...EMPTY_BOOKING });
      setArea({ district: '', tehsil: '', block: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

  } catch (e) {
    flash(e.message);
  } finally {
    setBusy(false);
  }
}

  function locate() {
    if (!navigator.geolocation) {
      return flash('इस ब्राउज़र में GPS लोकेशन उपलब्ध नहीं है।');
    }

    navigator.geolocation.getCurrentPosition(
      p => setBooking(v => ({
        ...v,
        latitude: p.coords.latitude,
        longitude: p.coords.longitude
      })),
      () => flash('लोकेशन अनुमति दें और दोबारा प्रयास करें।')
    );
  }

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

      flash('एजेंट अकाउंट बनाया गया।');

      await loadPublicAgents();

    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateBooking(id, patch) {
    try {
      await api(`/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });

      const b = await api('/bookings');
      setBookings(b);

      flash('बुकिंग अपडेट हुई।');

    } catch (e) {
      flash(e.message);
    }
  }

  async function saveRates() {
    try {
      const r = await api('/admin/rates', {
        method: 'PUT',
        body: JSON.stringify({ rates: rateDraft })
      });

      setRates(r);
      flash('रेट सेव हो गए।');

    } catch (e) {
      flash(e.message);
    }
  }

  
const nav = [
  ['home', 'होम'],
  ['rates', 'रेट लिस्ट'],
  ['agent-contact', 'एजेंट संपर्क'],
  ['calculator', 'कैलकुलेटर'],
  ['booking', 'बुकिंग करें'],
  ['booking-status', 'बुकिंग स्टेटस']
];


  const setField = (setter, field, value) => {
    setter(old => ({ ...old, [field]: value }));
  };

  return (
    <div className="app-shell">

      <header className="topbar">
        <div className="nav-wrap">

          <button className="brand" onClick={() => go('home')}>
            <span className="brand-icon">
              <Droplets size={25} />
            </span>

            <span>
              <b>Borewell Mitra MP</b>
              <small>आपके पानी का भरोसेमंद साथी</small>
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
              <button onClick={() => go(user.role === 'admin' ? 'admin' : 'dashboard')}>
                मेरा डैशबोर्ड
              </button>
            )}

            {!user ? (
              <button
                className="nav-login"
                onClick={() => {
                  setAuthMode('login');
                  go('auth');
                }}
              >
                <LogIn size={16} /> लॉगिन / रजिस्टर
              </button>
            ) : (
              <button className="nav-login" onClick={logout}>
                <LogOut size={16} /> लॉगआउट
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

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}

      <main>

        {/* होमपेज */}
        {page === 'home' && (
          <Home
            go={go}
            agents={publicAgents}
            agentsLoading={agentsLoading}
          />
        )}

        
{/* DISTRICT BLOCK WISE RATE LIST */}
{page === 'rates' && (
  <>
    <section className="hero">
      <div className="hero-bg" />
      <div className="container hero-content">
        <span className="pill">
          <Droplets size={15} /> BOREWELL MITRA MP
        </span>

        <h1>
          सेवाओं की रेट लिस्ट,<br />
          <em>अब आपके अपने क्षेत्र के अनुसार।</em>
        </h1>

        <p>
          अपना जिला और ब्लॉक चुनें और बोरवेल से जुड़ी
          सभी सेवाओं के रेट आसानी से देखें।
        </p>

        <div className="hero-trust">
          <span><MapPin /> जिला अनुसार रेट</span>
          <span><Drill /> सभी सेवाएँ</span>
          <span><ShieldCheck /> पारदर्शी जानकारी</span>
        </div>
      </div>
    </section>

    <section className="section container">
      <SectionTitle
        eyebrow="DISTRICT & BLOCK WISE PRICING"
        title="अपने क्षेत्र की रेट लिस्ट देखें"
        subtitle="पहले जिला और फिर अपना ब्लॉक चुनें।"
      />

      <div className="form-card">
        <div className="section-heading">
          <h2><MapPin size={20} /> अपना क्षेत्र चुनें</h2>
        </div>

        <AreaFields area={area} setArea={setArea} />
      </div>
    </section>

    <section className="section container">
      {area.district && area.block && (
        <>
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR AREA PRICES</span>
              <h2>{area.district} / {area.block}</h2>
              <p>आपके चुने हुए क्षेत्र की सेवाओं के रेट</p>
            </div>

            <span className="status-chip">
              {rates.length} सेवाएँ
            </span>
          </div>

          {ratesLoading && (
            <div className="empty">
              रेट लिस्ट लोड हो रही है...
            </div>
          )}

          {!ratesLoading && rates.length > 0 && (
            <div className="service-grid">
              {rates.map((r, i) => (
                <article className="service-card" key={r.id || i}>
                  <span className="service-icon">
                    <Drill size={25} />
                  </span>

                  <span className="eyebrow">
                    SERVICE {String(i + 1).padStart(2, '0')}
                  </span>

                  <h3>
                    {r.service || r.service_name || r.name || 'सेवा'}
                  </h3>

                  <div className="rate-price">
                    <strong>
                      ₹{Number(r.rate ?? r.price ?? 0).toLocaleString('en-IN')}
                    </strong>
                    <small>{r.unit || 'निर्धारित रेट'}</small>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!ratesLoading && !rates.length && (
            <div className="empty">
              <ClipboardList size={28} />
              <p>इस जिला और ब्लॉक के रेट अभी उपलब्ध नहीं हैं।</p>
            </div>
          )}
        </>
      )}

      {!area.district && (
        <div className="empty">
          <MapPin size={28} />
          <p>रेट देखने के लिए पहले अपना जिला चुनें।</p>
        </div>
      )}

      {area.district && !area.block && (
        <div className="empty">
          <MapPin size={28} />
          <p>अब अपना ब्लॉक चुनें।</p>
        </div>
      )}

      <p className="muted tiny" style={{ marginTop: 24 }}>
        नोट: अंतिम रेट कार्य की स्थिति एवं सामग्री के अनुसार बदल सकते हैं।
      </p>
    </section>
  </>
)}


        {/* एजेंट संपर्क पेज */}
        {page === 'agent-contact' && (
          <section className="section container">

            <SectionTitle
              eyebrow="AGENT NETWORK"
              title="एजेंट संपर्क"
              subtitle="अपने जिले और ब्लॉक के स्वीकृत एवं सक्रिय एजेंटों से संपर्क करें।"
            />

            <AgentList
              agents={publicAgents}
              loading={agentsLoading}
            />

          </section>
        )}

        {/* कैलकुलेटर */}
        {page === 'calculator' && <Calculator />}
        {/* PUBLIC BOOKING STATUS */}
{page === 'booking-status' && (
  <BookingStatus />
)}

        {/* बुकिंग */}
        {page === 'booking' && (
          <section className="section container narrow">

            <SectionTitle
              eyebrow="BOOK A SERVICE"
              title="बोरवेल बुकिंग फॉर्म"
              subtitle="बुकिंग भेजने के लिए पहले लॉगिन करें।"
            />

            {bookingSuccess ? (
              <div className="form-card booking-status-result">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">BOOKING SUCCESSFUL</span>
                    <h2>बुकिंग सफलतापूर्वक दर्ज हुई!</h2>
                  </div>
                  <span className="status-chip">{bookingSuccess.status}</span>
                </div>
                <p>{bookingSuccess.message}</p>
                <div className="booking-status-details">
                  <p><b>आपकी Booking ID:</b><strong>{bookingSuccess.bookingCode}</strong></p>
                  <p><b>बुकिंग स्थिति:</b><span>{bookingSuccess.status}</span></p>
                  <p><b>सेवा:</b><span>{bookingSuccess.booking?.service || '—'}</span></p>
                  <p><b>जिला / ब्लॉक:</b><span>{bookingSuccess.booking?.district || '—'} / {bookingSuccess.booking?.block || '—'}</span></p>
                </div>
                <div className="hero-actions" style={{ marginTop: 20 }}>
                  <button className="btn primary" onClick={() => { setBookingSuccess(null); go('dashboard'); }}>मेरा डैशबोर्ड देखें</button>
                  <button className="btn outline" onClick={() => setBookingSuccess(null)}>नई बुकिंग करें</button>
                </div>
              </div>
            ) : !user ? (
              <div className="login-prompt">
                <p>बुकिंग करने के लिए लॉगिन या रजिस्टर करें।</p>

                <button
                  className="btn primary"
                  onClick={() => {
                    setAuthMode('login');
                    go('auth');
                  }}
                >
                  लॉगिन करें
                </button>
              </div>
            ) : (
              <form
                className="form-card"
                onSubmit={e => sendBooking(e)}
              >

                <BookingFields
                  value={booking}
                  onChange={(k, v) => setField(setBooking, k, v)}
                  area={area}
                  setArea={setArea}
                />

                <button
                  type="button"
                  className="btn outline"
                  onClick={locate}
                >
                  <LocateFixed size={17} />
                  {booking.latitude ? 'लोकेशन मिल गई' : 'मेरी GPS लोकेशन जोड़ें'}
                </button>

                {booking.latitude && (
                  <p className="muted">
                    GPS: {booking.latitude.toFixed(5)}, {booking.longitude.toFixed(5)}
                  </p>
                )}

                <button disabled={busy} className="btn primary full-btn">
                  {busy ? 'भेज रहे हैं…' : 'बुकिंग सबमिट करें'}
                </button>

              </form>
            )}

          </section>
        )}

        {/* लॉगिन / रजिस्टर */}
        {['auth', 'login', 'register'].includes(page) && (
          <section className="section container narrow">

            <SectionTitle
              eyebrow="YOUR ACCOUNT"
              title={authMode === 'login' ? 'लॉगिन करें' : 'अपना अकाउंट बनाएँ'}
              subtitle="Borewell Mitra MP से जुड़ें और अपनी सेवाओं का लाभ लें।"
            />

            <div className="auth-switch">
              <button
                type="button"
                className={authMode === 'login' ? 'selected' : ''}
                onClick={() => setAuthMode('login')}
              >
                लॉगिन
              </button>

              <button
                type="button"
                className={authMode === 'register' ? 'selected' : ''}
                onClick={() => setAuthMode('register')}
              >
                रजिस्टर
              </button>
            </div>

            {registrationSuccess ? (
              <div className="form-card auth-card registration-success">
                <h2>पंजीकरण सफल हुआ!</h2>
                <p>आपका अकाउंट सफलतापूर्वक बन गया है। अपनी User ID सुरक्षित रखें।</p>
                <div className="registration-user-id">
                  <span>आपकी User ID</span>
                  <strong>{registrationSuccess.userId}</strong>
                </div>
                <p><strong>नाम:</strong> {registrationSuccess.name}</p>
                <p><strong>मोबाइल:</strong> {registrationSuccess.mobile}</p>
                <p><strong>अकाउंट:</strong> {registrationSuccess.role === 'agent' ? 'एजेंट' : 'ग्राहक'}</p>
                <p className="muted">स्थिति: Pending — एडमिन की मंज़ूरी के बाद आपका अकाउंट सक्रिय होगा। उसके बाद User ID या मोबाइल नंबर और पासवर्ड से लॉगिन करें।</p>
                <button type="button" className="btn primary full-btn" onClick={() => {
                  setRegistrationSuccess(null);
                  setAuthMode('login');
                  setAuthForm(old => ({ ...old, login: registrationSuccess.mobile, password: '' }));
                }}>लॉगिन करें</button>
                <button type="button" className="btn full-btn" onClick={() => setRegistrationSuccess(null)}>वापस</button>
              </div>
            ) : (
              <form className="form-card auth-card" onSubmit={submitAuth}>
                {authMode === 'register' && <>
                  <label>पूरा नाम *<input required value={authForm.name} onChange={e => setField(setAuthForm, 'name', e.target.value)} placeholder="अपना पूरा नाम लिखें" /></label>
                  <label>मोबाइल नंबर *<input required inputMode="numeric" maxLength="10" pattern="[6-9][0-9]{9}" value={authForm.mobile} onChange={e => setField(setAuthForm, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 अंकों का मोबाइल नंबर" /></label>
                  <label>अकाउंट प्रकार *<select value={authForm.role} onChange={e => setField(setAuthForm, 'role', e.target.value)}><option value="customer">ग्राहक</option><option value="agent">एजेंट (मंज़ूरी आवश्यक)</option></select></label>
                  <RegistrationAreaFields area={registrationArea} setArea={setRegistrationArea} />
                  {authForm.role === 'customer' ? <>
                    <label>पूरा पता *<textarea required rows="3" value={authForm.address} onChange={e => setField(setAuthForm, 'address', e.target.value)} placeholder="गाँव, वार्ड, मोहल्ला और पूरा पता" /></label>
                    <label>कौन-सी सेवा चाहिए? *<select required value={authForm.service} onChange={e => setField(setAuthForm, 'service', e.target.value)}><option value="New Borewell">नया बोरवेल</option><option value="Repairing">बोरवेल रिपेयरिंग</option></select></label>
                  </> : <>
                    <label>एजेंसी का नाम *<input required value={authForm.agencyName} onChange={e => setField(setAuthForm, 'agencyName', e.target.value)} placeholder="अपनी एजेंसी का नाम" /></label>
                    <label>ऑफिस का पूरा पता *<textarea required rows="3" value={authForm.officeAddress} onChange={e => setField(setAuthForm, 'officeAddress', e.target.value)} placeholder="ऑफिस का पूरा पता" /></label>
                  </>}
                  <label>रेफरल ID (यदि हो)<input value={authForm.referralCode} onChange={e => setField(setAuthForm, 'referralCode', e.target.value)} /></label>
                </>}
                {authMode === 'login' && <label>User ID या मोबाइल नंबर *<input required value={authForm.login} onChange={e => setField(setAuthForm, 'login', e.target.value)} placeholder="ADMIN / KC00001 / 9876543210" /></label>}
                <label>पासवर्ड *<input required type="password" minLength={authMode === 'register' ? 8 : undefined} value={authForm.password} onChange={e => setField(setAuthForm, 'password', e.target.value)} placeholder={authMode === 'register' ? "कम से कम 8 अक्षर" : "अपना पासवर्ड लिखें"} /></label>
                <button disabled={busy} className="btn primary full-btn">{busy ? 'कृपया प्रतीक्षा करें…' : authMode === 'login' ? 'लॉगिन करें' : 'रजिस्टर करें'}</button>
                <p className="switch-auth">{authMode === 'login' ? 'नया अकाउंट चाहिए?' : 'पहले से अकाउंट है?'} <button type="button" onClick={() => { setRegistrationSuccess(null); setAuthMode(authMode === 'login' ? 'register' : 'login'); }}> {authMode === 'login' ? 'रजिस्टर करें' : 'लॉगिन करें'}</button></p>
                {authMode === 'register' && <p className="muted tiny">एजेंट अकाउंट एडमिन की मंज़ूरी के बाद सक्रिय होगा। पासवर्ड कम से कम 8 अक्षर का रखें।</p>}
              </form>
            )}
          </section>
        )}

        {/* ग्राहक डैशबोर्ड */}
        {page === 'dashboard' && (
          <section className="section container">

            <SectionTitle
              eyebrow="MY ACCOUNT"
              title={`नमस्ते, ${user?.name || 'यूज़र'}!`}
              subtitle="यहाँ अपनी बुकिंग और अकाउंट की जानकारी देखें।"
            />

            <div className="stats-grid">
              <Stat icon={<ClipboardList />} title="मेरी बुकिंग" value={bookings.length} />
              <Stat icon={<Users />} title="अकाउंट प्रकार" value={roleLabel(user?.role)} />
              <Stat
                icon={<ShieldCheck />}
                title="अकाउंट स्थिति"
                value={user?.status === 'pending_approval' ? 'मंज़ूरी बाकी' : 'सक्रिय'}
              />
            </div>

            {(user?.role === 'agent' || user?.role === 'referrer') && (
              <div className="referral-box">
                <div>
                  <span className="eyebrow">YOUR REFERRAL ID</span>
                  <h3>{user?.referralId || 'अभी उपलब्ध नहीं'}</h3>
                  <p>रेफरल ID और कमीशन की शर्तें एडमिन से कन्फर्म करें।</p>
                </div>

                <button
                  className="btn outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(user?.referralId || '');
                    flash('कॉपी करने का प्रयास किया गया।');
                  }}
                >
                  ID कॉपी करें
                </button>
              </div>
            )}

            <div className="section-heading">
              <h2>मेरी बुकिंग</h2>
              <button className="btn primary" onClick={() => go('booking')}>
                + नई बुकिंग
              </button>
            </div>

            <BookingList bookings={bookings} />

          </section>
        )}

        {/* एडमिन डैशबोर्ड */}
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
                <p>यह पेज केवल एडमिन लॉगिन के बाद खुलेगा।</p>

                <button
                  className="btn primary"
                  onClick={() => {
                    setAuthMode('login');
                    go('auth');
                  }}
                >
                  एडमिन लॉगिन
                </button>
              </div>
            </section>
          )
        )}

      </main>

      <footer className="footer">
        <div className="container footer-inner">

          <div className="brand footer-brand">
            <span className="brand-icon"><Droplets /></span>
            <span>
              <b>Borewell Mitra MP</b>
              <small>मध्य प्रदेश में बोरवेल सेवाओं का मंच</small>
            </span>
          </div>

          <p><MapPin size={15} /> मध्य प्रदेश, भारत</p>
          <p><Phone size={15} /> संपर्क विवरण एडमिन द्वारा जोड़ा जाना है</p>

          <small>
            © {new Date().getFullYear()} Borewell Mitra MP · शुरुआती डेमो वेबसाइट
          </small>

        </div>
      </footer>

    </div>
  );
}

/* =========================
   HOMEPAGE
========================= */

function Home({ go, agents, agentsLoading }) {
  const items = [
    {
      icon: <ClipboardList />,
      title: 'रेट लिस्ट',
      desc: 'जिला और क्षेत्र के अनुसार सेवाओं के रेट देखें।',
      page: 'rates'
    },
    {
      icon: <Phone />,
      title: 'एजेंट संपर्क',
      desc: 'अपने क्षेत्र के सक्रिय एजेंटों की जानकारी।',
      page: 'agent-contact'
    },
    {
      icon: <Gauge />,
      title: 'कैलकुलेटर',
      desc: 'बोरवेल कार्य का अनुमान तैयार करें।',
      page: 'calculator'
    },
    {
      icon: <Drill />,
      title: 'बुकिंग',
      desc: 'अपनी आवश्यकता के अनुसार बुकिंग करें।',
      page: 'booking'
    },
    {
      icon: <ClipboardList />,
      title: 'बुकिंग स्टेटस',
      desc: 'Booking ID और मोबाइल नंबर से अपनी बुकिंग की स्थिति देखें।',
      page: 'booking-status'
    }
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-bg" />

        <div className="container hero-content">

          <span className="pill">
            <Droplets size={15} /> पानी के भरोसे की शुरुआत
          </span>

          <h1>
            आपके बोरवेल का काम,<br />
            <em>अब आसान और भरोसेमंद।</em>
          </h1>

          <p>
            ड्रिलिंग से लेकर रिपेयरिंग और पाइप सेवाओं तक —
            अपनी ज़रूरत बताएँ और बुकिंग दर्ज करें।
          </p>

          <div className="hero-actions">
            <button className="btn primary large" onClick={() => go('booking')}>
              बोरवेल बुक करें <ArrowRight size={18} />
            </button>

            <button className="btn light large" onClick={() => go('rates')}>
              रेट लिस्ट देखें
            </button>

            <button className="btn outline large" onClick={() => go('agent-contact')}>
              एजेंट संपर्क
            </button>
          </div>

          <div className="hero-trust">
            <span><ShieldCheck /> बुकिंग ट्रैकिंग</span>
            <span><Users /> एजेंट नेटवर्क</span>
            <span><MapPin /> मध्य प्रदेश</span>
          </div>

        </div>

        <div className="hero-badge">
          <Droplets />
          <span>
            <b>एक ही जगह</b>
            <small>बुकिंग · रेट · अपडेट</small>
          </span>
        </div>
      </section>

      <section className="section container">

        <SectionTitle
          eyebrow="OUR SERVICES"
          title="आपकी ज़रूरत, हमारी सेवाएँ"
          subtitle="अपनी आवश्यकता के अनुसार सेवा चुनें।"
        />

        <div className="service-grid">
          {items.map(x => (
            <article className="service-card" key={x.title}>
              <span className="service-icon">{x.icon}</span>
              <h3>{x.title}</h3>
              <p>{x.desc}</p>

              <button className="text-button" onClick={() => go(x.page)}>
                खोलें <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>

      </section>

      {/* होमपेज पर एजेंट संपर्क */}
      <section className="section container">

        <SectionTitle
          eyebrow="OUR AGENT NETWORK"
          title="अपने क्षेत्र के एजेंट से संपर्क करें"
          subtitle="यहाँ केवल एडमिन द्वारा स्वीकृत और सक्रिय एजेंट ही दिखाई देंगे।"
        />

        <AgentList
          agents={agents}
          loading={agentsLoading}
          limit={6}
        />

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <button
            className="btn primary"
            onClick={() => go('agent-contact')}
          >
            सभी एजेंट देखें <ArrowRight size={17} />
          </button>
        </div>

      </section>

      <section className="cta-band">
        <div className="container cta-inner">

          <div>
            <span className="eyebrow">READY TO START?</span>
            <h2>अपनी बुकिंग आज ही दर्ज करें</h2>
            <p>अपनी जानकारी दें — हमारी टीम बुकिंग की समीक्षा करेगी।</p>
          </div>

          <button className="btn light large" onClick={() => go('booking')}>
            बुकिंग फॉर्म खोलें <ArrowRight />
          </button>

        </div>
      </section>

      <section className="section container">

        <SectionTitle
          eyebrow="HOW IT WORKS"
          title="बुकिंग की प्रक्रिया"
          subtitle="सरल चरणों में अपनी आवश्यकता दर्ज करें।"
        />

        <div className="steps">
          {[
            ['01', 'अकाउंट बनाएँ', 'ग्राहक के रूप में रजिस्टर या लॉगिन करें।'],
            ['02', 'बुकिंग दर्ज करें', 'सेवा, मोबाइल और पूरा पता भरें।'],
            ['03', 'एडमिन की समीक्षा', 'एडमिन बुकिंग देखकर एजेंट नियुक्त कर सकता है।'],
            ['04', 'अपडेट देखें', 'डैशबोर्ड में बुकिंग की स्थिति देखें।']
          ].map(s => (
            <div className="step" key={s[0]}>
              <span>{s[0]}</span>
              <h3>{s[1]}</h3>
              <p>{s[2]}</p>
            </div>
          ))}
        </div>

      </section>
    </>
  );
}

/* =========================
   PUBLIC AGENT LIST
========================= */

function AgentList({ agents = [], loading = false, limit }) {
  if (loading) {
    return (
      <div className="empty">
        <p>एजेंटों की सूची लोड हो रही है...</p>
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
        <p>अभी आपके क्षेत्र के लिए कोई स्वीकृत और सक्रिय एजेंट उपलब्ध नहीं है।</p>
      </div>
    );
  }

  return (
    <div className="agent-contact-grid">
      {visibleAgents.map((agent, index) => {
        const mobile = String(agent.mobile || '').replace(/\D/g, '');
        const validMobile = /^\d{10}$/.test(mobile);

        return (
          <article
            className="agent-contact-card"
            key={agent.id || `${agent.mobile}-${index}`}
          >
            <div className="agent-contact-header">
              <div>
                <span className="eyebrow">BOREWELL MITRA AGENT</span>
                <h3>{agent.name || 'एजेंट'}</h3>
              </div>

              <span className="agent-active-label">सक्रिय एजेंट</span>
            </div>

            {agent.agency_name && (
              <p className="agent-agency">
                <b>एजेंसी:</b> {agent.agency_name}
              </p>
            )}

            <div className="agent-contact-details">
              <p>
                <MapPin size={16} />
                <span>
                  {agent.district || 'जिला उपलब्ध नहीं'}
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
                <span>{agent.mobile || 'मोबाइल नंबर उपलब्ध नहीं'}</span>
              </p>
            </div>

            {validMobile ? (
              <div className="agent-contact-actions">
                <a
                  className="btn primary"
                  href={`tel:${mobile}`}
                >
                  <Phone size={16} /> कॉल करें
                </a>

                <a
                  className="btn outline"
                  href={`https://wa.me/91${mobile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            ) : (
              <p className="muted tiny">
                संपर्क के लिए सही मोबाइल नंबर उपलब्ध नहीं है।
              </p>
            )}

          </article>
        );
      })}
    </div>
  );
}

/* =========================
   CALCULATOR
========================= */

function Calculator() {
  const [depth, setDepth] = useState('');
  const [rate, setRate] = useState('');
  const [extra, setExtra] = useState('0');

  const total =
    (Number(depth) || 0) * (Number(rate) || 0) +
    (Number(extra) || 0);

  return (
    <section className="section container narrow">

      <SectionTitle
        eyebrow="BOREWELL ESTIMATE"
        title="बोरवेल कैलकुलेटर"
        subtitle="गहराई और प्रति फुट रेट डालकर अनुमान देखें।"
      />

      <div className="form-card">

        <label>
          बोरवेल की गहराई (फुट)
          <input
            type="number"
            min="0"
            value={depth}
            onChange={e => setDepth(e.target.value)}
            placeholder="उदाहरण: 300"
          />
        </label>

        <label>
          प्रति फुट रेट (₹)
          <input
            type="number"
            min="0"
            value={rate}
            onChange={e => setRate(e.target.value)}
            placeholder="प्रति फुट रेट"
          />
        </label>

        <label>
          अन्य खर्च (₹)
          <input
            type="number"
            min="0"
            value={extra}
            onChange={e => setExtra(e.target.value)}
          />
        </label>

        <div className="referral-box">
          <div>
            <span className="eyebrow">कुल अनुमान</span>
            <h3>₹ {total.toLocaleString('en-IN')}</h3>
            <p>यह प्रारंभिक गणना है; अंतिम रेट एजेंट/एडमिन से पुष्टि करें।</p>
          </div>
        </div>

        <button
          type="button"
          className="btn outline"
          onClick={() => {
            setDepth('');
            setRate('');
            setExtra('0');
          }}
        >
          रीसेट करें
        </button>

      </div>
    </section>
  );
}

/* =========================
   PUBLIC BOOKING STATUS
========================= */

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
        setError(data.message || 'बुकिंग की जानकारी नहीं मिली।');
      }
    } catch (err) {
      setError(err.message || 'बुकिंग खोजने में समस्या हुई।');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return 'उपलब्ध नहीं';

    const parsed = new Date(date.replace(' ', 'T'));

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
        title="अपनी बुकिंग का स्टेटस देखें"
        subtitle="अपनी Booking ID और रजिस्टर्ड मोबाइल नंबर दर्ज करें।"
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
            placeholder="उदाहरण: KB000001"
          />
        </label>

        <label>
          रजिस्टर्ड मोबाइल नंबर *
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
            placeholder="10 अंकों का मोबाइल नंबर"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn primary full-btn"
        >
          {loading ? 'बुकिंग खोज रहे हैं...' : 'बुकिंग स्टेटस देखें'}
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
              <b>ग्राहक का नाम:</b>
              <span>{result.customerName}</span>
            </p>

            <p>
              <b>सेवा:</b>
              <span>{result.service}</span>
            </p>

            <p>
              <b>जिला:</b>
              <span>{result.district}</span>
            </p>

            <p>
              <b>ब्लॉक:</b>
              <span>{result.block}</span>
            </p>

            <p>
              <b>बुकिंग तारीख:</b>
              <span>{formatDate(result.bookingDate)}</span>
            </p>

            <p>
              <b>भुगतान स्थिति:</b>
              <span>
                {result.paymentVerified
                  ? 'भुगतान सत्यापित'
                  : 'अभी सत्यापित नहीं'}
              </span>
            </p>

          </div>

          <div className="divider"></div>

          <h3>नियुक्त एजेंट की जानकारी</h3>

          {result.agent ? (
            <div className="agent-contact-details">

              <p>
                <b>एजेंट का नाम:</b>
                {result.agent.name || 'उपलब्ध नहीं'}
              </p>

              <p>
                <b>मोबाइल नंबर:</b>
                {result.agent.mobile || 'उपलब्ध नहीं'}
              </p>

              {result.agent.agencyName && (
                <p>
                  <b>एजेंसी:</b>
                  {result.agent.agencyName}
                </p>
              )}

              {result.agent.mobile && (
                <a
                  className="btn primary"
                  href={`tel:${result.agent.mobile}`}
                >
                  <Phone size={16} /> एजेंट को कॉल करें
                </a>
              )}

            </div>
          ) : (
            <p className="muted">
              अभी इस बुकिंग पर एजेंट नियुक्त नहीं हुआ है।
              एडमिन द्वारा एजेंट नियुक्त होने पर जानकारी यहाँ दिखाई देगी।
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
            दूसरी बुकिंग खोजें
          </button>

        </div>
      )}

    </section>
  );
}

/* =========================
   COMMON COMPONENTS
========================= */

function RegistrationAreaFields({ area, setArea }) {
  const blocks = area.district ? (BLOCKS[area.district] || []) : [];
  return <>
    <label>जिला चुनें *<select required value={area.district} onChange={e => setArea({ district: e.target.value, block: '' })}><option value="">-- जिला चुनें --</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
    <label>तहसील / ब्लॉक चुनें *<select required disabled={!area.district} value={area.block} onChange={e => setArea(old => ({ ...old, block: e.target.value }))}><option value="">-- तहसील / ब्लॉक चुनें --</option>{blocks.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
  </>;
}

function AreaFields({ area, setArea }) {
  const blocks = area.district
    ? (BLOCKS[area.district] || [])
    : [];

  return (
    <div className="area-select">

      <label>
        जिला चुनें *
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
          <option value="">-- जिला चुनें --</option>

          {DISTRICTS.map(district => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </label>

      <label>
        ब्लॉक चुनें *
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
          <option value="">-- ब्लॉक चुनें --</option>

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
        ग्राहक का नाम *
        <input
          type="text"
          required
          value={value.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="अपना पूरा नाम लिखें"
        />
      </label>

      <label>
        मोबाइल नंबर *
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
          placeholder="10 अंकों का मोबाइल नंबर"
        />
      </label>

      <label>
        जिला चुनें *
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
          <option value="">-- जिला चुनें --</option>

          {DISTRICTS.map(district => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </label>

      <label>
        ब्लॉक चुनें *
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
          <option value="">-- ब्लॉक चुनें --</option>

          {blocks.map(block => (
            <option key={block} value={block}>
              {block}
            </option>
          ))}
        </select>
      </label>

      <label className="full">
        पूरा पता *
        <textarea
          required
          rows="3"
          value={value.address}
          onChange={e => onChange('address', e.target.value)}
          placeholder="गाँव, मोहल्ला, पोस्ट और पिन कोड सहित पूरा पता लिखें"
        />
      </label>

      <label className="full">
        सेवा चुनें *
        <select
          required
          value={value.service}
          onChange={e => onChange('service', e.target.value)}
        >
          <option value="">-- सेवा चुनें --</option>
          <option value="Drilling">नया बोरवेल</option>
          <option value="Repairing">बोरवेल रिपेयरिंग</option>
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
      <span className="stat-icon">{icon}</span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function BookingList({ bookings }) {
  return bookings.length ? (
    <div className="booking-list">
      {bookings.map(b => (
        <article className="booking-row" key={b.id}>
          <div>
            <b>{b.service}</b>
            <small>
              {b.bookingCode || b.booking_code || b.id || 'Booking'} · {(b.createdAt || b.created_at) ? new Date(b.createdAt || b.created_at).toLocaleDateString('hi-IN') : ''}
            </small>
            <p>{b.address}</p>
          </div>

          <span className="status-chip">{b.status}</span>
        </article>
      ))}
    </div>
  ) : (
    <Empty text="अभी आपकी कोई बुकिंग नहीं है।" />
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
    admin: 'एडमिन',
    customer: 'ग्राहक',
    agent: 'एजेंट',
    referrer: 'रेफरल पार्टनर'
  })[role] || 'यूज़र';
}