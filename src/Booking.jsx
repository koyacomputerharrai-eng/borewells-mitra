
import React, { useState } from "react";
import "./Booking.css";
import * as AreaData from "./areas.js";

const DISTRICTS = AreaData.DISTRICTS || [];

const BLOCKS =
  AreaData.BLOCKS ||
  AreaData.DEVELOPMENT_BLOCKS ||
  AreaData.blocks ||
  {};

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

export default function Booking({ onBack }) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    district: "",
    block: "",
    village: "",
    service: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (
      !form.name.trim() ||
      !form.mobile.trim() ||
      !form.district ||
      !form.block ||
      !form.village.trim() ||
      !form.service
    ) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤­à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤°à¥‡à¤‚à¥¤");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      setMessage("à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¡à¤¾à¤²à¥‡à¤‚à¥¤");
      return;
    }

    const booking = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      district: form.district.trim(),
      block: form.block.trim(),
      village: form.village.trim(),
      service: form.service,
    };

    try {
      setSubmitting(true);
      setMessage("à¤¬à¥à¤•à¤¿à¤‚à¤— à¤­à¥‡à¤œà¥€ à¤œà¤¾ à¤°à¤¹à¥€ à¤¹à¥ˆ...");

      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(booking),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          result.error ||
          "à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¦à¤°à¥à¤œ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¥€à¥¤"
        );
      }

      const bookingNumber =
        result.bookingCode ||
        result.bookingId ||
        result.booking?.bookingCode ||
        result.booking?.id ||
        "à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¦à¤°à¥à¤œ";

      setSuccess(true);
      setMessage(
        `à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¸à¤«à¤²! à¤†à¤ªà¤•à¤¾ à¤¬à¥à¤•à¤¿à¤‚à¤— à¤¨à¤‚à¤¬à¤°: ${bookingNumber}`
      );

      setForm({
        name: "",
        mobile: "",
        district: "",
        block: "",
        village: "",
        service: "",
      });

    } catch (error) {
      setSuccess(false);
      setMessage(
        error.message ||
        "à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤ªà¤¾à¤¯à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-page">
      <div className="booking-container">

        <button
          type="button"
          className="booking-back-btn"
          onClick={onBack}
        >
          â† à¤µà¤¾à¤ªà¤¸ à¤¹à¥‹à¤® à¤ªà¥‡à¤œ
        </button>

        <h1>Book Your Borewell</h1>

        <p>
          à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾ à¤¬à¥à¤• à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¨à¥€à¤šà¥‡ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤°à¥‡à¤‚à¥¤
        </p>

        {message && (
          <div
            className={`booking-message ${
              success ? "success" : "error"
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤® *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="à¤…à¤ªà¤¨à¤¾ à¤¨à¤¾à¤® à¤²à¤¿à¤–à¥‡à¤‚"
            required
          />

          <label>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° *</label>
          <input
            type="tel"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
            maxLength="10"
            inputMode="numeric"
            required
          />

          <label>à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>
          <select
            name="district"
            value={form.district}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                district: e.target.value,
                block: "",
              }))
            }
            required
          >
            <option value="">-- à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <label>à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ *</label>
          <select
            name="block"
            value={form.block}
            onChange={handleChange}
            required
            disabled={!form.district}
          >
            <option value="">-- à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚ --</option>

            {(BLOCKS[form.district] || []).map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>

          <label>à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ *</label>
          <input
            type="text"
            name="village"
            value={form.village}
            onChange={handleChange}
            placeholder="à¤—à¤¾à¤à¤µ, à¤¶à¤¹à¤°, à¤®à¥‹à¤¹à¤²à¥à¤²à¤¾ à¤”à¤° à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾ à¤²à¤¿à¤–à¥‡à¤‚"
            required
          />

          <label>à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ *</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            required
          >
            <option value="">-- à¤¸à¥‡à¤µà¤¾ à¤šà¥à¤¨à¥‡à¤‚ --</option>

            <option value="Drilling">
              à¤¨à¤¯à¤¾ à¤¬à¥‹à¤°à¤µà¥‡à¤²
            </option>

            <option value="Repairing">
              à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤°à¤¿à¤ªà¥‡à¤¯à¤°à¤¿à¤‚à¤—
            </option>
          </select>

          <button type="submit" disabled={submitting}>
            {submitting
              ? "à¤¬à¥à¤•à¤¿à¤‚à¤— à¤­à¥‡à¤œà¥€ à¤œà¤¾ à¤°à¤¹à¥€ à¤¹à¥ˆ..."
              : "Booking Submit à¤•à¤°à¥‡à¤‚"}
          </button>

        </form>
      </div>
    </div>
  );
}
