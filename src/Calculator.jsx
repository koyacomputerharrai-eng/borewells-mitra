
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Calculator as CalculatorIcon,
  UserRound,
  MapPin,
  Drill,
  Plus,
  Trash2,
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

const getName = (item) =>
  typeof item === "string"
    ? item
    : item?.name || item?.title || item?.district || item?.block || "";

const getDistrictList = () =>
  Array.isArray(DISTRICTS) ? DISTRICTS.map(getName).filter(Boolean) : [];

function getBlockList(district) {
  if (!district || !BLOCKS) return [];

  if (Array.isArray(BLOCKS)) {
    return BLOCKS.filter((item) =>
      typeof item === "string"
        ? true
        : item.district === district ||
          item.districtName === district ||
          item.parent === district
    ).map(getName).filter(Boolean);
  }

  if (typeof BLOCKS === "object") {
    return (BLOCKS[district] || []).map(getName).filter(Boolean);
  }

  return [];
}

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const today = () => new Date().toISOString().slice(0, 10);

const numberWords = (number) => {
  const n = Math.floor(Number(number) || 0);
  if (n === 0) return "शून्य";

  const a = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह",
    "सत्रह", "अठारह", "उन्नीस",
  ];
  const b = [
    "", "", "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस",
    "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस", "इकतीस",
    "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस",
    "अड़तीस", "उनतालीस", "चालीस", "इकतालीस", "बयालीस", "तैंतालीस",
    "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस",
    "उनचास", "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन",
    "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ",
    "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ",
    "सड़सठ", "अड़सठ", "उनहत्तर", "सत्तर", "इकहत्तर", "बहत्तर",
    "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर",
    "अठहत्तर", "उन्यासी", "अस्सी", "इक्यासी", "बयासी",
    "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी",
    "अट्ठासी", "नवासी", "नब्बे", "इक्यानवे", "बानवे",
    "तिरानवे", "चौरानवे", "पचानवे", "छियानवे", "सत्तानवे",
    "अट्ठानवे", "निन्यानवे",
  ];

  const two = (x) => b[x] || a[x] || "";
  const convert = (x) => {
    if (x < 100) return two(x);
    if (x < 1000)
      return a[Math.floor(x / 100)] + " सौ " + convert(x % 100);
    if (x < 100000)
      return convert(Math.floor(x / 1000)) + " हजार " + convert(x % 1000);
    if (x < 10000000)
      return convert(Math.floor(x / 100000)) + " लाख " + convert(x % 100000);
    return convert(Math.floor(x / 10000000)) + " करोड़ " + convert(x % 10000000);
  };

  return convert(n).replace(/\s+/g, " ").trim();
};

export default function Calculator() {
  const pdfRef = useRef(null);

  const districts = useMemo(getDistrictList, []);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");

  const blocks = useMemo(() => getBlockList(district), [district]);

  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  const [billDate, setBillDate] = useState(today);
  const [billNo] = useState(
    () => "BMM-" + Date.now().toString().slice(-8)
  );

  const [services, setServices] = useState([]);
  const [service, setService] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("Unit");
  const [items, setItems] = useState([]);

  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  const showNotice = (text, type = "error") =>
    setNotice({ text, type });

  // Services API
  async function loadServices() {
    setLoadingServices(true);
    try {
      const response = await fetch(`${API}/services`);
      if (!response.ok) throw new Error("Services API उपलब्ध नहीं है");

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.services || [];

      setServices(
        list
          .filter((item) => item.active !== false)
          .map((item, index) => ({
            id: item.id || index,
            name: item.name || item.service_name || item.service || "",
            unit: item.unit || "Unit",
          }))
          .filter((item) => item.name)
      );
    } catch (error) {
      console.error(error);
      setServices([
        { id: 1, name: "Drilling", unit: "Feet" },
        { id: 2, name: "Repairing", unit: "Work" },
        { id: 3, name: "Casing Pipe", unit: "Feet" },
        { id: 4, name: "MS Pipe", unit: "Feet" },
        { id: 5, name: "Other Services", unit: "Unit" },
      ]);
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  // Selected service details
  const selectedService = services.find((item) => item.name === service);

  useEffect(() => {
    if (!service) {
      setRate("");
      setUnit("Unit");
      return;
    }

    setUnit(selectedService?.unit || "Unit");

    if (!district || !block) return;

    let cancelled = false;

    async function loadRate() {
      setLoadingRate(true);
      try {
        const url = new URL(`${API}/rates`);
        url.searchParams.set("district", district);
        url.searchParams.set("block", block);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Rate API error");

        const data = await response.json();
        const list = Array.isArray(data) ? data : data.rates || [];

        const found = list.find(
          (item) =>
            (item.service_name || item.name || item.service) === service
        );

        if (!cancelled && found) {
          setRate(String(found.rate ?? found.price ?? ""));
          setUnit(found.unit || selectedService?.unit || "Unit");
        } else if (!cancelled) {
          setRate("");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setRate("");
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    }

    loadRate();
    return () => {
      cancelled = true;
    };
  }, [district, block, service, selectedService?.unit]);

  function addItem() {
    setNotice({ type: "", text: "" });

    if (!service) return showNotice("पहले सर्विस चुनें।");
    if (!district || !block)
      return showNotice("पहले जिला और ब्लॉक चुनें।");
    if (quantity === "" || Number(quantity) <= 0)
      return showNotice("सही मात्रा दर्ज करें।");
    if (rate === "" || Number(rate) < 0)
      return showNotice("रेट दर्ज करें।");
    if (items.length >= 10)
      return showNotice("एक कैलकुलेशन में अधिकतम 10 सर्विस जोड़ सकते हैं।");

    setItems((old) => [
      ...old,
      {
        id: Date.now() + Math.random(),
        service,
        quantity: Number(quantity),
        rate: Number(rate),
        unit,
      },
    ]);

    setService("");
    setQuantity("1");
    setRate("");
    showNotice("सर्विस सफलतापूर्वक जोड़ दी गई।", "success");
  }

  function removeItem(id) {
    setItems((old) => old.filter((item) => item.id !== id));
  }

  function resetCalculator() {
    setCustomer({ name: "", mobile: "", address: "" });
    setDistrict("");
    setBlock("");
    setService("");
    setQuantity("1");
    setRate("");
    setUnit("Unit");
    setItems([]);
    setBillDate(today());
    setNotice({ type: "success", text: "कैलकुलेटर रीसेट हो गया।" });
  }

  async function downloadPDF() {
    if (!customer.name.trim())
      return showNotice("ग्राहक का नाम दर्ज करें।");
    if (!customer.mobile.trim())
      return showNotice("ग्राहक का मोबाइल नंबर दर्ज करें।");
    if (!district || !block)
      return showNotice("जिला और ब्लॉक चुनें।");
    if (!items.length)
      return showNotice("कम से कम एक सर्विस जोड़ें।");

    const element = pdfRef.current;
    if (!element) return showNotice("PDF कंटेंट नहीं मिला।");

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
      const finalHeight = Math.min(imageHeight, pageHeight);

      pdf.addImage(image, "JPEG", 0, 0, pageWidth, finalHeight);
      pdf.save(`${billNo}.pdf`);

      showNotice("आपकी Premium PDF डाउनलोड हो गई।", "success");
    } catch (error) {
      console.error(error);
      showNotice("PDF बनाने में समस्या आई। दोबारा प्रयास करें।");
    } finally {
      setDownloading(false);
    }
  }

  const dateText = new Date(`${billDate}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" }
  );

  return (
    <main className="bmm-premium">
      <header className="bmm-topbar">
        <div className="bmm-brand">
          <div className="bmm-brand-icon"><Drill size={25} /></div>
          <div>
            <h1>Borewell Mitra <span>MP</span></h1>
            <p>Professional Estimate Calculator</p>
          </div>
        </div>
        <div className="bmm-live"><span /> CALCULATOR</div>
      </header>

      <section className="bmm-hero">
        <div>
          <div className="bmm-eyebrow">BOREWELL SERVICES • MADHYA PRADESH</div>
          <h2>Estimate <span>Calculator</span></h2>
          <p>अपनी सर्विस का अनुमान तैयार करें और Premium PDF डाउनलोड करें।</p>
        </div>
        <div className="bmm-hero-icon"><CalculatorIcon size={46} /></div>
      </section>

      <section className="bmm-stat-grid">
        <div className="bmm-stat-card">
          <div className="bmm-stat-icon blue"><ReceiptText /></div>
          <div><small>ESTIMATE NUMBER</small><strong>{billNo}</strong></div>
        </div>
        <div className="bmm-stat-card">
          <div className="bmm-stat-icon green"><IndianRupee /></div>
          <div><small>GRAND TOTAL</small><strong>₹{money(total)}</strong></div>
        </div>
        <div className="bmm-stat-card">
          <div className="bmm-stat-icon purple"><Drill /></div>
          <div><small>TOTAL SERVICES</small><strong>{items.length} / 10</strong></div>
        </div>
      </section>

      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon"><UserRound /></div>
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
                setCustomer({ ...customer, name: e.target.value })
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
                setCustomer({ ...customer, address: e.target.value })
              }
            />
          </label>
        </div>
      </section>

      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon"><MapPin /></div>
          <div>
            <h3>Location Details</h3>
            <p>रेट के लिए अपना क्षेत्र चुनें</p>
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
                setItems([]);
              }}
            >
              <option value="">जिला चुनें</option>
              {districts.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>ब्लॉक / तहसील <i>*</i></span>
            <select
              value={block}
              disabled={!district}
              onChange={(e) => {
                setBlock(e.target.value);
                setItems([]);
              }}
            >
              <option value="">ब्लॉक चुनें</option>
              {blocks.map((name) => (
                <option key={name} value={name}>{name}</option>
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

      <section className="bmm-panel">
        <div className="bmm-panel-heading">
          <div className="bmm-heading-icon"><Drill /></div>
          <div>
            <h3>Add Services</h3>
            <p>सर्विस, मात्रा और रेट दर्ज करें</p>
          </div>
          <span className="bmm-step">03</span>
        </div>

        <div className="bmm-service-entry">
          <label className="bmm-field">
            <span>सर्विस चुनें</span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">
                {loadingServices ? "लोड हो रहा है..." : "सर्विस चुनें"}
              </option>
              {services.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="bmm-field">
            <span>मात्रा</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>

          <label className="bmm-field">
            <span>रेट (₹) {loadingRate && <LoaderCircle className="bmm-spin" size={13} />}</span>
            <input
              type="number"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="रेट"
            />
          </label>

          <button className="bmm-add-btn" onClick={addItem}>
            <Plus size={18} /> जोड़ें
          </button>
        </div>

        {notice.text && (
          <div className={`bmm-notice ${notice.type}`}>
            {notice.type === "success" && <CheckCircle2 size={17} />}
            {notice.text}
          </div>
        )}

        <div className="bmm-table-wrap">
          <table className="bmm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>सर्विस का नाम</th>
                <th>मात्रा</th>
                <th>रेट</th>
                <th>कुल राशि</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="bmm-empty">
                    <ReceiptText size={30} />
                    <strong>अभी कोई सर्विस नहीं जोड़ी गई</strong>
                    <small>ऊपर से सर्विस चुनकर जोड़ें।</small>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{String(index + 1).padStart(2, "0")}</td>
                    <td><strong>{item.service}</strong></td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>₹{money(item.rate)}</td>
                    <td className="bmm-amount">₹{money(item.quantity * item.rate)}</td>
                    <td>
                      <button
                        className="bmm-remove"
                        title="हटाएँ"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bmm-summary">
        <div>
          <small>ESTIMATED TOTAL</small>
          <h2>₹{money(total)}</h2>
          <p>{total ? numberWords(total) + " रुपये मात्र" : "सर्विस जोड़ने पर कुल राशि दिखेगी।"}</p>
        </div>
        <div className="bmm-summary-mark"><IndianRupee size={35} /></div>
      </section>

      <div className="bmm-actions">
        <button className="bmm-reset-btn" onClick={resetCalculator}>
          <RefreshCw size={17} /> Reset
        </button>
        <button
          className="bmm-pdf-btn"
          onClick={downloadPDF}
          disabled={downloading}
        >
          {downloading
            ? <><LoaderCircle className="bmm-spin" size={18} /> PDF बन रही है...</>
            : <><FileDown size={19} /> Premium PDF डाउनलोड करें</>}
        </button>
      </div>

      {/* PDF CONTENT */}
      <div className="bmm-pdf-area">
        <div className="bmm-pdf-document" ref={pdfRef}>
          <div className="bmm-pdf-header">
            <div className="bmm-pdf-logo"><Drill size={30} /></div>
            <div>
              <h1>BOREWELL MITRA <span>MP</span></h1>
              <p>BOREWELL • DRILLING • REPAIRING • PIPE SERVICES</p>
            </div>
            <div className="bmm-pdf-label">ESTIMATE</div>
          </div>

          <div className="bmm-pdf-title">
            <h2>ESTIMATE / SERVICE BILL</h2>
            <p>सेवा का अनुमान एवं विवरण</p>
          </div>

          <div className="bmm-pdf-meta">
            <div><small>Estimate No.</small><strong>{billNo}</strong></div>
            <div><small>Date</small><strong>{dateText}</strong></div>
          </div>

          <div className="bmm-pdf-customer">
            <h3>CUSTOMER INFORMATION</h3>
            <div className="bmm-pdf-info-grid">
              <div><small>ग्राहक का नाम</small><strong>{customer.name || "—"}</strong></div>
              <div><small>मोबाइल नंबर</small><strong>{customer.mobile || "—"}</strong></div>
              <div className="bmm-pdf-wide"><small>पता</small><strong>{customer.address || "—"}</strong></div>
              <div><small>जिला</small><strong>{district || "—"}</strong></div>
              <div><small>ब्लॉक / तहसील</small><strong>{block || "—"}</strong></div>
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
                {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td>&nbsp;</td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bmm-pdf-total">
            <span>GRAND TOTAL / कुल राशि</span>
            <strong>₹{money(total)}</strong>
          </div>

          <div className="bmm-pdf-words">
            <small>राशि शब्दों में</small>
            <strong>{total ? numberWords(total) + " रुपये मात्र" : "—"}</strong>
          </div>

          <div className="bmm-pdf-footer">
            <div>
              <strong>Borewell Mitra MP</strong>
              <p>आपकी बोरवेल सेवा का विश्वसनीय साथी</p>
            </div>
            <div className="bmm-sign">
              <span>Authorized Signature</span>
              <small>अधिकृत हस्ताक्षर</small>
            </div>
          </div>
          <div className="bmm-pdf-bottom">
            This is a computer-generated estimate.
          </div>
        </div>
      </div>
    </main>
  );
}
