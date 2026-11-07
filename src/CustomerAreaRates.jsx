
import React, { useEffect, useState } from "react";
import {
  MapPin,
  RefreshCw,
  IndianRupee,
  Search
} from "lucide-react";
import "./style.css";

const API = "http://localhost:4000/api";

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

  // सभी सेवाएँ लोड करें
  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        const response = await fetch(`${API}/services`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Services लोड नहीं हुईं"
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
            err.message || "सेवाएँ लोड नहीं हो पाईं।"
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

  // जिला और ब्लॉक के अनुसार रेट लोड करें
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
          data.message || "रेट लोड नहीं हुए"
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
        err.message || "रेट सर्वर से नहीं मिल पाए।"
      );

    } finally {
      setLoading(false);
    }
  }

  // प्रोफाइल का जिला या ब्लॉक बदलने पर रेट अपडेट
  useEffect(() => {
    loadRates();
  }, [district, block]);

  // सेवा का नाम
  function getServiceName(service) {
    return (
      service?.service_name ||
      service?.name ||
      service?.service ||
      "अन्य सेवा"
    );
  }

  // सेवा का रेट खोजें
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

          <h2>बोरवेल रेट सूची</h2>

          <p>
            आपके प्रोफाइल के क्षेत्र के अनुसार सेवाओं के रेट।
          </p>
        </div>

        <IndianRupee size={34} />
      </div>

      {/* PROFILE AREA */}
      <div className="rl-selected">
        <span>
          <MapPin size={15} />
          प्रोफाइल का चयनित क्षेत्र
        </span>

        <strong>
          {district || "जिला उपलब्ध नहीं"} /{" "}
          {block || "ब्लॉक उपलब्ध नहीं"}
        </strong>
      </div>

      {/* SEARCH */}
      <div className="rl-search">

        <Search size={18} />

        <input
          type="search"
          placeholder="सेवा खोजें..."
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
          रेट लोड हो रहे हैं...
        </div>

      ) : !district || !block ? (

        <div className="rl-empty">
          कृपया पहले मेरा प्रोफाइल में जिला और ब्लॉक चुनें।
        </div>

      ) : filteredServices.length === 0 ? (

        <div className="rl-empty">
          कोई सेवा उपलब्ध नहीं है।
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
                    `₹${price}`
                  ) : (
                    "रेट उपलब्ध नहीं"
                  )}

                </div>

                <p className="rl-unit">
                  {rate?.unit ||
                    "एडमिन द्वारा रेट निर्धारित होगा"}
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
        <strong>नोट:</strong>{" "}
        अंतिम रेट और कार्य की शर्तों की पुष्टि
        संबंधित एजेंट से अवश्य करें।
      </div>

    </section>
  );
}
