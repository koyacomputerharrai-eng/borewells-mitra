import React from "react";
import "./Home.css";
function Home({ go }) {
  const services = [
    {
      number: "01",
      title: "नया बोरवेल",
      desc: "नई बोरवेल ड्रिलिंग के लिए ऑनलाइन बुकिंग करें।",
      image:
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
      page: "booking"
    },
    {
      number: "02",
      title: "बोरवेल रिपेयरिंग",
      desc: "पुराने बोरवेल की मरम्मत के लिए बुकिंग करें।",
      image:
        "https://images.unsplash.com/photo-1516937941344-00b4e0337589?auto=format&fit=crop&w=900&q=85",
      page: "booking"
    }
  ];

  const quickLinks = [
    {
      title: "रेट लिस्ट देखें",
      desc: "जिला और ब्लॉक के अनुसार रेट",
      page: "rates"
    },
    {
      title: "कैलकुलेटर का उपयोग करें",
      desc: "बोरवेल कार्य का अनुमान बनाएँ",
      page: "calculator"
    },
    {
      title: "बुकिंग स्टेटस चेक करें",
      desc: "अपनी बुकिंग की स्थिति देखें",
      page: "booking-status"
    }
  ];

  const steps = [
    ["01", "अकाउंट बनाएँ", "ग्राहक के रूप में रजिस्ट्रेशन करें।"],
    ["02", "बुकिंग करें", "अपनी सेवा और पता दर्ज करें।"],
    ["03", "एडमिन की समीक्षा", "एडमिन आपकी बुकिंग की समीक्षा करेगा।"],
    ["04", "बुकिंग अपडेट", "अपनी बुकिंग का स्टेटस देखें।"]
  ];

  return (
    <main className="bm-home">

      {/* HERO SECTION */}
      <section className="bm-hero">
        <div className="bm-container bm-hero-inner">

          <div className="bm-hero-content">
            <span className="bm-tag">BOREWELLS MITRA</span>

            <h1>Borewells Mitra</h1>

            <h2>
              आपके बोरवेल का काम,
              <br />
              अब आसान और भरोसेमंद।
            </h2>

            <div className="bm-gold-line"></div>

            <p>
              नया बोरवेल, ड्रिलिंग और रिपेयरिंग सेवाओं के लिए
              एक ही प्लेटफॉर्म पर बुकिंग, रेट लिस्ट,
              कैलकुलेटर और बुकिंग ट्रैकिंग की सुविधा।
            </p>

            <div className="bm-hero-buttons">
              <button
                className="bm-btn bm-btn-gold"
                onClick={() => go("booking")}
              >
                बोरवेल बुक करें <span>→</span>
              </button>

              <button
                className="bm-btn bm-btn-outline"
                onClick={() => go("rates")}
              >
                रेट लिस्ट देखें <span>→</span>
              </button>
            </div>
          </div>

          <div className="bm-hero-visual">
            <div className="bm-hero-image"></div>
            <div className="bm-hero-image-label">
              <span>BOREWELLS MITRA</span>
              <strong>विश्वसनीय बोरवेल सेवा प्लेटफॉर्म</strong>
            </div>
          </div>

        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bm-trust-strip">
        <div className="bm-container bm-trust-inner">
          <div>
            <strong>ऑनलाइन बुकिंग</strong>
            <span>आसान बुकिंग सुविधा</span>
          </div>

          <div>
            <strong>रेट की जानकारी</strong>
            <span>क्षेत्र के अनुसार रेट</span>
          </div>

          <div>
            <strong>बुकिंग ट्रैकिंग</strong>
            <span>बुकिंग की स्थिति देखें</span>
          </div>
        </div>
      </section>

      {/* MAIN SERVICES */}
      <section className="bm-section bm-container">
        <div className="bm-section-heading">
          <span>OUR SERVICES</span>
          <h2>हमारी मुख्य सेवाएँ</h2>
          <p>अपनी आवश्यकता के अनुसार बोरवेल सेवा चुनें।</p>
        </div>

        <div className="bm-main-services">
          {services.map((item) => (
            <article className="bm-main-service-card" key={item.number}>
              <div className="bm-service-image">
                <img src={item.image} alt={item.title} />
              </div>

              <div className="bm-service-info">
                <span className="bm-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>

                <button
                  className="bm-btn bm-btn-gold bm-small-btn"
                  onClick={() => go(item.page)}
                >
                  अभी बुक करें <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="bm-container bm-quick-section">
        <div className="bm-quick-intro">
          <h2>त्वरित पहुँच</h2>
          <p>जरूरी सेवाओं तक तुरंत पहुँचें।</p>
        </div>

        {quickLinks.map((item, index) => (
          <button
            className="bm-quick-link"
            key={item.page}
            onClick={() => go(item.page)}
          >
            <span className="bm-quick-number">0{index + 1}</span>
            <strong>{item.title}</strong>
            <small>{item.desc}</small>
            <span className="bm-quick-arrow">→</span>
          </button>
        ))}
      </section>

      {/* AGENT CONTACT */}
      <section className="bm-container bm-agent-section">
        <div className="bm-agent-banner">
          <div>
            <span className="bm-agent-label">AGENT CONTACT</span>
            <h2>अपने क्षेत्र का एजेंट खोजें</h2>
            <p>
              जिला और ब्लॉक चुनकर अपने क्षेत्र के उपलब्ध
              एजेंटों की जानकारी प्राप्त करें।
            </p>
          </div>

          <button
            className="bm-btn bm-btn-gold"
            onClick={() => go("agent-contact")}
          >
            एजेंट खोजें <span>→</span>
          </button>
        </div>
      </section>

      {/* BOOKING PROCESS */}
      <section className="bm-process-section">
        <div className="bm-container">
          <div className="bm-section-heading">
            <span>HOW IT WORKS</span>
            <h2>बुकिंग की प्रक्रिया</h2>
            <p>चार आसान चरणों में अपनी बुकिंग पूरी करें।</p>
          </div>

          <div className="bm-steps">
            {steps.map((step) => (
              <article className="bm-step" key={step[0]}>
                <span className="bm-step-number">{step[0]}</span>
                <h3>{step[1]}</h3>
                <p>{step[2]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bm-final-cta">
        <div className="bm-container bm-final-inner">
          <div>
            <span>BOREWELLS MITRA</span>
            <h2>पानी की जरूरत, सही नेटवर्क के साथ।</h2>
            <p>
              आज ही Borewells Mitra पर अपनी बुकिंग दर्ज करें।
            </p>
          </div>

          <button
            className="bm-btn bm-btn-gold"
            onClick={() => go("booking")}
          >
            अभी बुकिंग करें <span>→</span>
          </button>
        </div>
      </section>

    </main>
  );
}

export default Home;
