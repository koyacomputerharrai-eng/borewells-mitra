
import bcrypt from "bcryptjs";

export default function registerReferralRoutes(app, db, authenticateToken, adminOnly) {
  // ==========================================
  // DATABASE TABLES
  // ==========================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS referral_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      district TEXT NOT NULL,
      block TEXT NOT NULL,
      address TEXT NOT NULL,
      password_hash TEXT,
      terms_accepted INTEGER NOT NULL DEFAULT 0,
      terms_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referral_settings (
      id INTEGER PRIMARY KEY CHECK(id=1),
      commission REAL NOT NULL DEFAULT 200,
      terms TEXT NOT NULL DEFAULT 'रेफरल लिंक से प्राप्त बुकिंग पर कमीशन तभी मिलेगा जब काम पूरा हो और ग्राहक का भुगतान Admin द्वारा सत्यापित हो।',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referral_commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      booking_id INTEGER NOT NULL UNIQUE,
      commission_rate REAL NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_note TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(partner_id) REFERENCES users(id),
      FOREIGN KEY(booking_id) REFERENCES bookings(id)
    );
  `);

  // ==========================================
  // SAFE DATABASE MIGRATIONS
  // ==========================================
  function addColumn(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some(item => item.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  addColumn("referral_applications", "password_hash", "TEXT");
  addColumn("referral_applications", "terms_text", "TEXT");

  addColumn("bookings", "payment_verified", "INTEGER NOT NULL DEFAULT 0");
  addColumn("bookings", "payment_verified_at", "TEXT");
  addColumn("bookings", "payment_note", "TEXT");
  addColumn("bookings", "referral_commission_rate", "REAL");

  db.prepare(`
    INSERT OR IGNORE INTO referral_settings(id, commission)
    VALUES(1, 200)
  `).run();

  // नई रेफरल बुकिंग पर उस समय की कमीशन दर सुरक्षित करें।
  // पुरानी बुकिंग की दर अपने आप नहीं बदलेगी।
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS referral_booking_rate_snapshot
    AFTER INSERT ON bookings
    WHEN NEW.referral_partner_id IS NOT NULL
         AND NEW.referral_commission_rate IS NULL
    BEGIN
      UPDATE bookings
      SET referral_commission_rate = (
        SELECT commission FROM referral_settings WHERE id=1
      )
      WHERE id = NEW.id;
    END;
  `);

  const makeReferralCode = id => `REF${String(id).padStart(6, "0")}`;
  const makeReferralUserId = id => `KR${String(id).padStart(5, "0")}`;

  const getSettings = () => db.prepare(`
    SELECT commission, terms FROM referral_settings WHERE id=1
  `).get();

  function getPartnerId(req) {
    return Number(req.user?.id);
  }

  // ==========================================
  // PUBLIC: REFERRAL SETTINGS
  // ==========================================
  app.get("/api/referral/settings", (req, res) => {
    res.json({
      success: true,
      settings: getSettings()
    });
  });

  // ==========================================
  // PUBLIC: APPLY FOR REFERRAL PARTNER
  // ==========================================
  app.post("/api/referral/apply", (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const mobile = String(req.body.mobile || "").trim();
      const district = String(req.body.district || "").trim();
      const block = String(req.body.block || "").trim();
      const address = String(req.body.address || "").trim();
      const password = String(req.body.password || "");
      const confirmPassword = String(req.body.confirmPassword || "");
      const accepted = req.body.termsAccepted === true;

      if (!name || !district || !block || !address) {
        return res.status(400).json({
          success: false,
          message: "सभी जानकारी भरना आवश्यक है।"
        });
      }

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: "सही 10 अंकों का मोबाइल नंबर भरें।"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।"
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "दोनों पासवर्ड एक जैसे नहीं हैं।"
        });
      }

      if (!accepted) {
        return res.status(400).json({
          success: false,
          message: "नियम एवं शर्तें स्वीकार करना आवश्यक है।"
        });
      }

      const existingUser = db.prepare(`
        SELECT id FROM users WHERE mobile=?
      `).get(mobile);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "यह मोबाइल नंबर पहले से सिस्टम में मौजूद है।"
        });
      }

      const existingApplication = db.prepare(`
        SELECT id, status FROM referral_applications WHERE mobile=?
      `).get(mobile);

      if (existingApplication) {
        return res.status(409).json({
          success: false,
          message: "इस मोबाइल नंबर से आवेदन पहले ही भेजा जा चुका है।"
        });
      }

      const settings = getSettings();
      const passwordHash = bcrypt.hashSync(password, 12);

      db.prepare(`
        INSERT INTO referral_applications
        (
          name, mobile, district, block, address,
          password_hash, terms_accepted, terms_text
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        name,
        mobile,
        district,
        block,
        address,
        passwordHash,
        settings.terms
      );

      return res.status(201).json({
        success: true,
        message: "आवेदन सफलतापूर्वक जमा हो गया। Admin की मंजूरी के बाद Referral ID मिलेगी।"
      });
    } catch (error) {
      console.error("Referral apply:", error);
      return res.status(500).json({
        success: false,
        message: "आवेदन जमा नहीं हो सका।"
      });
    }
  });

  // ==========================================
  // ADMIN: APPLICATION LIST
  // ==========================================
  app.get(
    "/api/admin/referral-applications",
    authenticateToken,
    adminOnly,
    (req, res) => {
      const applications = db.prepare(`
        SELECT
          id, name, mobile, district, block, address,
          terms_accepted, terms_text, status, user_id, created_at
        FROM referral_applications
        ORDER BY id DESC
      `).all();

      res.json({ success: true, applications });
    }
  );

  // ==========================================
  // ADMIN: APPROVE / REJECT APPLICATION
  // ==========================================
  app.patch(
    "/api/admin/referral-applications/:id",
    authenticateToken,
    adminOnly,
    (req, res) => {
      try {
        const id = Number(req.params.id);
        const status = String(req.body.status || "");

        if (!["approved", "rejected"].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "गलत Status।"
          });
        }

        const application = db.prepare(`
          SELECT * FROM referral_applications WHERE id=?
        `).get(id);

        if (!application) {
          return res.status(404).json({
            success: false,
            message: "आवेदन नहीं मिला।"
          });
        }

        if (application.status !== "pending") {
          return res.status(409).json({
            success: false,
            message: "इस आवेदन पर पहले ही निर्णय लिया जा चुका है।"
          });
        }

        if (status === "rejected") {
          db.prepare(`
            UPDATE referral_applications
            SET status='rejected'
            WHERE id=?
          `).run(id);

          return res.json({
            success: true,
            message: "आवेदन अस्वीकृत कर दिया गया।"
          });
        }

        if (!application.password_hash) {
          return res.status(400).json({
            success: false,
            message: "आवेदन में Login Password उपलब्ध नहीं है।"
          });
        }

        const createReferralUser = db.transaction(() => {
          const existingUser = db.prepare(`
            SELECT id FROM users WHERE mobile=?
          `).get(application.mobile);

          if (existingUser) {
            throw new Error("इस मोबाइल नंबर का User पहले से मौजूद है।");
          }

          const insert = db.prepare(`
            INSERT INTO users
            (
              name, mobile, password, role, status,
              userId, referral_code, district, block
            )
            VALUES (?, ?, ?, 'referral', 'approved', ?, ?, ?, ?)
          `);

          const result = insert.run(
            application.name,
            application.mobile,
            application.password_hash,
            "TEMP",
            "TEMP",
            application.district,
            application.block
          );

          const userId = Number(result.lastInsertRowid);
          const referralCode = makeReferralCode(userId);
          const loginId = makeReferralUserId(userId);

          db.prepare(`
            UPDATE users
            SET userId=?, referral_code=?
            WHERE id=?
          `).run(loginId, referralCode, userId);

          db.prepare(`
            UPDATE referral_applications
            SET status='approved', user_id=?
            WHERE id=?
          `).run(userId, id);

          return { userId, referralCode, loginId };
        });

        const created = createReferralUser();

        return res.json({
          success: true,
          message: "Referral Partner Approved हो गया।",
          referral: {
            userId: created.userId,
            loginId: created.loginId,
            referralCode: created.referralCode
          }
        });
      } catch (error) {
        console.error("Referral approval:", error);
        return res.status(400).json({
          success: false,
          message: error.message || "आवेदन Approve नहीं हुआ।"
        });
      }
    }
  );

  // ==========================================
  // ADMIN: GET REFERRAL SETTINGS
  // ==========================================
  app.get(
    "/api/admin/referral-settings",
    authenticateToken,
    adminOnly,
    (req, res) => {
      res.json({
        success: true,
        settings: getSettings()
      });
    }
  );

  // ==========================================
  // ADMIN: UPDATE COMMISSION AND TERMS
  // ==========================================
  app.put(
    "/api/admin/referral-settings",
    authenticateToken,
    adminOnly,
    (req, res) => {
      const commission = Number(req.body.commission);
      const terms = String(req.body.terms || "").trim();

      if (!Number.isFinite(commission) || commission < 0 || commission > 100000) {
        return res.status(400).json({
          success: false,
          message: "कमीशन राशि सही भरें।"
        });
      }

      if (!terms) {
        return res.status(400).json({
          success: false,
          message: "नियम एवं शर्तें खाली नहीं हो सकतीं।"
        });
      }

      db.prepare(`
        UPDATE referral_settings
        SET commission=?, terms=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=1
      `).run(commission, terms);

      res.json({
        success: true,
        message: "कमीशन और नियम एवं शर्तें अपडेट हो गईं।"
      });
    }
  );

  // ==========================================
  // ADMIN: VERIFY CUSTOMER PAYMENT
  // ==========================================
  app.patch(
    "/api/admin/bookings/:bookingId/payment",
    authenticateToken,
    adminOnly,
    (req, res) => {
      try {
        const bookingId = Number(req.params.bookingId);
        const verified = req.body.verified === true;
        const note = String(req.body.paymentNote || "").trim();

        const booking = db.prepare(`
          SELECT * FROM bookings WHERE id=?
        `).get(bookingId);

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: "बुकिंग नहीं मिली।"
          });
        }

        if (verified && booking.status !== "पूर्ण") {
          return res.status(400).json({
            success: false,
            message: "भुगतान सत्यापित करने से पहले बुकिंग का काम पूर्ण करें।"
          });
        }

        const existingCommission = db.prepare(`
          SELECT id FROM referral_commissions WHERE booking_id=?
        `).get(bookingId);

        if (!verified && existingCommission) {
          return res.status(409).json({
            success: false,
            message: "इस बुकिंग का कमीशन बन चुका है। भुगतान सत्यापन वापस नहीं लिया जा सकता।"
          });
        }

        db.prepare(`
          UPDATE bookings
          SET payment_verified=?,
              payment_verified_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE NULL END,
              payment_note=?
          WHERE id=?
        `).run(verified ? 1 : 0, verified ? 1 : 0, note, bookingId);

        return res.json({
          success: true,
          message: verified
            ? "ग्राहक का भुगतान सत्यापित हो गया। अब कमीशन बनाया जा सकता है।"
            : "भुगतान सत्यापन हटाया गया।"
        });
      } catch (error) {
        console.error("Payment verification:", error);
        return res.status(500).json({
          success: false,
          message: "भुगतान अपडेट नहीं हुआ।"
        });
      }
    }
  );

  // ==========================================
  // ADMIN: REFERRAL COMMISSION LIST
  // ==========================================
  app.get(
    "/api/admin/referral-commissions",
    authenticateToken,
    adminOnly,
    (req, res) => {
      const commissions = db.prepare(`
        SELECT
          c.*,
          u.name AS partner_name,
          u.referral_code,
          b.name AS customer_name,
          b.mobile AS customer_mobile,
          b.status AS booking_status,
          b.payment_verified
        FROM referral_commissions c
        JOIN users u ON u.id=c.partner_id
        JOIN bookings b ON b.id=c.booking_id
        ORDER BY c.id DESC
      `).all();

      res.json({ success: true, commissions });
    }
  );

  // ==========================================
  // ADMIN: GENERATE COMMISSION
  // ==========================================
  app.post(
    "/api/admin/referral-commissions/generate/:bookingId",
    authenticateToken,
    adminOnly,
    (req, res) => {
      try {
        const bookingId = Number(req.params.bookingId);

        const booking = db.prepare(`
          SELECT * FROM bookings
          WHERE id=? AND referral_partner_id IS NOT NULL
        `).get(bookingId);

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: "रेफरल से जुड़ी बुकिंग नहीं मिली।"
          });
        }

        if (booking.status !== "पूर्ण") {
          return res.status(400).json({
            success: false,
            message: "पहले बुकिंग का काम पूर्ण करें।"
          });
        }

        if (Number(booking.payment_verified) !== 1) {
          return res.status(400).json({
            success: false,
            message: "पहले ग्राहक का भुगतान सत्यापित करें।"
          });
        }

        if (
          booking.referral_commission_rate === null ||
          booking.referral_commission_rate === undefined
        ) {
          return res.status(400).json({
            success: false,
            message: "इस पुरानी बुकिंग की कमीशन दर सुरक्षित नहीं है। Admin को अलग से निर्णय लेना होगा।"
          });
        }

        const existing = db.prepare(`
          SELECT id FROM referral_commissions WHERE booking_id=?
        `).get(bookingId);

        if (existing) {
          return res.status(409).json({
            success: false,
            message: "इस बुकिंग का कमीशन पहले ही बनाया जा चुका है।"
          });
        }

        const amount = Number(booking.referral_commission_rate);

        db.prepare(`
          INSERT INTO referral_commissions
          (partner_id, booking_id, commission_rate, amount, status)
          VALUES (?, ?, ?, ?, 'pending')
        `).run(
          booking.referral_partner_id,
          bookingId,
          amount,
          amount
        );

        return res.json({
          success: true,
          message: `₹${amount} कमीशन लंबित सूची में जोड़ दिया गया।`
        });
      } catch (error) {
        console.error("Commission generate:", error);
        return res.status(500).json({
          success: false,
          message: "कमीशन नहीं बनाया जा सका।"
        });
      }
    }
  );

  // ==========================================
  // ADMIN: MARK COMMISSION AS PAID
  // ==========================================
  app.patch(
    "/api/admin/referral-commissions/:id/pay",
    authenticateToken,
    adminOnly,
    (req, res) => {
      const id = Number(req.params.id);
      const note = String(req.body.paymentNote || "").trim();

      if (!note) {
        return res.status(400).json({
          success: false,
          message: "भुगतान का विवरण लिखें।"
        });
      }

      const result = db.prepare(`
        UPDATE referral_commissions
        SET status='paid',
            payment_note=?,
            paid_at=CURRENT_TIMESTAMP
        WHERE id=? AND status='pending'
      `).run(note, id);

      if (!result.changes) {
        return res.status(404).json({
          success: false,
          message: "लंबित कमीशन नहीं मिला।"
        });
      }

      res.json({
        success: true,
        message: "कमीशन भुगतान दर्ज हो गया।"
      });
    }
  );

  // ==========================================
  // REFERRAL PARTNER DASHBOARD
  // ==========================================
  app.get(
    "/api/referral/dashboard",
    authenticateToken,
    (req, res) => {
      try {
        const partner = db.prepare(`
          SELECT id, name, mobile, userId, referral_code, status
          FROM users
          WHERE id=? AND role='referral'
        `).get(getPartnerId(req));

        if (!partner || partner.status !== "approved") {
          return res.status(403).json({
            success: false,
            message: "Approved Referral Partner Login आवश्यक है।"
          });
        }

        const totals = db.prepare(`
          SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) AS pending,
            COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid
          FROM referral_commissions
          WHERE partner_id=?
        `).get(partner.id);

        const bookings = db.prepare(`
          SELECT id, name, district, block, service, status, created_at,
                 payment_verified
          FROM bookings
          WHERE referral_partner_id=?
          ORDER BY id DESC
        `).all(partner.id).map(item => ({
          ...item,
          bookingCode: `KB${String(item.id).padStart(6, "0")}`
        }));

        const commissions = db.prepare(`
          SELECT id, booking_id, commission_rate, amount, status,
                 paid_at, created_at, payment_note
          FROM referral_commissions
          WHERE partner_id=?
          ORDER BY id DESC
        `).all(partner.id);

        res.json({
          success: true,
          partner: {
            ...partner,
            referralLink: `/?referralCode=${encodeURIComponent(partner.referral_code)}`
          },
          totals,
          bookings,
          commissions
        });
      } catch (error) {
        console.error("Referral dashboard:", error);
        res.status(500).json({
          success: false,
          message: "Dashboard लोड नहीं हो सका।"
        });
      }
    }
  );
}
