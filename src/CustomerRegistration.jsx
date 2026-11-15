
import React, { useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";
import "./CustomerRegistration.css";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

const SERVICES = [
  { value: "New Borewell", label: "à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤²" },
  { value: "Repairing", label: "à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤—" }
];

export default function CustomerRegistration({ onSuccess, onLogin }) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    password: "",
    district: "",
    block: "",
    address: "",
    service: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const blocks = form.district
    ? BLOCKS[form.district] || []
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "district" ? { block: "" } : {})
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setError("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (form.password.length < 6) {
      setError("à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¤® à¤¸à¥‡ à¤•à¤® 6 à¤…à¤•à¥à¤·à¤°à¥‹à¤‚ à¤•à¤¾ à¤¹à¥‹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤");
      return;
    }

    if (!form.district || !form.block) {
      setError("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    if (!form.service) {
      setError("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤…à¤ªà¤¨à¥€ à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚à¥¤");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          role: "customer"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾à¥¤"
        );
      }

      setSuccess(
        data.message || "à¤†à¤ªà¤•à¤¾ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¨ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤"
      );

      if (onSuccess) {
        onSuccess(data);
      }

      setForm({
        name: "",
        mobile: "",
        password: "",
        district: "",
        block: "",
        address: "",
        service: ""
      });

    } catch (err) {
      setError(
        err.message || "à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾à¥¤"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-register-page">
      <div className="customer-register-card">

        <div className="register-heading">
          <div className="register-logo">BM</div>

          <h2>à¤…à¤ªà¤¨à¤¾ à¤—à¥à¤°à¤¾à¤¹à¤• à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¬à¤¨à¤¾à¤à¤</h2>

          <p>
            Borewell Mitra MP à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥‡à¤‚ à¤”à¤°
            à¤…à¤ªà¤¨à¥€ à¤¸à¥‡à¤µà¤¾à¤“à¤‚ à¤•à¤¾ à¤²à¤¾à¤­ à¤²à¥‡à¤‚à¥¤
          </p>
        </div>

        {error && (
          <div className="register-alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="register-alert success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® */}

          <div className="register-field">
            <label>à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® *</label>

            <input
              type="text"
              name="name"
              placeholder="à¤…à¤ªà¤¨à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° */}

          <div className="register-field">
            <label>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>

            <input
              type="tel"
              name="mobile"
              placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
              value={form.mobile}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setForm((prev) => ({
                  ...prev,
                  mobile: value
                }));

                setError("");
              }}
              maxLength={10}
              inputMode="numeric"
              required
            />
          </div>

          {/* à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ - à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤•à¥‡ à¤¤à¥à¤°à¤‚à¤¤ à¤¬à¤¾à¤¦ */}

          <div className="register-field">
            <label>à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¬à¤¨à¤¾à¤à¤ *</label>

            <input
              type="password"
              name="password"
              placeholder="à¤•à¤® à¤¸à¥‡ à¤•à¤® 6 à¤…à¤•à¥à¤·à¤°"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          {/* à¤œà¤¿à¤²à¤¾ */}

          <div className="register-field">
            <label>à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>

            <select
              name="district"
              value={form.district}
              onChange={handleChange}
              required
            >
              <option value="">
                -- à¤…à¤ªà¤¨à¤¾ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --
              </option>

              {DISTRICTS.map((district) => (
                <option
                  key={district}
                  value={district}
                >
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* à¤¬à¥à¤²à¥‰à¤• */}

          <div className="register-field">
            <label>à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *</label>

            <select
              name="block"
              value={form.block}
              onChange={handleChange}
              disabled={!form.district || blocks.length === 0}
              required
            >
              <option value="">
                {form.district
                  ? "-- à¤…à¤ªà¤¨à¤¾ à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --"
                  : "-- à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --"}
              </option>

              {blocks.map((block) => (
                <option
                  key={block}
                  value={block}
                >
                  {block}
                </option>
              ))}
            </select>
          </div>

          {/* à¤¸à¥‡à¤µà¤¾ */}

          <div className="register-field">
            <label>à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>

            <div className="register-service-options">

              {SERVICES.map((service, index) => (
                <label
                  key={service.value}
                  className={`register-service ${
                    form.service === service.value
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    value={service.value}
                    checked={
                      form.service === service.value
                    }
                    onChange={handleChange}
                    required={index === 0}
                  />

                  <span>
                    {index + 1}. {service.label}
                  </span>
                </label>
              ))}

            </div>
          </div>

          {/* Register Button */}

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading
              ? "à¤ªà¤‚à¤œà¥€à¤•à¤°à¤£ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ..."
              : "à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤° à¤•à¤°à¥‡à¤‚"}
          </button>

        </form>

        <div className="register-login">
          à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ à¤…à¤•à¤¾à¤‰à¤‚à¤Ÿ à¤¹à¥ˆ?

          <button
            type="button"
            onClick={onLogin}
          >
            à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚
          </button>
        </div>

      </div>
    </div>
  );
}
