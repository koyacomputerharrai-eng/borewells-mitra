
import React, { useState } from "react";
import { DISTRICTS, BLOCKS } from "./areas.js";
import "./CustomerRegistration.css";

const API = "http://localhost:4000/api";

const SERVICES = [
  { value: "New Borewell", label: "नया बोरवेल" },
  { value: "Repairing", label: "बोरवेल रिपेयरिंग" }
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
      setError("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }

    if (form.password.length < 6) {
      setError("पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।");
      return;
    }

    if (!form.district || !form.block) {
      setError("कृपया जिला और ब्लॉक चुनें।");
      return;
    }

    if (!form.service) {
      setError("कृपया अपनी सेवा चुनें।");
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
          "पंजीकरण नहीं हो सका।"
        );
      }

      setSuccess(
        data.message || "आपका अकाउंट सफलतापूर्वक बन गया है।"
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
        err.message || "सर्वर से संपर्क नहीं हो सका।"
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

          <h2>अपना ग्राहक अकाउंट बनाएँ</h2>

          <p>
            Borewell Mitra MP से जुड़ें और
            अपनी सेवाओं का लाभ लें।
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

          {/* पूरा नाम */}

          <div className="register-field">
            <label>पूरा नाम *</label>

            <input
              type="text"
              name="name"
              placeholder="अपना पूरा नाम लिखें"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* मोबाइल नंबर */}

          <div className="register-field">
            <label>मोबाइल नंबर *</label>

            <input
              type="tel"
              name="mobile"
              placeholder="10 अंकों का मोबाइल नंबर"
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

          {/* पासवर्ड - मोबाइल के तुरंत बाद */}

          <div className="register-field">
            <label>पासवर्ड बनाएँ *</label>

            <input
              type="password"
              name="password"
              placeholder="कम से कम 6 अक्षर"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          {/* जिला */}

          <div className="register-field">
            <label>जिला चुनें *</label>

            <select
              name="district"
              value={form.district}
              onChange={handleChange}
              required
            >
              <option value="">
                -- अपना जिला चुनें --
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

          {/* ब्लॉक */}

          <div className="register-field">
            <label>ब्लॉक चुनें *</label>

            <select
              name="block"
              value={form.block}
              onChange={handleChange}
              disabled={!form.district || blocks.length === 0}
              required
            >
              <option value="">
                {form.district
                  ? "-- अपना ब्लॉक चुनें --"
                  : "-- पहले जिला चुनें --"}
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

          {/* सेवा */}

          <div className="register-field">
            <label>सेवा चुनें *</label>

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
              ? "पंजीकरण हो रहा है..."
              : "रजिस्टर करें"}
          </button>

        </form>

        <div className="register-login">
          पहले से अकाउंट है?

          <button
            type="button"
            onClick={onLogin}
          >
            लॉगिन करें
          </button>
        </div>

      </div>
    </div>
  );
}
