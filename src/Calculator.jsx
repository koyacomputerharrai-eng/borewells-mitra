
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Calculator as CalculatorIcon,
  UserRound,
  MapPin,
  Drill,
  FileDown,
  CalendarDays,
  IndianRupee,
  ReceiptText,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { DISTRICTS, BLOCKS } from "./areas.js";

const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:4000/api" : "/api";

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

function getBlocksForDistrict(district) {
  const list = BLOCKS?.[district];
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return Object.keys(list);
  return [];
}

function getServiceName(item) {
  return item.service_name || item.service || item.name || "à¤…à¤¨à¥à¤¯ à¤¸à¥‡à¤µà¤¾";
}

function getServiceRate(item) {
  return Number(item.rate ?? item.price ?? 0);
}

function getServiceKey(item, index) {
  return String(item.id ?? `${getServiceName(item)}-${index}`);
}

function numberWords(number) {
  const n = Math.floor(Number(number) || 0);
  if (n === 0) return "à¤¶à¥‚à¤¨à¥à¤¯";

  const ones = [
    "", "à¤à¤•", "à¤¦à¥‹", "à¤¤à¥€à¤¨", "à¤šà¤¾à¤°", "à¤ªà¤¾à¤à¤š", "à¤›à¤¹", "à¤¸à¤¾à¤¤",
    "à¤†à¤ ", "à¤¨à¥Œ", "à¤¦à¤¸", "à¤—à¥à¤¯à¤¾à¤°à¤¹", "à¤¬à¤¾à¤°à¤¹", "à¤¤à¥‡à¤°à¤¹",
    "à¤šà¥Œà¤¦à¤¹", "à¤ªà¤‚à¤¦à¥à¤°à¤¹", "à¤¸à¥‹à¤²à¤¹", "à¤¸à¤¤à¥à¤°à¤¹", "à¤…à¤ à¤¾à¤°à¤¹", "à¤‰à¤¨à¥à¤¨à¥€à¤¸"
  ];

  const tens = [
    "", "", "à¤¬à¥€à¤¸", "à¤¤à¥€à¤¸", "à¤šà¤¾à¤²à¥€à¤¸", "à¤ªà¤šà¤¾à¤¸",
    "à¤¸à¤¾à¤ ", "à¤¸à¤¤à¥à¤¤à¤°", "à¤…à¤¸à¥à¤¸à¥€", "à¤¨à¤¬à¥à¤¬à¥‡"
  ];

  const convert = (x) => {
    if (x < 20) return ones[x];
    if (x < 100) {
      const remainder = x % 10;
      return remainder
        ? tens[Math.floor(x / 10)] + " " + ones[remainder]
        : tens[Math.floor(x / 10)];
    }
    if (x < 1000)
      return ones[Math.floor(x / 100)] + " à¤¸à¥Œ " + convert(x % 100);
    if (x < 100000)
      return convert(Math.floor(x / 1000)) + " à¤¹à¤œà¤¾à¤° " + convert(x % 1000);
    if (x < 10000000)
      return convert(Math.floor(x / 100000)) + " à¤²à¤¾à¤– " + convert(x % 100000);
    return convert(Math.floor(x / 10000000)) + " à¤•à¤°à¥‹à¤¡à¤¼ " + convert(x % 10000000);
  };

  return convert(n).replace(/\s+/g, " ").trim();
}

export default function Calculator() {
  const pdfRef = useRef(null);

  const districts = useMemo(
    () => [...(DISTRICTS || [])].sort((a, b) =>
      String(a).localeCompare(String(b), "hi")
    ),
    []
  );

  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");

  const blocks = useMemo(
    () => getBlocksForDistrict(district),
    [district]
  );

  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  const [billDate, setBillDate] = useState(today);
  const [billNo] = useState(
    () => "BM-" + Date.now().toString().slice(-8)
  );

  const [rates, setRates] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const showNotice = (text, type = "error") => {
    setNotice({ text, type });
  };

  // à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° Rate List à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚
  const loadRates = useCallback(async (signal) => {
    if (!district || !block) {
      setRates([]);
      return;
    }

    setLoadingRates(true);
    setError("");

    try {
      const params = new URLSearchParams({ district, block });

      const response = await fetch(
        `${API}/rates?${params.toString()}`,
        signal ? { signal } : {}
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤à¥¤");
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.rates)
          ? data.rates
          : [];

      setRates(list);
      setQuantities({});

      if (list.length === 0) {
        setError("à¤‡à¤¸ à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤­à¥€ à¤•à¥‹à¤ˆ à¤°à¥‡à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setRates([]);
        setError(err.message || "à¤°à¥‡à¤Ÿ à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤à¥¤");
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingRates(false);
      }
    }
  }, [district, block]);

  useEffect(() => {
    if (!district || !block) {
      setRates([]);
      setLoadingRates(false);
      return undefined;
    }

    const controller = new AbortController();
    loadRates(controller.signal);

    return () => controller.abort();
  }, [district, block, loadRates]);

  // à¤•à¥‡à¤µà¤² Quantity à¤­à¤°à¥€ à¤¹à¥à¤ˆ Services
  const items = useMemo(() => {
    return rates
      .map((item, index) => {
        const key = getServiceKey(item, index);
        const quantity = Number(quantities[key] || 0);

        return {
          id: key,
          service: getServiceName(item),
          quantity,
          rate: getServiceRate(item),
          unit: item.unit || "à¤ªà¥à¤°à¤¤à¤¿ à¤¯à¥‚à¤¨à¤¿à¤Ÿ",
        };
      })
      .filter((item) => item.quantity > 0);
  }, [rates, quantities]);

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  const updateQuantity = (key, value) => {
    if (value !== "" && Number(value) < 0) return;

    setQuantities((old) => ({
      ...old,
      [key]: value,
    }));
  };

  function resetCalculator() {
    setCustomer({
      name: "",
      mobile: "",
      address: "",
    });

    setDistrict("");
    setBlock("");
    setRates([]);
    setQuantities({});
    setBillDate(today());
    setNotice({
      type: "success",
      text: "à¤•à¥ˆà¤²à¤•à¥à¤²à¥‡à¤Ÿà¤° à¤°à¥€à¤¸à¥‡à¤Ÿ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤",
    });
  }

  async function downloadPDF() {
    if (!customer.name.trim()) {
      return showNotice("à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤® à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤");
    }

    if (customer.mobile.length !== 10) {
      return showNotice("à¤¸à¤¹à¥€ 10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤");
    }

    if (!district || !block) {
      return showNotice("à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚à¥¤");
    }

    if (loadingRates) {
      return showNotice("à¤°à¥‡à¤Ÿ à¤²à¥‹à¤¡ à¤¹à¥‹à¤¨à¥‡ à¤¤à¤• à¤‡à¤‚à¤¤à¤œà¤¾à¤° à¤•à¤°à¥‡à¤‚à¥¤");
    }

    if (!items.length) {
      return showNotice("à¤•à¤® à¤¸à¥‡ à¤•à¤® à¤à¤• Service à¤•à¥€ Quantity à¤­à¤°à¥‡à¤‚à¥¤");
    }

    if (items.some((item) => item.rate <= 0)) {
      return showNotice("à¤•à¤¿à¤¸à¥€ Service à¤•à¤¾ à¤°à¥‡à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤");
    }

    const element = pdfRef.current;

    if (!element) {
      return showNotice("PDF à¤•à¤‚à¤Ÿà¥‡à¤‚à¤Ÿ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤");
    }

    setDownloading(true);
    setNotice({ type: "", text: "" });

    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        )
      );

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const image = canvas.toDataURL("image/jpeg", 0.96);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 0;

      pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${billNo}.pdf`);

      showNotice("à¤†à¤ªà¤•à¥€ Estimate PDF à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤¹à¥‹ à¤—à¤ˆà¥¤", "success");
    } catch (err) {
      console.error(err);
      showNotice("PDF à¤¬à¤¨à¤¾à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤†à¤ˆà¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤");
    } finally {
      setDownloading(false);
    }
  }

  const dateText = new Date(`${billDate}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  return (
    <main className="bmm-premium">

      <header className="bmm-topbar">
        <div className="bmm-brand">
          <div className="bmm-brand-icon">
            <Drill size={25} />
          </div>

          <div>
            <h1>Borewells Mitra</h1>
            <p>Professional Estimate Calculator</p>
          </div>
        </div>

        <div className="bmm-live">
          <span /> CALCULATOR
        </div>
      </header>

      <section className="bmm-hero">
        <div>
          <div className="bmm-eyebrow">
            BOREWELL SERVICES â€¢ MADHYA PRADESH
          </div>

          <h2>
            Estimate <span>Calculator</span>
          </h2>

          <p>
            à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤°à¥‡à¤Ÿ à¤²à¥‡à¤•à¤° à¤…à¤ªà¤¨à¤¾ à¤…à¤¨à¥à¤®à¤¾à¤¨ à¤¤à¥ˆà¤¯à¤¾à¤° à¤•à¤°à¥‡à¤‚à¥¤
          </p>
        </div>

        <div className="bmm-hero-icon">
          <CalculatorIcon size={46} />
        </div>
      </section>

      <section className="bmm-stat-grid">
        <div className="bmm-stat-card">
          <div className="bmm-stat-icon blue">
            <ReceiptText />
          </div>
          <div>
            <small>ESTIMATE NUMBER</small>
            <strong>{billNo}</strong>
          </div>
        </div>

        <div className="bmm-stat-card">
          <div className="bmm-stat-icon green">
            <IndianRupee />
          </div>
          <div>
            <small>GRAND TOTAL</small>
            <strong>â‚¹{money(total)}</strong>
          </div>
        </div>

        <div className="bmm-stat-card">
          <div className="bmm-stat-icon purple">
            <Drill />
          </div>
          <div>
            <small>SELECTED SERVICES</small>
            <strong>{items.length} / {rates.length}</strong>
          </div>
        </div>
      </section>

      {/* CUSTOMER DETAILS */}
      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon">
            <UserRound />
          </div>

          <div>
            <h3>Customer Details</h3>
            <p>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¥€ à¤œà¤¾à¤¨à¤•à¤¾à¤°à¥€ à¤­à¤°à¥‡à¤‚</p>
          </div>

          <span className="bmm-step">01</span>
        </div>

        <div className="bmm-form-grid">
          <label className="bmm-field">
            <span>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤® <i>*</i></span>

            <input
              placeholder="à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¾à¤®"
              value={customer.name}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  name: e.target.value,
                })
              }
            />
          </label>

          <label className="bmm-field">
            <span>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° <i>*</i></span>

            <input
              type="tel"
              maxLength="10"
              placeholder="10 à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°"
              value={customer.mobile}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
            />
          </label>

          <label className="bmm-field bmm-span-2">
            <span>à¤ªà¥‚à¤°à¤¾ à¤ªà¤¤à¤¾</span>

            <input
              placeholder="à¤—à¥à¤°à¤¾à¤®, à¤ªà¥‹à¤¸à¥à¤Ÿ, à¤ªà¤¿à¤¨ à¤•à¥‹à¤¡ à¤†à¤¦à¤¿"
              value={customer.address}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  address: e.target.value,
                })
              }
            />
          </label>
        </div>
      </section>

      {/* LOCATION */}
      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon">
            <MapPin />
          </div>

          <div>
            <h3>Location Details</h3>
            <p>à¤°à¥‡à¤Ÿ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤ªà¤¨à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤šà¥à¤¨à¥‡à¤‚</p>
          </div>

          <span className="bmm-step">02</span>
        </div>

        <div className="bmm-form-grid">
          <label className="bmm-field">
            <span>à¤œà¤¿à¤²à¤¾ <i>*</i></span>

            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setBlock("");
                setRates([]);
                setQuantities({});
                setError("");
              }}
            >
              <option value="">à¤œà¤¿à¤²à¤¾ à¤šà¥à¤¨à¥‡à¤‚</option>

              {districts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>à¤¬à¥à¤²à¥‰à¤• <i>*</i></span>

            <select
              value={block}
              disabled={!district}
              onChange={(e) => {
                setBlock(e.target.value);
                setRates([]);
                setQuantities({});
                setError("");
              }}
            >
              <option value="">à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</option>

              {blocks.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>à¤¬à¤¿à¤² à¤•à¥€ à¤¤à¤¾à¤°à¥€à¤–</span>

            <div className="bmm-date-wrap">
              <CalendarDays size={17} />

              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>
          </label>
        </div>
      </section>

      {/* RATE LIST SERVICES */}
      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon">
            <Drill />
          </div>

          <div>
            <h3>Services & Quantity</h3>
            <p>
              Rate List à¤¸à¥‡ à¤†à¤ à¤°à¥‡à¤Ÿ à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤…à¤ªà¤¨à¥€ à¤®à¤¾à¤¤à¥à¤°à¤¾ à¤­à¤°à¥‡à¤‚à¥¤
            </p>
          </div>

          <span className="bmm-step">03</span>
        </div>

        {!district || !block ? (
          <div className="bmm-empty">
            <MapPin size={30} />
            <strong>à¤ªà¤¹à¤²à¥‡ à¤œà¤¿à¤²à¤¾ à¤”à¤° à¤¬à¥à¤²à¥‰à¤• à¤šà¥à¤¨à¥‡à¤‚</strong>
            <small>à¤‡à¤¸à¤•à¥‡ à¤¬à¤¾à¤¦ à¤¸à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ Services à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤‚à¤—à¥€à¥¤</small>
          </div>
        ) : loadingRates ? (
          <div className="bmm-empty">
            <LoaderCircle className="bmm-spin" size={30} />
            <strong>Rate List à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¥€ à¤¹à¥ˆ...</strong>
          </div>
        ) : error ? (
          <div className="bmm-notice error">{error}</div>
        ) : rates.length === 0 ? (
          <div className="bmm-empty">
            <strong>à¤•à¥‹à¤ˆ Service à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤</strong>
            <small>Admin à¤¸à¥‡ à¤‡à¤¸ à¤¬à¥à¤²à¥‰à¤• à¤•à¥€ Rate List à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤•à¤°à¤µà¤¾à¤à¤à¥¤</small>
          </div>
        ) : (
          <>
            <div className="bmm-rate-location">
              <MapPin size={16} />
              <strong>{district} / {block}</strong>

              <button
                type="button"
                onClick={() => loadRates()}
                className="bmm-refresh-btn"
              >
                <RefreshCw size={15} /> à¤°à¥‡à¤Ÿ à¤°à¤¿à¤«à¥à¤°à¥‡à¤¶
              </button>
            </div>

            <div className="bmm-quantity-list">
              {rates.map((item, index) => {
                const key = getServiceKey(item, index);
                const quantity = quantities[key] ?? "";
                const rate = getServiceRate(item);
                const unit = item.unit || "à¤ªà¥à¤°à¤¤à¤¿ à¤¯à¥‚à¤¨à¤¿à¤Ÿ";
                const amount = (Number(quantity) || 0) * rate;

                return (
                  <div className="bmm-quantity-row" key={key}>
                    <div className="bmm-quantity-service">
                      <strong>{getServiceName(item)}</strong>
                      <small>
                        â‚¹{money(rate)} / {unit}
                      </small>
                    </div>

                    <div className="bmm-quantity-input">
                      <label htmlFor={`quantity-${index}`}>
                        à¤®à¤¾à¤¤à¥à¤°à¤¾ ({unit})
                      </label>

                      <input
                        id={`quantity-${index}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) =>
                          updateQuantity(key, e.target.value)
                        }
                      />
                    </div>

                    <div className="bmm-quantity-amount">
                      <small>à¤•à¥à¤² à¤°à¤¾à¤¶à¤¿</small>
                      <strong>â‚¹{money(amount)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {notice.text && (
          <div className={`bmm-notice ${notice.type}`}>
            {notice.type === "success" && (
              <CheckCircle2 size={17} />
            )}
            {notice.text}
          </div>
        )}
      </section>

      {/* TOTAL */}
      <section className="bmm-summary">
        <div>
          <small>ESTIMATED TOTAL</small>
          <h2>â‚¹{money(total)}</h2>

          <p>
            {total
              ? numberWords(total) + " à¤°à¥à¤ªà¤¯à¥‡ à¤®à¤¾à¤¤à¥à¤°"
              : "Quantity à¤­à¤°à¤¨à¥‡ à¤ªà¤° à¤•à¥à¤² à¤°à¤¾à¤¶à¤¿ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤—à¥€à¥¤"}
          </p>
        </div>

        <div className="bmm-summary-mark">
          <IndianRupee size={35} />
        </div>
      </section>

      <div className="bmm-actions">
        <button
          className="bmm-reset-btn"
          onClick={resetCalculator}
        >
          <RefreshCw size={17} /> Reset
        </button>

        <button
          className="bmm-pdf-btn"
          onClick={downloadPDF}
          disabled={downloading || loadingRates}
        >
          {downloading ? (
            <>
              <LoaderCircle className="bmm-spin" size={18} />
              PDF à¤¬à¤¨ à¤°à¤¹à¥€ à¤¹à¥ˆ...
            </>
          ) : (
            <>
              <FileDown size={19} />
              Estimate PDF à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚
            </>
          )}
        </button>
      </div>

      {/* PDF CONTENT */}
      <div className="bmm-pdf-area">
        <div className="bmm-pdf-document" ref={pdfRef}>
          <div className="bmm-pdf-header">
            <div className="bmm-pdf-logo">
              <Drill size={30} />
            </div>

            <div>
              <h1>BOREWELLS MITRA</h1>
              <p>BOREWELL â€¢ DRILLING â€¢ PIPE SERVICES</p>
            </div>

            <div className="bmm-pdf-label">ESTIMATE</div>
          </div>

          <div className="bmm-pdf-title">
            <h2>ESTIMATE / SERVICE BILL</h2>
            <p>à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤…à¤¨à¥à¤®à¤¾à¤¨ à¤à¤µà¤‚ à¤µà¤¿à¤µà¤°à¤£</p>
          </div>

          <div className="bmm-pdf-meta">
            <div>
              <small>Estimate No.</small>
              <strong>{billNo}</strong>
            </div>

            <div>
              <small>Date</small>
              <strong>{dateText}</strong>
            </div>
          </div>

          <div className="bmm-pdf-customer">
            <h3>CUSTOMER INFORMATION</h3>

            <div className="bmm-pdf-info-grid">
              <div>
                <small>à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¨à¤¾à¤®</small>
                <strong>{customer.name || "â€”"}</strong>
              </div>

              <div>
                <small>à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤°</small>
                <strong>{customer.mobile || "â€”"}</strong>
              </div>

              <div className="bmm-pdf-wide">
                <small>à¤ªà¤¤à¤¾</small>
                <strong>{customer.address || "â€”"}</strong>
              </div>

              <div>
                <small>à¤œà¤¿à¤²à¤¾</small>
                <strong>{district || "â€”"}</strong>
              </div>

              <div>
                <small>à¤¬à¥à¤²à¥‰à¤•</small>
                <strong>{block || "â€”"}</strong>
              </div>
            </div>
          </div>

          <div className="bmm-pdf-services">
            <h3>SERVICE & PRICE DETAILS</h3>

            <table>
              <thead>
                <tr>
                  <th>à¤•à¥à¤°.</th>
                  <th>à¤¸à¤°à¥à¤µà¤¿à¤¸ à¤•à¤¾ à¤µà¤¿à¤µà¤°à¤£</th>
                  <th>à¤®à¤¾à¤¤à¥à¤°à¤¾</th>
                  <th>à¤°à¥‡à¤Ÿ (â‚¹)</th>
                  <th>à¤°à¤¾à¤¶à¤¿ (â‚¹)</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.service}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{money(item.rate)}</td>
                    <td>{money(item.quantity * item.rate)}</td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan="5">à¤…à¤­à¥€ à¤•à¥‹à¤ˆ Service à¤¨à¤¹à¥€à¤‚ à¤šà¥à¤¨à¥€ à¤—à¤ˆà¥¤</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bmm-pdf-total">
            <span>GRAND TOTAL / à¤•à¥à¤² à¤°à¤¾à¤¶à¤¿</span>
            <strong>â‚¹{money(total)}</strong>
          </div>

          <div className="bmm-pdf-words">
            <small>à¤°à¤¾à¤¶à¤¿ à¤¶à¤¬à¥à¤¦à¥‹à¤‚ à¤®à¥‡à¤‚</small>
            <strong>
              {total ? numberWords(total) + " à¤°à¥à¤ªà¤¯à¥‡ à¤®à¤¾à¤¤à¥à¤°" : "â€”"}
            </strong>
          </div>

          <div className="bmm-pdf-footer">
            <div>
              <strong>Borewells Mitra</strong>
              <p>à¤†à¤ªà¤•à¥€ à¤¬à¥‹à¤°à¤µà¥‡à¤² à¤¸à¥‡à¤µà¤¾ à¤•à¤¾ à¤µà¤¿à¤¶à¥à¤µà¤¸à¤¨à¥€à¤¯ à¤¸à¤¾à¤¥à¥€</p>
            </div>

            <div className="bmm-sign">
              <span>Authorized Signature</span>
              <small>à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤¹à¤¸à¥à¤¤à¤¾à¤•à¥à¤·à¤°</small>
            </div>
          </div>

          <div className="bmm-pdf-bottom">
            à¤¯à¤¹ à¤•à¥‡à¤µà¤² à¤…à¤¨à¥à¤®à¤¾à¤¨ à¤¹à¥ˆ, à¤…à¤‚à¤¤à¤¿à¤® à¤¬à¤¿à¤² à¤¨à¤¹à¥€à¤‚à¥¤
          </div>
        </div>
      </div>
    </main>
  );
}
