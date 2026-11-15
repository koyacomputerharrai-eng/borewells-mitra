
import React, { useEffect, useState } from "react";
import {
  MapPin,
  RefreshCw,
  IndianRupee,
  Search
} from "lucide-react";
import "./style.css";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

export default function CustomerAreaRates({
  district: selectedDistrict,
  block: selectedBlock
}) {
  const district = selectedDistrict || "";
  const block = selectedBlock || "";

  const [services, setServices] = useState([]);
  const [rates, setRates] = useState([]);

  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(true);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // à¤¸à¤­à¥€ à¤¸à¥‡à¤µà¤¾à¤à¤ à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚
  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        const response = await fetch(`${API}/services`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Services à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤ˆà¤‚"
          );
        }

        const list = Array.isArray(data)
          ? data
          : data.services || [];

        if (active) {
          setServices(list);
        }
      } catch (err) {
        if (active) {
          setServices([]);
          setError(
            err.message || "à¤¸à¥‡à¤µà¤¾à¤à¤ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤ˆà¤‚à¥¤"
          );
        }
      } finally {
        if (active) {
          setServiceLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  // à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚
  async function loadRates() {
    if (!district || !block) {
      setRates([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        district,
        block
      });

      const response = await fetch(
        `${API}/rates?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤"
        );
      }

      setRates(
        Array.isArray(data)
          ? data
          : data.rates || []
      );

    } catch (err) {
      setRates([]);
      setError(
        err.message || "à¤°à¥‡à¤Ÿ à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤à¥¤"
      );

    } finally {
      setLoading(false);
    }
  }

  // à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤•à¤¾ à¤œà¤¿à¤²à¤¾ à¤¯à¤¾ à¤¬à¥à¤²à¥‰à¤• à¤¬à¤¦à¤²à¤¨à¥‡ à¤ªà¤° à¤°à¥‡à¤Ÿ à¤…à¤ªà¤¡à¥‡à¤Ÿ
  useEffect(() => {
    loadRates();
  }, [district, block]);

  // à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤¨à¤¾à¤®
  function getServiceName(service) {
    return (
      service?.service_name ||
      service?.name ||
      service?.service ||
      "à¤…à¤¨à¥à¤¯ à¤¸à¥‡à¤µà¤¾"
    );
  }

  // à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤°à¥‡à¤Ÿ à¤–à¥‹à¤œà¥‡à¤‚
  function findRate(service) {
    const name = getServiceName(service);

    return rates.find((rate) => {
      const rateName =
        rate.service_name ||
        rate.service ||
        rate.name;

      return rateName === name;
    });
  }

  // Search
  const filteredServices = services.filter((service) =>
    getServiceName(service)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="rl-page">

      {/* HEADER */}
      <div className="rl-header">
        <div>
          <span className="rl-kicker">
            BOREWELL MITRA MP
          </span>

          <h2>à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¥‡à¤Ÿ à¤¸à¥‚à¤šà¥€</h2>

          <p>
            à¤†à¤ªà¤•à¥‡ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤•à¥‡ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¥‡ à¤°à¥‡à¤Ÿà¥¤
          </p>
        </div>

        <IndianRupee size={34} />
      </div>

      {/* PROFILE AREA */}
      <div className="rl-selected">
        <span>
          <MapPin size={15} />
          à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤•à¤¾ à¤šà¤¯à¤¨à¤¿à¤¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤°
        </span>

        <strong>
          {district || "à¤œà¤¿à¤²à¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"} /{" "}
          {block || "à¤¬à¥à¤²à¥‰à¤• à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"}
        </strong>
      </div>

      {/* SEARCH */}
      <div className="rl-search">

        <Search size={18} />

        <input
          type="search"
          placeholder="à¤¸à¥‡à¤µà¤¾ à¤–à¥‹à¤œà¥‡à¤‚..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          type="button"
          onClick={loadRates}
          disabled={loading || !district || !block}
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="rl-error">
          {error}
        </div>
      )}

      {/* RATE CARDS */}
      {loading || serviceLoading ? (

        <div className="rl-loading">
          à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...
        </div>

      ) : !district || !block ? (

        <div className="rl-empty">
          à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¹à¤²à¥‡ à¤®à¥‡à¤°à¤¾ à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤² à¤®à¥‡à¤‚ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤
        </div>

      ) : filteredServices.length === 0 ? (

        <div className="rl-empty">
          à¤•à¥‹à¤ˆ à¤¸à¥‡à¤µà¤¾ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤
        </div>

      ) : (

        <div className="rl-grid">

          {filteredServices.map((service, index) => {

            const rate = findRate(service);
            const price = rate?.rate ?? rate?.price;

            return (
              <article
                className="rl-card"
                key={
                  service.id ||
                  getServiceName(service) ||
                  index
                }
              >

                <div className="rl-card-top">

                  <span className="rl-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3>
                    {getServiceName(service)}
                  </h3>

                </div>

                <div className="rl-price">

                  {price !== undefined &&
                  price !== null &&
                  price !== "" ? (
                    `â‚¹${price}`
                  ) : (
                    "à¤°à¥‡à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚"
                  )}

                </div>

                <p className="rl-unit">
                  {rate?.unit ||
                    "à¤à¤¡à¤®à¤¿à¤¨ à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤°à¥‡à¤Ÿ à¤¨à¤¿à¤°à¥à¤§à¤¾à¤°à¤¿à¤¤ à¤¹à¥‹à¤—à¤¾"}
                </p>

                <div className="rl-location">
                  <MapPin size={14} />
                  {district} - {block}
                </div>

              </article>
            );
          })}

        </div>
      )}

      {/* NOTE */}
      <div className="rl-note">
        <strong>à¤¨à¥‹à¤Ÿ:</strong>{" "}
        à¤…à¤‚à¤¤à¤¿à¤® à¤°à¥‡à¤Ÿ à¤”à¤° à¤•à¤¾à¤°à¥à¤¯ à¤•à¥€ à¤¶à¤°à¥à¤¤à¥‹à¤‚ à¤•à¥€ à¤ªà¥à¤·à¥à¤Ÿà¤¿
        à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤à¤œà¥‡à¤‚à¤Ÿ à¤¸à¥‡ à¤…à¤µà¤¶à¥à¤¯ à¤•à¤°à¥‡à¤‚à¥¤
      </div>

    </section>
  );
}
