
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

const API = `http://${window.location.hostname}:4000/api`;

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
  return item.service_name || item.service || item.name || "अन्य सेवा";
}

function getServiceRate(item) {
  return Number(item.rate ?? item.price ?? 0);
}

function getServiceKey(item, index) {
  return String(item.id ?? `${getServiceName(item)}-${index}`);
}

function numberWords(number) {
  const n = Math.floor(Number(number) || 0);
  if (n === 0) return "शून्य";

  const ones = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात",
    "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह",
    "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस"
  ];

  const tens = [
    "", "", "बीस", "तीस", "चालीस", "पचास",
    "साठ", "सत्तर", "अस्सी", "नब्बे"
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
      return ones[Math.floor(x / 100)] + " सौ " + convert(x % 100);
    if (x < 100000)
      return convert(Math.floor(x / 1000)) + " हजार " + convert(x % 1000);
    if (x < 10000000)
      return convert(Math.floor(x / 100000)) + " लाख " + convert(x % 100000);
    return convert(Math.floor(x / 10000000)) + " करोड़ " + convert(x % 10000000);
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

  // जिला और ब्लॉक के अनुसार Rate List लोड करें
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
        throw new Error(data.message || "रेट लोड नहीं हुए।");
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.rates)
          ? data.rates
          : [];

      setRates(list);
      setQuantities({});

      if (list.length === 0) {
        setError("इस ब्लॉक के लिए अभी कोई रेट उपलब्ध नहीं है।");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setRates([]);
        setError(err.message || "रेट सर्वर से नहीं मिल पाए।");
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

  // केवल Quantity भरी हुई Services
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
          unit: item.unit || "प्रति यूनिट",
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
      text: "कैलकुलेटर रीसेट हो गया।",
    });
  }

  async function downloadPDF() {
    if (!customer.name.trim()) {
      return showNotice("ग्राहक का नाम दर्ज करें।");
    }

    if (customer.mobile.length !== 10) {
      return showNotice("सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
    }

    if (!district || !block) {
      return showNotice("जिला और ब्लॉक चुनें।");
    }

    if (loadingRates) {
      return showNotice("रेट लोड होने तक इंतजार करें।");
    }

    if (!items.length) {
      return showNotice("कम से कम एक Service की Quantity भरें।");
    }

    if (items.some((item) => item.rate <= 0)) {
      return showNotice("किसी Service का रेट उपलब्ध नहीं है।");
    }

    const element = pdfRef.current;

    if (!element) {
      return showNotice("PDF कंटेंट नहीं मिला।");
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

      showNotice("आपकी Estimate PDF डाउनलोड हो गई।", "success");
    } catch (err) {
      console.error(err);
      showNotice("PDF बनाने में समस्या आई। दोबारा प्रयास करें।");
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
            BOREWELL SERVICES • MADHYA PRADESH
          </div>

          <h2>
            Estimate <span>Calculator</span>
          </h2>

          <p>
            जिला और ब्लॉक के अनुसार रेट लेकर अपना अनुमान तैयार करें।
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
            <strong>₹{money(total)}</strong>
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
            <p>ग्राहक की जानकारी भरें</p>
          </div>

          <span className="bmm-step">01</span>
        </div>

        <div className="bmm-form-grid">
          <label className="bmm-field">
            <span>ग्राहक का नाम <i>*</i></span>

            <input
              placeholder="ग्राहक का पूरा नाम"
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
            <span>मोबाइल नंबर <i>*</i></span>

            <input
              type="tel"
              maxLength="10"
              placeholder="10 अंकों का मोबाइल नंबर"
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
            <span>पूरा पता</span>

            <input
              placeholder="ग्राम, पोस्ट, पिन कोड आदि"
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
            <p>रेट प्राप्त करने के लिए अपना क्षेत्र चुनें</p>
          </div>

          <span className="bmm-step">02</span>
        </div>

        <div className="bmm-form-grid">
          <label className="bmm-field">
            <span>जिला <i>*</i></span>

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
              <option value="">जिला चुनें</option>

              {districts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>ब्लॉक <i>*</i></span>

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
              <option value="">ब्लॉक चुनें</option>

              {blocks.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>बिल की तारीख</span>

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
              Rate List से आए रेट के अनुसार अपनी मात्रा भरें।
            </p>
          </div>

          <span className="bmm-step">03</span>
        </div>

        {!district || !block ? (
          <div className="bmm-empty">
            <MapPin size={30} />
            <strong>पहले जिला और ब्लॉक चुनें</strong>
            <small>इसके बाद सभी उपलब्ध Services दिखाई देंगी।</small>
          </div>
        ) : loadingRates ? (
          <div className="bmm-empty">
            <LoaderCircle className="bmm-spin" size={30} />
            <strong>Rate List लोड हो रही है...</strong>
          </div>
        ) : error ? (
          <div className="bmm-notice error">{error}</div>
        ) : rates.length === 0 ? (
          <div className="bmm-empty">
            <strong>कोई Service उपलब्ध नहीं है।</strong>
            <small>Admin से इस ब्लॉक की Rate List अपडेट करवाएँ।</small>
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
                <RefreshCw size={15} /> रेट रिफ्रेश
              </button>
            </div>

            <div className="bmm-quantity-list">
              {rates.map((item, index) => {
                const key = getServiceKey(item, index);
                const quantity = quantities[key] ?? "";
                const rate = getServiceRate(item);
                const unit = item.unit || "प्रति यूनिट";
                const amount = (Number(quantity) || 0) * rate;

                return (
                  <div className="bmm-quantity-row" key={key}>
                    <div className="bmm-quantity-service">
                      <strong>{getServiceName(item)}</strong>
                      <small>
                        ₹{money(rate)} / {unit}
                      </small>
                    </div>

                    <div className="bmm-quantity-input">
                      <label htmlFor={`quantity-${index}`}>
                        मात्रा ({unit})
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
                      <small>कुल राशि</small>
                      <strong>₹{money(amount)}</strong>
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
          <h2>₹{money(total)}</h2>

          <p>
            {total
              ? numberWords(total) + " रुपये मात्र"
              : "Quantity भरने पर कुल राशि दिखाई देगी।"}
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
              PDF बन रही है...
            </>
          ) : (
            <>
              <FileDown size={19} />
              Estimate PDF डाउनलोड करें
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
              <p>BOREWELL • DRILLING • PIPE SERVICES</p>
            </div>

            <div className="bmm-pdf-label">ESTIMATE</div>
          </div>

          <div className="bmm-pdf-title">
            <h2>ESTIMATE / SERVICE BILL</h2>
            <p>सेवा का अनुमान एवं विवरण</p>
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
                <small>ग्राहक का नाम</small>
                <strong>{customer.name || "—"}</strong>
              </div>

              <div>
                <small>मोबाइल नंबर</small>
                <strong>{customer.mobile || "—"}</strong>
              </div>

              <div className="bmm-pdf-wide">
                <small>पता</small>
                <strong>{customer.address || "—"}</strong>
              </div>

              <div>
                <small>जिला</small>
                <strong>{district || "—"}</strong>
              </div>

              <div>
                <small>ब्लॉक</small>
                <strong>{block || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="bmm-pdf-services">
            <h3>SERVICE & PRICE DETAILS</h3>

            <table>
              <thead>
                <tr>
                  <th>क्र.</th>
                  <th>सर्विस का विवरण</th>
                  <th>मात्रा</th>
                  <th>रेट (₹)</th>
                  <th>राशि (₹)</th>
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
                    <td colSpan="5">अभी कोई Service नहीं चुनी गई।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bmm-pdf-total">
            <span>GRAND TOTAL / कुल राशि</span>
            <strong>₹{money(total)}</strong>
          </div>

          <div className="bmm-pdf-words">
            <small>राशि शब्दों में</small>
            <strong>
              {total ? numberWords(total) + " रुपये मात्र" : "—"}
            </strong>
          </div>

          <div className="bmm-pdf-footer">
            <div>
              <strong>Borewells Mitra</strong>
              <p>आपकी बोरवेल सेवा का विश्वसनीय साथी</p>
            </div>

            <div className="bmm-sign">
              <span>Authorized Signature</span>
              <small>अधिकृत हस्ताक्षर</small>
            </div>
          </div>

          <div className="bmm-pdf-bottom">
            यह केवल अनुमान है, अंतिम बिल नहीं।
          </div>
        </div>
      </div>
    </main>
  );
}
