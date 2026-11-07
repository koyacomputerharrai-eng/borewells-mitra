
import React, { useState } from "react";
import "./Booking.css";
import * as AreaData from "./areas.js";

const DISTRICTS = AreaData.DISTRICTS || [];

const BLOCKS =
  AreaData.BLOCKS ||
  AreaData.DEVELOPMENT_BLOCKS ||
  AreaData.blocks ||
  {};

const API = "http://localhost:4000/api";

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
      setMessage("कृपया सभी जानकारी भरें।");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      setMessage("कृपया सही 10 अंकों का मोबाइल नंबर डालें।");
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
      setMessage("बुकिंग भेजी जा रही है...");

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
          "बुकिंग दर्ज नहीं हो सकी।"
        );
      }

      const bookingNumber =
        result.bookingCode ||
        result.bookingId ||
        result.booking?.bookingCode ||
        result.booking?.id ||
        "सफलतापूर्वक दर्ज";

      setSuccess(true);
      setMessage(
        `बुकिंग सफल! आपका बुकिंग नंबर: ${bookingNumber}`
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
        "सर्वर से संपर्क नहीं हो पाया। कृपया दोबारा प्रयास करें।"
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
          ← वापस होम पेज
        </button>

        <h1>Book Your Borewell</h1>

        <p>
          बोरवेल सेवा बुक करने के लिए नीचे जानकारी भरें।
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

          <label>ग्राहक का नाम *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="अपना नाम लिखें"
            required
          />

          <label>मोबाइल नंबर *</label>
          <input
            type="tel"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="10 अंकों का मोबाइल नंबर"
            maxLength="10"
            inputMode="numeric"
            required
          />

          <label>जिला चुनें *</label>
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
            <option value="">-- जिला चुनें --</option>

            {DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <label>ब्लॉक चुनें *</label>
          <select
            name="block"
            value={form.block}
            onChange={handleChange}
            required
            disabled={!form.district}
          >
            <option value="">-- ब्लॉक चुनें --</option>

            {(BLOCKS[form.district] || []).map((block) => (
              <option key={block} value={block}>
                {block}
              </option>
            ))}
          </select>

          <label>पूरा पता *</label>
          <input
            type="text"
            name="village"
            value={form.village}
            onChange={handleChange}
            placeholder="गाँव, शहर, मोहल्ला और पूरा पता लिखें"
            required
          />

          <label>सेवा चुनें *</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            required
          >
            <option value="">-- सेवा चुनें --</option>

            <option value="Drilling">
              नया बोरवेल
            </option>

            <option value="Repairing">
              बोरवेल रिपेयरिंग
            </option>
          </select>

          <button type="submit" disabled={submitting}>
            {submitting
              ? "बुकिंग भेजी जा रही है..."
              : "Booking Submit करें"}
          </button>

        </form>
      </div>
    </div>
  );
}
