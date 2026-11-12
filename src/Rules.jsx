
import React, { useState } from "react";

const ruleCategories = [
  {
    title: "1. बोरिंग / खुदाई के नियम",
    rules: [
      "बोरिंग शुरू करने से पहले ग्राहक के पास जमीन के मालिक की अनुमति होना जरूरी है।",
      "बोरिंग स्थल तक मशीन और वाहन पहुंचने के लिए पर्याप्त रास्ता होना चाहिए।",
      "ग्राहक को बोरिंग स्थल पर बिजली, पानी, पाइपलाइन और भूमिगत केबल की जानकारी पहले देनी होगी।",
      "बोरिंग कार्य से संबंधित लागू सरकारी अनुमति और भूजल संबंधी नियमों का पालन करना अनिवार्य होगा।",
      "बोरिंग की गहराई और लागत जमीन की स्थिति तथा स्थानीय परिस्थितियों पर निर्भर करेगी।",
      "काम शुरू होने से पहले ग्राहक और सेवा प्रदाता के बीच रेट, गहराई और भुगतान की शर्तें तय होनी चाहिए।",
      "कार्यस्थल पर सुरक्षा नियमों का पालन करना ग्राहक और सेवा प्रदाता दोनों की जिम्मेदारी होगी।",
      "बिना आवश्यक अनुमति या प्रतिबंधित क्षेत्र में बोरिंग नहीं की जानी चाहिए।"
    ]
  },
  {
    title: "2. ग्राहकों के नियम",
    rules: [
      "ग्राहक को रजिस्ट्रेशन के समय सही नाम, मोबाइल नंबर और पता देना होगा।",
      "बुकिंग करते समय सही जिला, ब्लॉक और कार्यस्थल का पता देना अनिवार्य है।",
      "बुकिंग दर्ज होने के बाद Admin द्वारा एजेंट नियुक्त किया जाएगा।",
      "ग्राहक को एजेंट के साथ काम की जानकारी और आवश्यक सहयोग देना होगा।",
      "गलत जानकारी देने या गलत मोबाइल नंबर देने की जिम्मेदारी ग्राहक की होगी।"
    ]
  },
  {
    title: "3. एजेंटों के नियम",
    rules: [
      "एजेंट को अपनी सही व्यक्तिगत और एजेंसी संबंधी जानकारी देनी होगी।",
      "एजेंट को नई नियुक्त बुकिंग 24 घंटे के अंदर स्वीकार करनी होगी।",
      "24 घंटे में बुकिंग स्वीकार नहीं करने पर बुकिंग Admin के पास वापस जा सकती है।",
      "एजेंट को ग्राहक से शालीनता और जिम्मेदारी से बात करनी होगी।",
      "एजेंट को ग्राहक को गलत रेट या गलत जानकारी नहीं देनी चाहिए।",
      "एजेंट की प्रोफाइल को Admin द्वारा स्वीकृति मिलने के बाद ही सार्वजनिक किया जाएगा।"
    ]
  },
  {
    title: "4. बुकिंग एवं भुगतान नियम",
    rules: [
      "वेबसाइट पर बुकिंग दर्ज होने का अर्थ सेवा की अंतिम पुष्टि नहीं है।",
      "बुकिंग के बाद Admin द्वारा संबंधित एजेंट नियुक्त किया जाएगा।",
      "सेवा शुरू होने से पहले ग्राहक और सेवा प्रदाता रेट एवं भुगतान की शर्तें तय करेंगे।",
      "अतिरिक्त कार्य या खर्च होने पर उसकी जानकारी ग्राहक को पहले दी जानी चाहिए।",
      "भुगतान संबंधी विवाद में संबंधित पक्षों को उपलब्ध बिल और प्रमाण सुरक्षित रखने चाहिए।"
    ]
  },
  {
    title: "5. रेफरल एवं कमीशन नियम",
    rules: [
      "प्रत्येक पात्र ग्राहक और एजेंट को अपना अलग रेफरल लिंक मिल सकता है।",
      "रेफरल से जुड़े लाभ और कमीशन की पात्रता Admin द्वारा निर्धारित नियमों पर निर्भर होगी।",
      "कमीशन का भुगतान निर्धारित शर्तें पूरी होने के बाद ही किया जाएगा।",
      "फर्जी रजिस्ट्रेशन या गलत रेफरल गतिविधि पाए जाने पर लाभ रोका जा सकता है।"
    ]
  }
];

export default function Rules() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fb",
      padding: "30px 15px",
      color: "#1e293b"
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto"
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "28px"
        }}>
          <h1 style={{
            fontSize: "30px",
            marginBottom: "10px",
            color: "#12345a"
          }}>
            नियम एवं शर्तें
          </h1>

          <p style={{
            color: "#64748b",
            fontSize: "15px",
            lineHeight: 1.7
          }}>
            Borewells Mitra का उपयोग करने से पहले कृपया
            नीचे दिए गए नियमों को पढ़ें।
          </p>
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {ruleCategories.map((category, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                style={{
                  background: "#fff",
                  border: isOpen
                    ? "1px solid #2563eb"
                    : "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.04)"
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenIndex(isOpen ? null : index)
                  }
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    padding: "19px 20px",
                    background: isOpen ? "#eff6ff" : "#fff",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "#12345a",
                    fontSize: "17px",
                    fontWeight: "700",
                    gap: "12px"
                  }}
                >
                  <span>{category.title}</span>

                  <span style={{
                    fontSize: "22px",
                    color: "#2563eb",
                    flexShrink: 0
                  }}>
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: "8px 20px 20px",
                    borderTop: "1px solid #e2e8f0"
                  }}>
                    {category.rules.map((rule, ruleIndex) => (
                      <div
                        key={ruleIndex}
                        style={{
                          display: "flex",
                          gap: "12px",
                          padding: "12px 0",
                          borderBottom:
                            ruleIndex !== category.rules.length - 1
                              ? "1px solid #f1f5f9"
                              : "none",
                          lineHeight: 1.7,
                          fontSize: "15px",
                          color: "#475569"
                        }}
                      >
                        <span style={{
                          color: "#2563eb",
                          fontWeight: "700",
                          flexShrink: 0
                        }}>
                          {ruleIndex + 1}.
                        </span>

                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: "25px",
          padding: "16px",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          color: "#64748b",
          fontSize: "13px",
          lineHeight: 1.7
        }}>
          <strong style={{ color: "#12345a" }}>
            महत्वपूर्ण सूचना:
          </strong>
          <br />
          ये प्रारंभिक नियम हैं। बोरिंग कार्य से संबंधित
          लागू सरकारी नियमों और अनुमतियों का पालन अनिवार्य है।
          नियमों में बदलाव होने पर नवीनतम प्रकाशित नियम लागू होंगे।
        </div>
      </div>
    </div>
  );
}
