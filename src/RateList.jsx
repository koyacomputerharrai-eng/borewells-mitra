
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  MapPin,
  ChevronRight,
} from "lucide-react";

import { DISTRICTS, BLOCKS } from "./areas.js";
import "./style.css";

const API = `http://${window.location.hostname}:4000/api`;

function getBlocksForDistrict(district) {
  const list = BLOCKS?.[district];

  if (Array.isArray(list)) return list;

  if (list && typeof list === "object") {
    return Object.keys(list);
  }

  return [];
}

function getServiceName(item) {
  return String(
    item.service_name || item.service || item.name || ""
  ).trim();
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export default function RateList() {
  const districtList = useMemo(
    () =>
      [...(DISTRICTS || [])].sort((a, b) =>
        String(a).localeCompare(String(b), "hi")
      ),
    []
  );

  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [search, setSearch] = useState("");

  const [services, setServices] = useState([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const blocks = useMemo(
    () => getBlocksForDistrict(district),
    [district]
  );

  // --------------------------------
  // LOAD ACTIVE SERVICES
  // --------------------------------

  const loadServices = useCallback(async (signal, silent = false) => {
    try {
      const response = await fetch(
        `${API}/services`,
        signal ? { signal } : {}
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Services लोड नहीं हुईं");
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.services)
        ? data.services
        : [];

      setServices(list);
      setServicesLoaded(true);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Services API Error:", err);
        // Background refresh में पुरानी सही सूची न हटाएँ।
        if (!silent) {
          setServices([]);
          setServicesLoaded(false);
          setError("नई Services सर्वर से नहीं मिल पाईं। कृपया दोबारा रिफ्रेश करें।");
        }
      }
    }
  }, []);


  // --------------------------------
  // LOAD DISTRICT / BLOCK RATES
  // --------------------------------

  const loadRates = useCallback(
    async (signal, silent = false) => {
      if (!district || !block) {
        setRates([]);
        return;
      }

      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const params = new URLSearchParams({
          district,
          block,
        });

        const response = await fetch(
          `${API}/rates?${params.toString()}`,
          signal ? { signal } : {}
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "रेट लोड नहीं हुए"
          );
        }

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.rates)
          ? data.rates
          : [];

        setRates(list);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Rates API Error:", err);

          // Background refresh में पहले से दिख रहे रेट सुरक्षित रखें।
          if (!silent) {
            setRates([]);
            setError(
              "रेट सर्वर से नहीं मिल पाए। कृपया दोबारा प्रयास करें।"
            );
          }
        }
      } finally {
        if (!signal?.aborted && !silent) {
          setLoading(false);
        }
      }
    },
    [district, block]
  );

  const refreshAll = useCallback(() => {
    setError("");
    loadServices();
    loadRates();
  }, [loadServices, loadRates]);

  // --------------------------------
  // RESET WHEN DISTRICT CHANGES
  // --------------------------------

  useEffect(() => {
    setBlock("");
    setRates([]);
    setError("");
    setSearch("");
  }, [district]);

  // --------------------------------
  // AUTO LOAD RATES
  // --------------------------------

  useEffect(() => {
    if (!district || !block) {
      setRates([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    // क्षेत्र चुनते ही Services और Rates दोनों लोड करें।
    loadServices(controller.signal);
    loadRates(controller.signal);

    // Admin में Service या Rate बदलने पर अधिकतम 10 सेकंड में
    // Homepage की सूची अपने-आप अपडेट हो जाएगी।
    const refreshTimer = window.setInterval(() => {
      if (!controller.signal.aborted) {
        loadServices(undefined, true);
        loadRates(undefined, true);
      }
    }, 10000);

    return () => {
      window.clearInterval(refreshTimer);
      controller.abort();
    };
  }, [district, block, loadRates, loadServices]);

  // --------------------------------
  // COMBINE SERVICES + RATES
  // --------------------------------

  const serviceRows = useMemo(() => {
    const source = servicesLoaded
      ? services
      : rates;

    return source.map((service) => {
      const name = getServiceName(service);

      const foundRate = rates.find((rate) => {
        if (
          service.id &&
          rate.service_id &&
          Number(service.id) === Number(rate.service_id)
        ) {
          return true;
        }

        return (
          normalizeName(getServiceName(rate)) ===
          normalizeName(name)
        );
      });

      return {
        ...service,
        serviceName: name,
        rateData: foundRate || null,
      };
    });
  }, [services, servicesLoaded, rates]);

  // --------------------------------
  // SEARCH SERVICES
  // --------------------------------

  const filteredRates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return serviceRows.filter((item) =>
      item.serviceName.toLowerCase().includes(query)
    );
  }, [serviceRows, search]);

  return (
    <main className="rl-page">

      {/* HERO */}

      <section className="rl-hero">
        <div className="rl-hero-copy">
          <h1>
            बोरवेल सेवाओं की <span>रेट लिस्ट</span>
          </h1>

          <p>
            मध्यप्रदेश में अपने जिले और ब्लॉक का चयन
            करके सेवाओं के अपडेटेड रेट देखें।
          </p>

          <div className="rl-hero-meta">
            <span>
              <MapPin size={15} />
              जिला अनुसार रेट
            </span>

            <span>
              <MapPin size={15} />
              ब्लॉक अनुसार रेट
            </span>
          </div>
        </div>
      </section>

      {/* DISTRICT AND BLOCK */}

      <section className="rl-selection-card">

        <div className="rl-section-heading">
          <div className="rl-section-icon">
            <MapPin size={22} />
          </div>

          <div>
            <span className="rl-kicker">
              अपना क्षेत्र चुनें
            </span>

            <h2>जिला से ब्लॉक चुनें</h2>

            <p>
              पहले जिला चुनें। फिर उसी जिले के ब्लॉक उपलब्ध होंगे।
            </p>
          </div>
        </div>

        <div className="rl-fields">

          <label className="rl-field">
            <span>
              <b className="rl-step">1</b>
              जिला चुनें
            </span>

            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">
                मध्यप्रदेश का जिला चुनें
              </option>

              {districtList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="rl-field">
            <span>
              <b className="rl-step">2</b>
              ब्लॉक चुनें
            </span>

            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              disabled={!district || !blocks.length}
            >
              <option value="">
                {!district
                  ? "पहले जिला चुनें"
                  : blocks.length
                  ? "ब्लॉक चुनें"
                  : "इस जिले में ब्लॉक उपलब्ध नहीं"}
              </option>

              {blocks.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

        </div>

        <div className="rl-selection-summary">

          <div>
            <span>आपका चयन</span>

            <strong>
              {district || "जिला नहीं चुना"}
              <ChevronRight size={16} />
              {block || "ब्लॉक नहीं चुना"}
            </strong>
          </div>

          <button
            type="button"
            className="rl-refresh"
            onClick={refreshAll}
            disabled={loading || !district || !block}
          >
            <RefreshCw
              size={16}
              className={loading ? "rl-spin" : ""}
            />
            रेट रिफ्रेश करें
          </button>

        </div>
      </section>

      {/* SERVICE RATES */}

      <section className="rl-rates-section">

        <div className="rl-rates-heading">
          <div>
            <span className="rl-kicker">
              SERVICE PRICE LIST
            </span>

            <h2>सेवाओं की दरें</h2>

            <p>
              {district && block
                ? `${district} / ${block} के लिए उपलब्ध रेट`
                : "रेट देखने के लिए पहले जिला और ब्लॉक चुनें"}
            </p>
          </div>

          <span className="rl-count">
            {filteredRates.length} सेवाएँ
          </span>
        </div>

        <div className="rl-searchbox">
          <Search size={18} />

          <input
            type="search"
            placeholder="सेवा का नाम खोजें..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!district || !block}
          />
        </div>

        {error && (
          <div className="rl-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rl-state">
            <span className="rl-loader" />
            रेट लोड हो रहे हैं...
          </div>
        ) : !district || !block ? (
          <div className="rl-state">
            <MapPin size={30} />

            <strong>जिला और ब्लॉक चुनें</strong>

            <p>
              आपके चयन के अनुसार रेट यहाँ दिखाई देंगे।
            </p>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="rl-state">
            <strong>
              {servicesLoaded && services.length === 0
                ? "अभी कोई Active Service उपलब्ध नहीं है"
                : "कोई सेवा नहीं मिली"}
            </strong>

            <p>
              {search
                ? "दूसरा सेवा नाम खोजें।"
                : "Admin Dashboard में Active Services की जाँच करें।"}
            </p>
          </div>
        ) : (
          <div className="rl-service-grid">

            {filteredRates.map((item, index) => {
              const rateData = item.rateData;

              const hasRate =
                rateData &&
                (rateData.rate !== undefined ||
                  rateData.price !== undefined);

              const price = hasRate
                ? Number(rateData.rate ?? rateData.price)
                : null;

              return (
                <div
                  className="rl-service-card"
                  key={item.id || item.serviceName || index}
                >
                  <div className="rl-service-name">
                    {item.serviceName || "अन्य सेवा"}
                  </div>

                  <div className="rl-service-price">
                    {price !== null && Number.isFinite(price)
                      ? `₹${price.toLocaleString("en-IN")}`
                      : "रेट उपलब्ध नहीं"}
                  </div>

                  <div className="rl-service-unit">
                    {rateData?.unit ||
                      item.unit ||
                      "प्रति फुट"}
                  </div>

                  <div className="rl-card-location">
                    <MapPin size={12} />

                    <span>{district}</span>
                    <span>•</span>
                    <span>{block}</span>
                  </div>
                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* IMPORTANT NOTE */}

      <aside className="rl-note">
        <strong>महत्वपूर्ण सूचना</strong>

        <p>
          अंतिम रेट कार्य की स्थिति, गहराई एवं सामग्री
          के अनुसार बदल सकते हैं। काम शुरू करने से पहले
          संबंधित एजेंट से अंतिम रेट की पुष्टि करें।
        </p>
      </aside>

    </main>
  );
}
