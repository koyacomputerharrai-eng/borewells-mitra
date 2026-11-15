
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

import {
  DISTRICTS,
  BLOCKS,
} from "./areas.js";

import "./style.css";

// Localhost à¤”à¤° Live Website à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤¹à¥€ API
const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";


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
    item.service_name ||
    item.service ||
    item.name ||
    ""
  ).trim();
}


function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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

  const loadServices = useCallback(
    async (signal, silent = false) => {
      try {
        const response = await fetch(
          `${API}/services`,
          {
            ...(signal ? { signal } : {}),
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Services à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤ˆà¤‚"
          );
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

          if (!silent) {
            setServices([]);
            setServicesLoaded(false);

            setError(
              "à¤¨à¤ˆ Services à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤ˆà¤‚à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤°à¤¿à¤«à¥à¤°à¥‡à¤¶ à¤•à¤°à¥‡à¤‚à¥¤"
            );
          }
        }
      }
    },
    []
  );


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
          {
            ...(signal ? { signal } : {}),
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤"
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

          if (!silent) {
            setRates([]);

            setError(
              "à¤°à¥‡à¤Ÿ à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤"
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


  // --------------------------------
  // MANUAL REFRESH
  // --------------------------------

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

    loadServices(controller.signal);
    loadRates(controller.signal);

    // à¤¹à¤° 10 à¤¸à¥‡à¤•à¤‚à¤¡ à¤®à¥‡à¤‚ Services à¤”à¤° Rates à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤¹à¥‹à¤‚à¤—à¥‡
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
  }, [
    district,
    block,
    loadRates,
    loadServices,
  ]);


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
  }, [
    services,
    servicesLoaded,
    rates,
  ]);


  // --------------------------------
  // SEARCH SERVICES
  // --------------------------------

  const filteredRates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return serviceRows.filter((item) =>
      item.serviceName.toLowerCase().includes(query)
    );
  }, [
    serviceRows,
    search,
  ]);


  return (
    <main className="rl-page">

      {/* HERO */}

      <section className="rl-hero">
        <div className="rl-hero-copy">

          <h1>
            à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥€ <span>à¤°à¥‡à¤Ÿ à¤²à¤¿à¤¸à¥à¤Ÿ</span>
          </h1>

          <p>
            à¤®à¤§à¥à¤¯à¤ªà¥à¤°à¤¦à¥‡à¤¶ à¤®à¥‡à¤‚ à¤…à¤ªà¤¨à¥‡ à¤œà¤¿à¤²à¥‡ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¤¾ à¤šà¤¯à¤¨
            à¤•à¤°à¤•à¥‡ à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥‡ à¤…à¤ªà¤¡à¥‡à¤Ÿà¥‡à¤¡ à¤°à¥‡à¤Ÿ à¤¦à¥‡à¤–à¥‡à¤‚à¥¤
          </p>

          <div className="rl-hero-meta">

            <span>
              <MapPin size={15} />
              à¤œà¤¿à¤²à¤¾ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤°à¥‡à¤Ÿ
            </span>

            <span>
              <MapPin size={15} />
              à¤¬à¥à¤²à¥‰à¤• à¤…à¤¨à¥à¤¸à¤¾à¤° à¤°à¥‡à¤Ÿ
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
              à¤…à¤ªà¤¨à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤šà¥à¤¨à¥‡à¤‚
            </span>

            <h2>à¤œà¤¿à¤²à¤¾ à¤¸à¥‡ à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</h2>

            <p>
              à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚à¥¤ à¤«à¤¿à¤° à¤‰à¤¸à¥€ à¤œà¤¿à¤²à¥‡ à¤•à¥‡ à¤¬à¥à¤²à¥‰à¤• à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¹à¥‹à¤‚à¤—à¥‡à¥¤
            </p>
          </div>

        </div>


        <div className="rl-fields">

          <label className="rl-field">

            <span>
              <b className="rl-step">1</b>
              à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚
            </span>

            <select
              value={district}
              onChange={(e) =>
                setDistrict(e.target.value)
              }
            >
              <option value="">
                à¤®à¤§à¥à¤¯à¤ªà¥à¤°à¤¦à¥‡à¤¶ à¤•à¤¾ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚
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
              à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚
            </span>

            <select
              value={block}
              onChange={(e) =>
                setBlock(e.target.value)
              }
              disabled={!district || !blocks.length}
            >
              <option value="">
                {!district
                  ? "à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚"
                  : blocks.length
                  ? "à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚"
                  : "à¤‡à¤¸ à¤œà¤¿à¤²à¥‡ à¤®à¥‡à¤‚ à¤¬à¥à¤²à¥‰à¤• à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}
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
            <span>à¤†à¤ªà¤•à¤¾ à¤šà¤¯à¤¨</span>

            <strong>
              {district || "à¤œà¤¿à¤²à¤¾ à¤¨à¤¹à¥€à¤‚ à¤šà¥à¤¨à¤¾"}

              <ChevronRight size={16} />

              {block || "à¤¬à¥à¤²à¥‰à¤• à¤¨à¤¹à¥€à¤‚ à¤šà¥à¤¨à¤¾"}
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

            à¤°à¥‡à¤Ÿ à¤°à¤¿à¤«à¥à¤°à¥‡à¤¶ à¤•à¤°à¥‡à¤‚
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

            <h2>à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥€ à¤¦à¤°à¥‡à¤‚</h2>

            <p>
              {district && block
                ? `${district} / ${block} à¤•à¥‡ à¤²à¤¿à¤ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤°à¥‡à¤Ÿ`
                : "à¤°à¥‡à¤Ÿ à¤¦à¥‡à¤–à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚"}
            </p>
          </div>

          <span className="rl-count">
            {filteredRates.length} à¤¸à¥‡à¤µà¤¾à¤à¤
          </span>

        </div>


        <div className="rl-searchbox">

          <Search size={18} />

          <input
            type="search"
            placeholder="à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤¨à¤¾à¤® à¤–à¥‹à¤œà¥‡à¤‚..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
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
            à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...
          </div>

        ) : !district || !block ? (

          <div className="rl-state">

            <MapPin size={30} />

            <strong>
              à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚
            </strong>

            <p>
              à¤†à¤ªà¤•à¥‡ à¤šà¤¯à¤¨ à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤°à¥‡à¤Ÿ à¤¯à¤¹à¤¾à¤ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤‚à¤—à¥‡à¥¤
            </p>

          </div>

        ) : filteredRates.length === 0 ? (

          <div className="rl-state">

            <strong>
              {servicesLoaded && services.length === 0
                ? "à¤…à¤­à¥€ à¤•à¥‹à¤ˆ Active Service à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ"
                : "à¤•à¥‹à¤ˆ à¤¸à¥‡à¤µà¤¾ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€"}
            </strong>

            <p>
              {search
                ? "à¤¦à¥‚à¤¸à¤°à¤¾ à¤¸à¥‡à¤µà¤¾ à¤¨à¤¾à¤® à¤–à¥‹à¤œà¥‡à¤‚à¥¤"
                : "Admin Dashboard à¤®à¥‡à¤‚ Active Services à¤•à¥€ à¤œà¤¾à¤à¤š à¤•à¤°à¥‡à¤‚à¥¤"}
            </p>

          </div>

        ) : (

          <div className="rl-service-grid">

            {filteredRates.map((item, index) => {
              const rateData = item.rateData;

              const hasRate =
                rateData &&
                (
                  rateData.rate !== undefined ||
                  rateData.price !== undefined
                );

              const price = hasRate
                ? Number(
                    rateData.rate ?? rateData.price
                  )
                : null;

              return (
                <div
                  className="rl-service-card"
                  key={
                    item.id ||
                    item.serviceName ||
                    index
                  }
                >

                  <div className="rl-service-name">
                    {item.serviceName || "à¤…à¤¨à¥à¤¯ à¤¸à¥‡à¤µà¤¾"}
                  </div>

                  <div className="rl-service-price">
                    {price !== null &&
                    Number.isFinite(price)
                      ? `â‚¹${price.toLocaleString("en-IN")}`
                      : "à¤°à¥‡à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}
                  </div>

                  <div className="rl-service-unit">
                    {rateData?.unit ||
                      item.unit ||
                      "à¤ªà¥à¤°à¤¤à¤¿ à¤«à¥à¤Ÿ"}
                  </div>

                  <div className="rl-card-location">

                    <MapPin size={12} />

                    <span>{district}</span>

                    <span>â€¢</span>

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

        <strong>
          à¤®à¤¹à¤¤à¥à¤µà¤ªà¥‚à¤°à¥à¤£ à¤¸à¥‚à¤šà¤¨à¤¾
        </strong>

        <p>
          à¤…à¤‚à¤¤à¤¿à¤® à¤°à¥‡à¤Ÿ à¤•à¤¾à¤°à¥à¤¯ à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿, à¤—à¤¹à¤°à¤¾à¤ˆ à¤à¤µà¤‚ à¤¸à¤¾à¤®à¤—à¥à¤°à¥€
          à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤¬à¤¦à¤² à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤•à¤¾à¤® à¤¶à¥à¤°à¥‚ à¤•à¤°à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡
          à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ à¤¸à¥‡ à¤…à¤‚à¤¤à¤¿à¤® à¤°à¥‡à¤Ÿ à¤•à¥€ à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚à¥¤
        </p>

      </aside>

    </main>
  );
}
