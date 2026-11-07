import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import registerReferralRoutes from "./referral.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_BMM_SECRET_BEFORE_PRODUCTION";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// --------------------------------------------------
// DATABASE - पुराने Database को ही इस्तेमाल करेगा
// --------------------------------------------------

const dbPath = join(__dirname, "borewell-mitra.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("Database path:", dbPath);

// --------------------------------------------------
// DATABASE TABLES
// --------------------------------------------------

db.exec(`
  
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  district TEXT NOT NULL,
  block TEXT NOT NULL,
  village TEXT,
  service TEXT NOT NULL,
  status TEXT DEFAULT 'नई बुकिंग',
  assigned_agent_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district TEXT NOT NULL,
  block TEXT NOT NULL,
  service TEXT NOT NULL,
  rate REAL NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(district, block, service)
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  unit TEXT DEFAULT 'प्रति फुट',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  district TEXT NOT NULL,
  block TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  rate REAL NOT NULL,
  unit TEXT DEFAULT 'प्रति फुट',
  status TEXT DEFAULT 'pending',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, service_id)
);

CREATE TABLE IF NOT EXISTS agent_rate_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  old_rate REAL,
  requested_rate REAL NOT NULL,
  unit TEXT DEFAULT 'प्रति फुट',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_assignment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  previous_agent_id INTEGER,
  new_agent_id INTEGER,
  action TEXT NOT NULL,
  actor_user_id INTEGER,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
// --------------------------------------------------
// AGENT PROFILE UPDATE REQUESTS
// एजेंट के बदलाव Admin Approval के बाद ही लागू होंगे
// --------------------------------------------------

db.exec(`
CREATE TABLE IF NOT EXISTS agent_profile_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,

  old_name TEXT,
  new_name TEXT,

  old_mobile TEXT,
  new_mobile TEXT,

  old_agency_name TEXT,
  new_agency_name TEXT,

  old_office_address TEXT,
  new_office_address TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,

  FOREIGN KEY (agent_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_profile_requests_status
ON agent_profile_requests(status);

CREATE INDEX IF NOT EXISTS idx_agent_profile_requests_agent
ON agent_profile_requests(agent_id);
`);
// --------------------------------------------------
// SAFE DATABASE MIGRATION
// पुराने कॉलम और डेटा को हटाया नहीं जाएगा
// --------------------------------------------------

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Migration added: ${table}.${column}`);
  }
}

const migrations = [
  ["users", "userId", "TEXT"],
  ["users", "referral_code", "TEXT"],
  ["users", "referred_by", "INTEGER"],
  ["users", "district", "TEXT"],
  ["users", "block", "TEXT"],
  ["users", "agency_name", "TEXT"],
  ["users", "office_address", "TEXT"],
  ["users", "referred_agent_id", "INTEGER"],
  ["users", "is_active", "INTEGER DEFAULT 1"],
  ["users", "deleted_at", "TEXT"],

  ["bookings", "customer_user_id", "INTEGER"],
  ["bookings", "rate_at_booking", "REAL"],
  ["bookings", "rate_unit", "TEXT"],
  ["bookings", "assigned_at", "TEXT"],
  ["bookings", "assignment_due_at", "TEXT"],
  ["bookings", "returned_at", "TEXT"],
  ["bookings", "assignment_mode", "TEXT"],
  ["bookings", "assignment_count", "INTEGER DEFAULT 0"],
  ["bookings", "tehsil", "TEXT"],
  ["bookings", "address", "TEXT"],
  ["bookings", "referral_partner_id", "INTEGER"],
  ["bookings", "referring_agent_id", "INTEGER"],
  ["bookings", "referral_code_at_booking", "TEXT"],
  ["bookings", "referral_name_at_booking", "TEXT"],

  ["bookings", "payment_verified", "INTEGER DEFAULT 0"],
  ["bookings", "payment_verified_at", "TEXT"],
  ["bookings", "payment_note", "TEXT"],
  ["bookings", "referral_commission_rate", "REAL"]
];

for (const [table, column, definition] of migrations) {
  addColumnIfMissing(table, column, definition);
}

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_userid
ON users(userId) WHERE userId IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code
ON users(referral_code) WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_referred_by
ON users(referred_by);

CREATE INDEX IF NOT EXISTS idx_users_referred_agent
ON users(referred_agent_id);

CREATE INDEX IF NOT EXISTS idx_bookings_agent
ON bookings(assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_bookings_due
ON bookings(assignment_due_at);

CREATE INDEX IF NOT EXISTS idx_booking_history_booking
ON booking_assignment_history(booking_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read
ON admin_notifications(is_read);
`);

// पुराने Users के लिए User ID बनाना
const usersWithoutId = db.prepare(`
  SELECT id, role FROM users
  WHERE userId IS NULL OR userId = ''
`).all();

const updateUserId = db.prepare(`
  UPDATE users SET userId = ? WHERE id = ?
`);

for (const user of usersWithoutId) {
  let userId = "";

  if (user.role === "admin") {
    userId = "ADMIN";
  } else if (user.role === "agent") {
    userId = `KA${String(user.id).padStart(5, "0")}`;
  } else if (user.role === "referral") {
    userId = `KR${String(user.id).padStart(5, "0")}`;
  } else {
    userId = `KC${String(user.id).padStart(5, "0")}`;
  }

  const duplicate = db.prepare(
    "SELECT id FROM users WHERE userId = ?"
  ).get(userId);

  if (!duplicate) {
    updateUserId.run(userId, user.id);
  }
}

// Default services - पहले से मौजूद सेवाएँ नहीं हटेंगी
const defaultServices = [
  ["Drilling", "प्रति फुट"],
  ["Repairing", "प्रति कार्य"],
  ["Casing Pipe", "प्रति फुट"],
  ["MS Pipe", "प्रति फुट"],
  ["Other Services", "प्रति कार्य"]
];

const insertService = db.prepare(`
  INSERT OR IGNORE INTO services (name, unit)
  VALUES (?, ?)
`);

for (const service of defaultServices) {
  insertService.run(...service);
}

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function makeAgentId(id) {
  return `KA${String(id).padStart(5, "0")}`;
}

function makeCustomerId(id) {
  return `KC${String(id).padStart(5, "0")}`;
}

function makeBookingId(id) {
  return `KB${String(id).padStart(6, "0")}`;
}

function makeReferralCode(id) {
  return `REF${String(id).padStart(6, "0")}`;
}

function sendError(res, error, status = 500) {
  console.error(error);
  return res.status(status).json({
    success: false,
    message: error.message || "Server error"
  });
}

function getCurrentUser(id) {
  return db.prepare(`
    SELECT
      id,
      name,
      mobile,
      role,
      status,
      userId,
      district,
      block,
      agency_name,
      office_address,
      referral_code
    FROM users
    WHERE id = ?
  `).get(id);
}

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.substring(7)
    : "";

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Login आवश्यक है"
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Login session समाप्त हो गया है"
    });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "केवल Admin यह कार्य कर सकता है"
    });
  }
  next();
}

function agentOnly(req, res, next) {
  if (req.user?.role !== "agent") {
    return res.status(403).json({
      success: false,
      message: "केवल Agent यह कार्य कर सकता है"
    });
  }
  next();
}

function makeNotification(type, title, message, bookingId = null) {
  db.prepare(`
    INSERT INTO admin_notifications
    (type, title, message, booking_id)
    VALUES (?, ?, ?, ?)
  `).run(type, title, message, bookingId);
}

function recordAssignment(
  bookingId,
  previousAgentId,
  newAgentId,
  action,
  actorUserId,
  note = ""
) {
  db.prepare(`
    INSERT INTO booking_assignment_history
    (booking_id, previous_agent_id, new_agent_id,
     action, actor_user_id, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    bookingId,
    previousAgentId || null,
    newAgentId || null,
    action,
    actorUserId || null,
    note
  );
}

// --------------------------------------------------
// 72 HOURS EXPIRED BOOKING RETURN
// --------------------------------------------------

function returnExpiredBookings() {
  const expired = db.prepare(`
    SELECT b.*, u.name AS agent_name
    FROM bookings b
    LEFT JOIN users u ON u.id = b.assigned_agent_id
    WHERE b.assigned_agent_id IS NOT NULL
      AND b.assignment_due_at IS NOT NULL
      AND datetime(b.assignment_due_at) <= datetime('now')
      AND b.status = 'एजेंट नियुक्त'
  `).all();

  if (!expired.length) return;

  const transaction = db.transaction((items) => {
    for (const booking of items) {
      const result = db.prepare(`
        UPDATE bookings
        SET assigned_agent_id = NULL,
            status = 'समय समाप्त - Admin के पास वापस',
            returned_at = CURRENT_TIMESTAMP,
            assignment_due_at = NULL,
            assignment_mode = 'admin'
        WHERE id = ?
          AND status = 'एजेंट नियुक्त'
          AND datetime(assignment_due_at) <= datetime('now')
      `).run(booking.id);

      if (result.changes) {
        const bookingCode = makeBookingId(booking.id);

        recordAssignment(
          booking.id,
          booking.assigned_agent_id,
          null,
          "समय समाप्त",
          null,
          "72 घंटे में Agent द्वारा Booking स्वीकार नहीं की गई"
        );

        makeNotification(
          "booking_expired",
          "Agent Booking समय समाप्त",
          `${bookingCode} - ${booking.name} की Booking समय समाप्त होने पर Admin के पास वापस आई।`,
          booking.id
        );
      }
    }
  });

  transaction(expired);
}

// Server चालू रहने पर हर 60 सेकंड में जाँच
const expiryTimer = setInterval(() => {
  try {
    returnExpiredBookings();
  } catch (error) {
    console.error("Booking expiry error:", error);
  }
}, 60000);

if (typeof expiryTimer.unref === "function") {
  expiryTimer.unref();
}

// --------------------------------------------------
// ADMIN ACCOUNT
// --------------------------------------------------

const ADMIN_MOBILE = process.env.ADMIN_MOBILE || "9098520283";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const existingAdmin = db.prepare(`
  SELECT * FROM users WHERE mobile = ?
`).get(ADMIN_MOBILE);

if (!existingAdmin) {
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.warn(
      "Admin account नहीं बनाया गया। ADMIN_PASSWORD environment variable में कम से कम 8 अक्षर रखें।"
    );
  } else {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

    db.prepare(`
      INSERT INTO users
      (name, mobile, password, role, status, userId)
      VALUES (?, ?, ?, 'admin', 'approved', 'ADMIN')
    `).run("Borewell Mitra Admin", ADMIN_MOBILE, hash);

    console.log("Admin account created.");
  }
} else {
  // पुराने Admin का password और User ID नहीं बदले जाएँगे
  db.prepare(`
    UPDATE users
    SET role = 'admin', status = 'approved'
    WHERE id = ?
  `).run(existingAdmin.id);

  console.log("Existing Admin account checked.");
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Borewell Mitra MP API चालू है",
    database: "connected"
  });
});

// --------------------------------------------------
// AUTH REGISTER
// --------------------------------------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      password,
      role = "customer",
      district,
      block,
      referralCode
    } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "नाम, मोबाइल और पासवर्ड आवश्यक हैं"
      });
    }

    if (!/^[6-9]\d{9}$/.test(String(mobile))) {
      return res.status(400).json({
        success: false,
        message: "सही 10 अंकों का मोबाइल नंबर डालें"
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए"
      });
    }

    if (!["customer", "agent"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Registration role सही नहीं है"
      });
    }

    if (role === "agent" && (!district || !block)) {
      return res.status(400).json({
        success: false,
        message: "Agent के लिए District और Block आवश्यक हैं"
      });
    }

    const duplicate = db.prepare(
      "SELECT id FROM users WHERE mobile = ?"
    ).get(String(mobile));

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "यह मोबाइल नंबर पहले से Registered है"
      });
    }

    let referredBy = null;
    let referredAgentId = null;

    if (referralCode) {
      const code = String(referralCode).trim().toUpperCase();

      const partner = db.prepare(`
        SELECT id FROM users
        WHERE referral_code = ?
          AND role = 'referral'
          AND status = 'approved'
      `).get(code);

      const agent = db.prepare(`
        SELECT id FROM users
        WHERE (userId = ? OR referral_code = ?)
          AND role = 'agent'
          AND status = 'approved'
      `).get(code, code);

      if (partner) referredBy = partner.id;
      else if (agent) referredAgentId = agent.id;
    }

    const hash = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users
      (name, mobile, password, role, status,
       district, block, referred_by, referred_agent_id)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(
      String(name).trim(),
      String(mobile),
      hash,
      role,
      district || null,
      block || null,
      referredBy,
      referredAgentId
    );

    const userId = role === "agent"
      ? makeAgentId(result.lastInsertRowid)
      : makeCustomerId(result.lastInsertRowid);

    db.prepare(`
      UPDATE users SET userId = ? WHERE id = ?
    `).run(userId, result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Registration सफल। Admin Approval के बाद Login करें।",
      userId
    });
  } catch (error) {
    sendError(res, error);
  }
});


// --------------------------------------------------
// AUTH LOGIN - User ID / Mobile दोनों से Login
// --------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { login, mobile, userId, password } = req.body;

    // Frontend के login field को भी स्वीकार करेगा
    const loginId = String(login || mobile || userId || "").trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: "User ID / Mobile और Password डालें"
      });
    }

    const user = db.prepare(`
      SELECT * FROM users
      WHERE mobile = ? OR userId = ?
    `).get(loginId, loginId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User नहीं मिला"
      });
    }

    const valid = await bcrypt.compare(
      String(password),
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Password गलत है"
      });
    }

    if (user.role !== "admin" && user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "आपका Account अभी Admin द्वारा Approve नहीं हुआ है"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        userId: user.userId
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token,
      user: getCurrentUser(user.id)
    });

  } catch (error) {
    sendError(res, error);
  }
});


// --------------------------------------------------
// SERVICES
// --------------------------------------------------

app.get("/api/services", (req, res) => {
  try {
    const services = db.prepare(`
      SELECT id, name, unit
      FROM services
      WHERE active = 1
      ORDER BY id
    `).all();

    res.json(services);
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------
// PUBLIC RATE LIST
// --------------------------------------------------

app.get("/api/rates", (req, res) => {
  try {
    const { district, block, agent } = req.query;

    if (agent) {
      const agentUser = db.prepare(`
        SELECT id FROM users
        WHERE userId = ?
          AND role = 'agent'
          AND status = 'approved'
      `).get(agent);

      if (agentUser) {
        const personalRates = db.prepare(`
          SELECT ar.id, ar.district, ar.block,
                 s.name AS service, ar.rate, ar.unit
          FROM agent_rates ar
          JOIN services s ON s.id = ar.service_id
          WHERE ar.agent_id = ?
            AND ar.status = 'approved'
            AND (? IS NULL OR ar.district = ?)
            AND (? IS NULL OR ar.block = ?)
          ORDER BY s.name
        `).all(
          agentUser.id,
          district || null,
          district || null,
          block || null,
          block || null
        );

        if (personalRates.length) {
          return res.json(personalRates);
        }
      }
    }

    const rates = db.prepare(`
      SELECT r.id, r.district, r.block,
             r.service, r.rate,
             COALESCE(s.unit, 'प्रति फुट') AS unit
      FROM rates r
      LEFT JOIN services s ON s.name = r.service
      WHERE (? IS NULL OR r.district = ?)
        AND (? IS NULL OR r.block = ?)
      ORDER BY r.district, r.block, r.service
    `).all(
      district || null,
      district || null,
      block || null,
      block || null
    );

    res.json(rates);
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------


// --------------------------------------------------
// PUBLIC BOOKING
// --------------------------------------------------

app.post("/api/bookings", (req, res) => {
  try {
    const {
      name,
      mobile,
      district,
      block,
      village,
      tehsil,
      address,
      service,
      referralCode
    } = req.body;

    if (!name || !mobile || !district || !block || !service) {
      return res.status(400).json({
        success: false,
        message: "नाम, मोबाइल, District, Block और Service आवश्यक हैं"
      });
    }

    const activeService = db.prepare(`
      SELECT * FROM services
      WHERE name = ? AND active = 1
    `).get(service);

    if (!activeService) {
      return res.status(400).json({
        success: false,
        message: "चुनी गई Service उपलब्ध नहीं है"
      });
    }

    const customer = db.prepare(`
      SELECT * FROM users
      WHERE mobile = ?
      LIMIT 1
    `).get(String(mobile));

    let referralPartnerId = customer?.referred_by || null;
    let referringAgentId = customer?.referred_agent_id || null;
    let referralCodeSnapshot = null;
    let referralNameSnapshot = null;

    if (referralCode) {
      const code = String(referralCode).trim().toUpperCase();

      const partner = db.prepare(`
        SELECT id, name, referral_code
        FROM users
        WHERE referral_code = ?
          AND role = 'referral'
          AND status = 'approved'
      `).get(code);

      const agent = db.prepare(`
        SELECT id, name, userId
        FROM users
        WHERE (userId = ? OR referral_code = ?)
          AND role = 'agent'
          AND status = 'approved'
      `).get(code, code);

      if (!partner && !agent) {
        return res.status(400).json({
          success: false,
          message: "Referral Code सही नहीं है"
        });
      }

      if (partner) {
        referralPartnerId = partner.id;
        referringAgentId = null;
        referralCodeSnapshot = partner.referral_code || code;
        referralNameSnapshot = partner.name;
      } else {
        referringAgentId = agent.id;
        referralPartnerId = null;
        referralCodeSnapshot = agent.userId || code;
        referralNameSnapshot = agent.name;
      }
    } else if (referralPartnerId) {
      const partner = db.prepare(
        "SELECT name, referral_code FROM users WHERE id = ?"
      ).get(referralPartnerId);

      if (partner) {
        referralCodeSnapshot = partner.referral_code;
        referralNameSnapshot = partner.name;
      }
    } else if (referringAgentId) {
      const agent = db.prepare(
        "SELECT name, userId FROM users WHERE id = ?"
      ).get(referringAgentId);

      if (agent) {
        referralCodeSnapshot = agent.userId;
        referralNameSnapshot = agent.name;
      }
    }

    let rateAtBooking = null;
    let rateUnit = activeService.unit || "प्रति फुट";

    if (referringAgentId) {
      const personalRate = db.prepare(`
        SELECT ar.rate, ar.unit
        FROM agent_rates ar
        WHERE ar.agent_id = ?
          AND ar.district = ?
          AND ar.block = ?
          AND ar.service_id = ?
          AND ar.status = 'approved'
      `).get(
        referringAgentId,
        district,
        block,
        activeService.id
      );

      if (personalRate) {
        rateAtBooking = personalRate.rate;
        rateUnit = personalRate.unit || rateUnit;
      }
    }

    if (rateAtBooking === null) {
      const standardRate = db.prepare(`
        SELECT rate FROM rates
        WHERE district = ?
          AND block = ?
          AND service = ?
      `).get(district, block, service);

      if (standardRate) {
        rateAtBooking = standardRate.rate;
      }
    }

    const result = db.prepare(`
      INSERT INTO bookings
      (
        name, mobile, district, block, village,
        service, status, customer_user_id,
        rate_at_booking, rate_unit, tehsil, address,
        referral_partner_id, referring_agent_id,
        referral_code_at_booking, referral_name_at_booking,
        assignment_mode, assignment_count
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, 'नई बुकिंग', ?,
        ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 0
      )
    `).run(
      String(name).trim(),
      String(mobile),
      district,
      block,
      village || null,
      service,
      customer?.id || null,
      rateAtBooking,
      rateUnit,
      tehsil || null,
      address || null,
      referralPartnerId,
      referringAgentId,
      referralCodeSnapshot,
      referralNameSnapshot
    );

    const bookingId = result.lastInsertRowid;

    res.status(201).json({
      success: true,
      message: "Booking सफलतापूर्वक दर्ज हुई",
      bookingId,
      bookingCode: makeBookingId(bookingId),
      referral: referralNameSnapshot
        ? {
            name: referralNameSnapshot,
            code: referralCodeSnapshot
          }
        : null
    });
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------
// ADMIN - ALL BOOKINGS
// --------------------------------------------------

app.get("/api/bookings", authenticateToken, adminOnly, (req, res) => {
  try {
    returnExpiredBookings();

    const bookings = db.prepare(`
      SELECT
        b.*,
        a.name AS agent_name,
        a.mobile AS agent_mobile,
        a.userId AS agent_userId,
        rp.name AS referral_name,
        rp.userId AS referral_userId
      FROM bookings b
      LEFT JOIN users a ON a.id = b.assigned_agent_id
      LEFT JOIN users rp ON rp.id = b.referral_partner_id
      ORDER BY b.id DESC
    `).all();

    res.json(
      bookings.map((booking) => ({
        ...booking,
        bookingCode: makeBookingId(booking.id)
      }))
    );
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------
// ADMIN - BOOKING HISTORY
// --------------------------------------------------

app.get(
  "/api/admin/bookings/:id/history",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const history = db.prepare(`
        SELECT
          h.*,
          oldAgent.name AS previous_agent_name,
          newAgent.name AS new_agent_name,
          actor.name AS actor_name
        FROM booking_assignment_history h
        LEFT JOIN users oldAgent
          ON oldAgent.id = h.previous_agent_id
        LEFT JOIN users newAgent
          ON newAgent.id = h.new_agent_id
        LEFT JOIN users actor
          ON actor.id = h.actor_user_id
        WHERE h.booking_id = ?
        ORDER BY h.id DESC
      `).all(req.params.id);

      res.json(history);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - NOTIFICATIONS
// --------------------------------------------------

app.get(
  "/api/admin/notifications",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const notifications = db.prepare(`
        SELECT * FROM admin_notifications
        ORDER BY id DESC
        LIMIT 100
      `).all();

      const unread = db.prepare(`
        SELECT COUNT(*) AS count
        FROM admin_notifications
        WHERE is_read = 0
      `).get();

      res.json({
        notifications,
        unreadCount: unread.count
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.patch(
  "/api/admin/notifications/:id/read",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      db.prepare(`
        UPDATE admin_notifications
        SET is_read = 1
        WHERE id = ?
      `).run(req.params.id);

      res.json({
        success: true,
        message: "Notification पढ़ लिया गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - PENDING USERS
// --------------------------------------------------

app.get(
  "/api/admin/pending-users",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const users = db.prepare(`
        SELECT id, name, mobile, role, status,
               userId, district, block, created_at
        FROM users
        WHERE status = 'pending'
          AND role != 'admin'
        ORDER BY id DESC
      `).all();

      res.json(users);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - APPROVE / REJECT USERS
// --------------------------------------------------

app.patch(
  "/api/admin/users/:id/status",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { status, role, district, block } = req.body;

      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status सही नहीं है"
        });
      }

      const user = db.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).get(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User नहीं मिला"
        });
      }

      const newRole = role || user.role;

      if (!["customer", "agent", "referral"].includes(newRole)) {
        return res.status(400).json({
          success: false,
          message: "Role सही नहीं है"
        });
      }

      if (newRole === "agent" && status === "approved" &&
          !(district || user.district) ) {
        return res.status(400).json({
          success: false,
          message: "Agent के लिए District आवश्यक है"
        });
      }

      if (newRole === "agent" && status === "approved" &&
          !(block || user.block)) {
        return res.status(400).json({
          success: false,
          message: "Agent के लिए Block आवश्यक है"
        });
      }

      let userId = user.userId;
      let referralCode = user.referral_code;

      if (!userId) {
        if (newRole === "agent") userId = makeAgentId(user.id);
        else if (newRole === "referral") {
          userId = `KR${String(user.id).padStart(5, "0")}`;
        } else {
          userId = makeCustomerId(user.id);
        }
      }

      if (newRole === "referral" && status === "approved" && !referralCode) {
        referralCode = makeReferralCode(user.id);
      }

      db.prepare(`
        UPDATE users
        SET status = ?,
            role = ?,
            userId = ?,
            referral_code = ?,
            district = ?,
            block = ?
        WHERE id = ?
      `).run(
        status,
        newRole,
        userId,
        referralCode,
        district || user.district || null,
        block || user.block || null,
        user.id
      );

      res.json({
        success: true,
        message: "User Status अपडेट हो गया",
        userId,
        referralCode
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - AGENTS
// --------------------------------------------------

app.get(
  "/api/admin/agents",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const agents = db.prepare(`
  SELECT
    id,
    name,
    mobile,
    userId,
    status,
    district,
    block,
    agency_name,
    office_address,
    created_at
  FROM users
  WHERE role = 'agent'
  ORDER BY district, block, agency_name
`).all();

      res.json(agents);
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.patch(
  "/api/admin/agents/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const {
        name,
        mobile,
        district,
        block,
        agency_name,
        office_address
      } = req.body;

      const agent = db.prepare(`
        SELECT * FROM users
        WHERE id = ? AND role = 'agent'
      `).get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला"
        });
      }

      if (mobile && !/^[6-9]\d{9}$/.test(String(mobile))) {
        return res.status(400).json({
          success: false,
          message: "सही 10 अंकों का मोबाइल नंबर डालें"
        });
      }

      const duplicate = mobile
        ? db.prepare(`
            SELECT id FROM users
            WHERE mobile = ? AND id != ?
          `).get(String(mobile), agent.id)
        : null;

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "यह मोबाइल नंबर दूसरे Account में इस्तेमाल हो रहा है"
        });
      }

      db.prepare(`
        UPDATE users
        SET
          name = ?,
          mobile = ?,
          district = ?,
          block = ?,
          agency_name = ?,
          office_address = ?
        WHERE id = ?
      `).run(
        name ?? agent.name,
        mobile ?? agent.mobile,
        district ?? agent.district,
        block ?? agent.block,
        agency_name ?? agent.agency_name,
        office_address ?? agent.office_address,
        agent.id
      );

      res.json({
        success: true,
        message: "Agent Profile अपडेट हो गई"
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);

app.patch(
  "/api/admin/agents/:id/status",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { status } = req.body;

      if (!["approved", "pending", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status सही नहीं है"
        });
      }

      db.prepare(`
        UPDATE users
        SET status = ?
        WHERE id = ? AND role = 'agent'
      `).run(status, req.params.id);

      res.json({
        success: true,
        message: "Agent Status अपडेट हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// ADMIN - AGENT ACTIVE / INACTIVE
// --------------------------------------------------

app.patch(
  "/api/admin/agents/:id/active",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const isActive = req.body.is_active;

      if (![0, 1, true, false].includes(isActive)) {
        return res.status(400).json({
          success: false,
          message: "Active या Inactive चुनें"
        });
      }

      const agent = db.prepare(`
        SELECT id, status, deleted_at
        FROM users
        WHERE id = ? AND role = 'agent'
      `).get(req.params.id);

      if (!agent || agent.deleted_at) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला"
        });
      }

      if (agent.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "पहले Agent को Approve करें"
        });
      }

      db.prepare(`
        UPDATE users
        SET is_active = ?
        WHERE id = ? AND role = 'agent'
      `).run(isActive ? 1 : 0, agent.id);

      res.json({
        success: true,
        message: isActive ? "Agent Active कर दिया गया" : "Agent Inactive कर दिया गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - SOFT DELETE / ARCHIVE AGENT
// पुरानी Booking History सुरक्षित रहेगी
// --------------------------------------------------

app.delete(
  "/api/admin/agents/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const agent = db.prepare(`
        SELECT id, name
        FROM users
        WHERE id = ?
          AND role = 'agent'
          AND deleted_at IS NULL
      `).get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला"
        });
      }

      const archiveAgent = db.transaction(() => {
        db.prepare(`
          UPDATE users
          SET is_active = 0,
              deleted_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(agent.id);

        const bookings = db.prepare(`
          SELECT id
          FROM bookings
          WHERE assigned_agent_id = ?
            AND status NOT IN ('पूर्ण', 'रद्द')
        `).all(agent.id);

        for (const booking of bookings) {
          db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = NULL,
                status = 'Admin के पास वापस',
                assignment_due_at = NULL,
                assignment_mode = 'admin',
                returned_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(booking.id);

          recordAssignment(
            booking.id,
            agent.id,
            null,
            "Agent Archived",
            req.user.id,
            "Agent को Admin द्वारा Archive किया गया"
          );
        }

        makeNotification(
          "agent_archived",
          "Agent Archive किया गया",
          `${agent.name} को Archive किया गया। उसकी पुरानी Booking History सुरक्षित है।`
        );
      });

      archiveAgent();

      res.json({
        success: true,
        message: "Agent Archive कर दिया गया। पुरानी History सुरक्षित है।"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);
// ==========================================
// CUSTOMER DASHBOARD - MY BOOKINGS
// ==========================================
app.get("/api/customer/bookings", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "केवल ग्राहक इस जानकारी को देख सकते हैं।"
      });
    }

    const bookings = db.prepare(`
      SELECT
        b.*,
        a.name AS agent_name,
        a.mobile AS agent_mobile,
        a.userId AS agent_userId
      FROM bookings b
      LEFT JOIN users a ON a.id = b.assigned_agent_id
      WHERE b.customer_user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      bookings: bookings.map(booking => ({
        ...booking,
        bookingCode: "KB" + String(booking.id).padStart(6, "0")
      }))
    });

  } catch (error) {
    console.error("Customer bookings error:", error);

    res.status(500).json({
      success: false,
      message: "बुकिंग जानकारी प्राप्त नहीं हो सकी।"
    });
  }
});

// CUSTOMER AREA UPDATE
// ==========================================
app.patch("/api/customer/area", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "केवल ग्राहक अपना क्षेत्र अपडेट कर सकते हैं।"
      });
    }

    const district = String(req.body.district || "").trim();
    const block = String(req.body.block || "").trim();

    if (!district || !block) {
      return res.status(400).json({
        success: false,
        message: "जिला और ब्लॉक दोनों चुनना आवश्यक है।"
      });
    }

    db.prepare(`
      UPDATE users
      SET district = ?, block = ?
      WHERE id = ? AND role = 'customer'
    `).run(district, block, req.user.id);

    const user = getCurrentUser(req.user.id);

    res.json({
      success: true,
      message: "आपका जिला और ब्लॉक अपडेट हो गया।",
      user
    });

  } catch (error) {
    console.error("Customer area update error:", error);

    res.status(500).json({
      success: false,
      message: "क्षेत्र अपडेट नहीं हो सका।"
    });
  }
});

// CUSTOMER PROFILE - DISTRICT / BLOCK UPDATE
app.patch(
  "/api/customer/profile",
  authenticateToken,
  (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "केवल ग्राहक अपना प्रोफाइल अपडेट कर सकता है।"
        });
      }

      const { district, block } = req.body;

      if (!district?.trim() || !block?.trim()) {
        return res.status(400).json({
          success: false,
          message: "जिला और ब्लॉक चुनना आवश्यक है।"
        });
      }

      db.prepare(`
        UPDATE users
        SET district = ?, block = ?
        WHERE id = ? AND role = 'customer'
      `).run(
        district.trim(),
        block.trim(),
        req.user.id
      );

      res.json({
        success: true,
        message: "जिला और ब्लॉक प्रोफाइल में सेव हो गए।",
        user: getCurrentUser(req.user.id)
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);// CUSTOMER DASHBOARD - MY BOOKINGS
// --------------------------------------------------
// ADMIN - AGENT PROFILE UPDATE REQUESTS
// --------------------------------------------------

// सभी Profile Requests देखना
app.get(
  "/api/admin/agent-profile-requests",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT
          r.*,
          u.name AS current_name,
          u.mobile AS current_mobile,
          u.userId AS agent_userId,
          u.district,
          u.block,
          u.agency_name AS current_agency_name,
          u.office_address AS current_office_address
        FROM agent_profile_requests r
        JOIN users u ON u.id = r.agent_id
        ORDER BY
          CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
          r.id DESC
      `).all();

      res.json({
        success: true,
        requests
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);


// Request Approve / Reject करना
app.patch(
  "/api/admin/agent-profile-requests/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { status, admin_note } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status approved या rejected होना चाहिए"
        });
      }

      const request = db.prepare(`
        SELECT *
        FROM agent_profile_requests
        WHERE id = ?
      `).get(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Profile Request नहीं मिली"
        });
      }

      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: "यह Request पहले ही Review हो चुकी है"
        });
      }

      const agent = db.prepare(`
        SELECT *
        FROM users
        WHERE id = ? AND role = 'agent'
      `).get(request.agent_id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent Account नहीं मिला"
        });
      }

      if (status === "approved") {
        const duplicate = db.prepare(`
          SELECT id
          FROM users
          WHERE mobile = ? AND id != ?
        `).get(request.new_mobile, agent.id);

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "यह नया मोबाइल नंबर किसी दूसरे Account में इस्तेमाल हो रहा है। पहले मोबाइल नंबर की समस्या ठीक करें।"
          });
        }
      }

      const reviewRequest = db.transaction(() => {
        if (status === "approved") {
          // केवल Admin Approval के बाद Agent की जानकारी बदलेगी
          db.prepare(`
            UPDATE users
            SET
              name = ?,
              mobile = ?,
              agency_name = ?,
              office_address = ?
            WHERE id = ? AND role = 'agent'
          `).run(
            request.new_name,
            request.new_mobile,
            request.new_agency_name,
            request.new_office_address,
            agent.id
          );
        }

        db.prepare(`
          UPDATE agent_profile_requests
          SET
            status = ?,
            admin_note = ?,
            reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'pending'
        `).run(
          status,
          String(admin_note || "").trim() || null,
          request.id
        );

        makeNotification(
          "agent_profile_reviewed",
          status === "approved"
            ? "Agent Profile Update Approved"
            : "Agent Profile Update Rejected",
          `${agent.name} (${agent.userId}) की Profile Update Request ${status === "approved" ? "Approve" : "Reject"} कर दी गई। Request ID: ${request.id}`
        );
      });

      reviewRequest();

      res.json({
        success: true,
        message: status === "approved"
          ? "Agent की नई Profile जानकारी Approve और Update हो गई।"
          : "Agent की Profile Update Request Reject कर दी गई। पुरानी जानकारी सुरक्षित है।",
        profile: getCurrentUser(agent.id)
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// ADMIN - SERVICES MANAGEMENT
// --------------------------------------------------

app.get(
  "/api/admin/services",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      res.json(
        db.prepare("SELECT * FROM services ORDER BY id").all()
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/admin/services",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { name, unit } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Service का नाम आवश्यक है"
        });
      }

      const result = db.prepare(`
        INSERT INTO services (name, unit)
        VALUES (?, ?)
      `).run(name.trim(), unit || "प्रति फुट");

      res.status(201).json({
        success: true,
        id: result.lastInsertRowid,
        message: "Service जोड़ दी गई"
      });
    } catch (error) {
      sendError(res, error, 400);
    }
  }
);


app.patch(
  "/api/admin/services/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { name, unit, active } = req.body;

      const service = db.prepare(
        "SELECT * FROM services WHERE id = ?"
      ).get(req.params.id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service नहीं मिली"
        });
      }

      const newName = String(name ?? service.name).trim();
      const newUnit = String(unit ?? service.unit).trim();

      if (!newName || !newUnit) {
        return res.status(400).json({
          success: false,
          message: "Service का नाम और Unit आवश्यक हैं"
        });
      }

      const isActive = active === undefined
        ? service.active
        : (active ? 1 : 0);

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE services
          SET name = ?, unit = ?, active = ?
          WHERE id = ?
        `).run(newName, newUnit, isActive, service.id);

        // पुराने Rate रिकॉर्ड में भी Service का नाम बदलें
        if (newName !== service.name) {
          db.prepare(`
            UPDATE rates
            SET service = ?, updated_at = CURRENT_TIMESTAMP
            WHERE service = ?
          `).run(newName, service.name);
        }
      });

      transaction();

      res.json({
        success: true,
        message: "Service अपडेट हो गई"
      });
    } catch (error) {
      sendError(res, error, 400);
    }
  }
);

// Service Delete - पुराने रिकॉर्ड सुरक्षित रहेंगे
app.delete(
  "/api/admin/services/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const service = db.prepare(
        "SELECT * FROM services WHERE id = ?"
      ).get(req.params.id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service नहीं मिली"
        });
      }

      db.prepare(`
        UPDATE services
        SET active = 0
        WHERE id = ?
      `).run(service.id);

      res.json({
        success: true,
        message: "Service निष्क्रिय कर दी गई। पुराने रिकॉर्ड सुरक्षित हैं।"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------

// --------------------------------------------------
// ADMIN - RATE MANAGEMENT
// --------------------------------------------------

// GET ALL RATES
app.get(
  "/api/admin/rates",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const rates = db.prepare(`
        SELECT
          id,
          district,
          block,
          service,
          rate,
          updated_at
        FROM rates
        ORDER BY district, block, service
      `).all();

      res.json(rates);
    } catch (error) {
      sendError(res, error);
    }
  }
);


// ADD OR UPDATE SINGLE RATE
app.post(
  "/api/admin/rates",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { district, block, service, rate } = req.body;

      if (
        !district?.trim() ||
        !block?.trim() ||
        !service?.trim() ||
        rate === undefined ||
        rate === "" ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "जिला, ब्लॉक, Service और सही Rate डालें।"
        });
      }

      db.prepare(`
        INSERT INTO rates (district, block, service, rate)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(district, block, service)
        DO UPDATE SET
          rate = excluded.rate,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        district.trim(),
        block.trim(),
        service.trim(),
        Number(rate)
      );

      res.json({
        success: true,
        message: "Rate सफलतापूर्वक सेव / अपडेट हो गया।"
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);


// BULK UPDATE MULTIPLE RATES
app.post(
  "/api/admin/rates/bulk",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { district, block, rates } = req.body;

      if (
        !district?.trim() ||
        !block?.trim() ||
        !Array.isArray(rates) ||
        rates.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "जिला, ब्लॉक और कम से कम एक Rate जरूरी है।"
        });
      }

      // Duplicate Service रोकें
      const serviceNames = rates.map(item =>
        String(item?.service || "").trim()
      );

      if (
        serviceNames.some(name => !name) ||
        new Set(serviceNames).size !== serviceNames.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Service का नाम खाली या दोहराया हुआ नहीं होना चाहिए।"
        });
      }

      // सभी Rates की जाँच पहले करें
      for (const item of rates) {
        if (
          item.rate === undefined ||
          item.rate === "" ||
          !Number.isFinite(Number(item.rate)) ||
          Number(item.rate) < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${item.service} का Rate सही नहीं है।`
          });
        }
      }

      // सभी Rates एक Transaction में सेव होंगे
      const updateRates = db.transaction(() => {
        const statement = db.prepare(`
          INSERT INTO rates (district, block, service, rate)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(district, block, service)
          DO UPDATE SET
            rate = excluded.rate,
            updated_at = CURRENT_TIMESTAMP
        `);

        for (const item of rates) {
          statement.run(
            district.trim(),
            block.trim(),
            item.service.trim(),
            Number(item.rate)
          );
        }
      });

      updateRates();

      res.json({
        success: true,
        message: `${rates.length} Services के Rate सफलतापूर्वक अपडेट हो गए।`,
        updatedCount: rates.length
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);


// EDIT SINGLE RATE BY ID
app.put(
  "/api/admin/rates/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { district, block, service, rate } = req.body;

      if (
        !district?.trim() ||
        !block?.trim() ||
        !service?.trim() ||
        rate === undefined ||
        rate === "" ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "जिला, ब्लॉक, Service और सही Rate डालें।"
        });
      }

      const result = db.prepare(`
        UPDATE rates
        SET
          district = ?,
          block = ?,
          service = ?,
          rate = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        district.trim(),
        block.trim(),
        service.trim(),
        Number(rate),
        req.params.id
      );

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "यह Rate रिकॉर्ड नहीं मिला।"
        });
      }

      res.json({
        success: true,
        message: "Rate सफलतापूर्वक अपडेट हो गया।"
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);


// DELETE SINGLE RATE
app.delete(
  "/api/admin/rates/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const result = db.prepare(
        "DELETE FROM rates WHERE id = ?"
      ).run(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "यह Rate रिकॉर्ड नहीं मिला।"
        });
      }

      res.json({
        success: true,
        message: "Rate हटा दिया गया।"
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT PROFILE UPDATE REQUEST
// Agent request करेगा, Admin Approval के बाद ही बदलाव होगा
// --------------------------------------------------

app.patch(
  "/api/agent/profile",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const {
        name,
        mobile,
        agency_name,
        office_address
      } = req.body;

      const agent = db.prepare(`
        SELECT * FROM users
        WHERE id = ? AND role = 'agent'
      `).get(req.user.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला"
        });
      }

      const newName = String(name ?? agent.name).trim();
      const newMobile = String(mobile ?? agent.mobile).trim();
      const newAgencyName = String(
        agency_name ?? agent.agency_name ?? ""
      ).trim();
      const newOfficeAddress = String(
        office_address ?? agent.office_address ?? ""
      ).trim();

      if (!newName || !newMobile || !newAgencyName || !newOfficeAddress) {
        return res.status(400).json({
          success: false,
          message: "नाम, मोबाइल, एजेंसी का नाम और ऑफिस का पता आवश्यक हैं"
        });
      }

      if (!/^[6-9]\d{9}$/.test(newMobile)) {
        return res.status(400).json({
          success: false,
          message: "सही 10 अंकों का मोबाइल नंबर डालें"
        });
      }

      const duplicate = db.prepare(`
        SELECT id FROM users
        WHERE mobile = ? AND id != ?
      `).get(newMobile, agent.id);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "यह मोबाइल नंबर दूसरे Account में इस्तेमाल हो रहा है"
        });
      }

      // पहले से Pending Request है तो नई Request स्वीकार नहीं होगी
      const pendingRequest = db.prepare(`
        SELECT id FROM agent_profile_requests
        WHERE agent_id = ? AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
      `).get(agent.id);

      if (pendingRequest) {
        return res.status(409).json({
          success: false,
          message: "आपकी पिछली Profile Request अभी Admin Approval के लिए Pending है।"
        });
      }

      const unchanged =
        newName === agent.name &&
        newMobile === agent.mobile &&
        newAgencyName === (agent.agency_name || "") &&
        newOfficeAddress === (agent.office_address || "");

      if (unchanged) {
        return res.status(400).json({
          success: false,
          message: "आपने कोई नई जानकारी नहीं बदली है"
        });
      }

      const result = db.prepare(`
        INSERT INTO agent_profile_requests (
          agent_id,
          old_name, new_name,
          old_mobile, new_mobile,
          old_agency_name, new_agency_name,
          old_office_address, new_office_address,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        agent.id,
        agent.name,
        newName,
        agent.mobile,
        newMobile,
        agent.agency_name || "",
        newAgencyName,
        agent.office_address || "",
        newOfficeAddress
      );

      makeNotification(
        "agent_profile_request",
        "Agent Profile Update Approval",
        `${agent.name} (${agent.userId}) ने अपनी Profile बदलने की Request भेजी है। Request ID: ${result.lastInsertRowid}`
      );

      res.status(201).json({
        success: true,
        pending: true,
        requestId: result.lastInsertRowid,
        message: "आपकी Profile Update Request Admin को भेज दी गई है। Approval के बाद ही नई जानकारी लागू होगी।",
        profile: getCurrentUser(agent.id)
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// AGENT PROFILE
// --------------------------------------------------

app.get(
  "/api/agent/profile",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      res.json(getCurrentUser(req.user.id));
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT CUSTOMERS
// --------------------------------------------------

app.get(
  "/api/agent/customers",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const customers = db.prepare(`
        SELECT DISTINCT
          b.name, b.mobile, b.district, b.block,
          b.village, b.address
        FROM bookings b
        WHERE b.assigned_agent_id = ?
        ORDER BY b.id DESC
      `).all(req.user.id);

      res.json(customers);
    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// AGENT - PROFILE UPDATE REQUEST STATUS

app.get(
  "/api/agent/profile-request",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const request = db.prepare(`
        SELECT
          id,
          old_name, new_name,
          old_mobile, new_mobile,
          old_agency_name, new_agency_name,
          old_office_address, new_office_address,
          status,
          admin_note,
          created_at
        FROM agent_profile_requests
        WHERE agent_id = ?
        ORDER BY id DESC
        LIMIT 1
      `).get(req.user.id);

      res.json({
        success: true,
        request: request || null
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// AGENT BOOKINGS
// --------------------------------------------------

app.get(
  "/api/agent/bookings",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      returnExpiredBookings();

      const bookings = db.prepare(`
        SELECT * FROM bookings
        WHERE assigned_agent_id = ?
        ORDER BY id DESC
      `).all(req.user.id);

      res.json(
        bookings.map((booking) => ({
          ...booking,
          bookingCode: makeBookingId(booking.id)
        }))
      );
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT ACCEPT / REJECT BOOKING
// --------------------------------------------------

app.patch(
  "/api/agent/bookings/:id",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const { action } = req.body;

      const booking = db.prepare(`
        SELECT * FROM bookings
        WHERE id = ? AND assigned_agent_id = ?
      `).get(req.params.id, req.user.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "यह Booking आपके Account में नहीं है"
        });
      }

      if (booking.status !== "एजेंट नियुक्त") {
        return res.status(409).json({
          success: false,
          message: "यह Booking अब स्वीकार या Reject नहीं की जा सकती"
        });
      }

      if (
        booking.assignment_due_at &&
        new Date(booking.assignment_due_at).getTime() <= Date.now()
      ) {
        return res.status(409).json({
          success: false,
          message: "Booking स्वीकार करने का समय समाप्त हो गया"
        });
      }

      if (action === "accept") {
        const transaction = db.transaction(() => {
          db.prepare(`
            UPDATE bookings
            SET status = 'एजेंट द्वारा स्वीकार'
            WHERE id = ? AND assigned_agent_id = ?
          `).run(booking.id, req.user.id);

          recordAssignment(
            booking.id,
            req.user.id,
            req.user.id,
            "Agent ने Accept किया",
            req.user.id,
            "Agent ने Booking स्वीकार कर ली"
          );
        });

        transaction();

        return res.json({
          success: true,
          message: "Booking स्वीकार कर ली गई"
        });
      }

      if (action === "reject") {
        const transaction = db.transaction(() => {
          const result = db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = NULL,
                status = 'Agent ने Reject किया - Admin के पास वापस',
                returned_at = CURRENT_TIMESTAMP,
                assignment_due_at = NULL,
                assignment_mode = 'admin'
            WHERE id = ?
              AND assigned_agent_id = ?
              AND status = 'एजेंट नियुक्त'
          `).run(booking.id, req.user.id);

          if (!result.changes) {
            throw new Error("Booking पहले ही बदल चुकी है");
          }

          recordAssignment(
            booking.id,
            req.user.id,
            null,
            "Agent ने Reject किया",
            req.user.id,
            "Agent ने Booking Reject कर Admin के पास वापस भेजी"
          );

          makeNotification(
            "booking_rejected",
            "Agent ने Booking Reject की",
            `${makeBookingId(booking.id)} - ${booking.name} की Booking Agent द्वारा Reject की गई।`,
            booking.id
          );
        });

        transaction();

        return res.json({
          success: true,
          message: "Booking Admin के पास वापस भेज दी गई"
        });
      }

      return res.status(400).json({
        success: false,
        message: "Action accept या reject होना चाहिए"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT WORK STATUS
// --------------------------------------------------

app.patch(
  "/api/agent/bookings/:id/work-status",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const { status } = req.body;

      if (!["कार्य प्रगति पर", "पूर्ण"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Work Status सही नहीं है"
        });
      }

      const booking = db.prepare(`
        SELECT * FROM bookings
        WHERE id = ? AND assigned_agent_id = ?
      `).get(req.params.id, req.user.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking नहीं मिली"
        });
      }

      if (!["एजेंट द्वारा स्वीकार", "कार्य प्रगति पर"].includes(booking.status)) {
        return res.status(409).json({
          success: false,
          message: "पहले Booking स्वीकार करना आवश्यक है"
        });
      }

      db.prepare(`
        UPDATE bookings
        SET status = ?
        WHERE id = ?
      `).run(status, booking.id);

      res.json({
        success: true,
        message: "Booking Status अपडेट हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT RATE LIST
// --------------------------------------------------

app.get(
  "/api/agent/rates",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const rates = db.prepare(`
        SELECT ar.*, s.name AS service
        FROM agent_rates ar
        JOIN services s ON s.id = ar.service_id
        WHERE ar.agent_id = ?
        ORDER BY ar.id DESC
      `).all(req.user.id);

      res.json(rates);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT RATE REQUEST
// --------------------------------------------------

app.post(
  "/api/agent/rates/request",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const { service_id, rate, unit } = req.body;

      if (!service_id || rate === undefined || Number(rate) < 0) {
        return res.status(400).json({
          success: false,
          message: "Service और सही Rate आवश्यक हैं"
        });
      }

      const agent = getCurrentUser(req.user.id);

      const existing = db.prepare(`
        SELECT * FROM agent_rates
        WHERE agent_id = ? AND service_id = ?
      `).get(req.user.id, service_id);

      const result = db.prepare(`
        INSERT INTO agent_rate_requests
        (agent_id, service_id, old_rate, requested_rate, unit, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(
        req.user.id,
        service_id,
        existing?.rate ?? null,
        Number(rate),
        unit || "प्रति फुट"
      );

      res.status(201).json({
        success: true,
        requestId: result.lastInsertRowid,
        message: "Rate Approval के लिए भेज दिया गया",
        district: agent?.district,
        block: agent?.block
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN AGENT RATE REQUESTS
// --------------------------------------------------

app.get(
  "/api/admin/agent-rate-requests",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT
          arq.*,
          u.name AS agent_name,
          u.userId AS agent_userId,
          u.district,
          u.block,
          s.name AS service
        FROM agent_rate_requests arq
        JOIN users u ON u.id = arq.agent_id
        JOIN services s ON s.id = arq.service_id
        ORDER BY arq.id DESC
      `).all();

      res.json(requests);
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.patch(
  "/api/admin/agent-rate-requests/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status approved या rejected होना चाहिए"
        });
      }

      const request = db.prepare(`
        SELECT arq.*, u.district, u.block
        FROM agent_rate_requests arq
        JOIN users u ON u.id = arq.agent_id
        WHERE arq.id = ?
      `).get(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Rate Request नहीं मिली"
        });
      }

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE agent_rate_requests
          SET status = ?
          WHERE id = ?
        `).run(status, request.id);

        if (status === "approved") {
          db.prepare(`
            INSERT INTO agent_rates
            (agent_id, district, block, service_id,
             rate, unit, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
            ON CONFLICT(agent_id, service_id)
            DO UPDATE SET
              district = excluded.district,
              block = excluded.block,
              rate = excluded.rate,
              unit = excluded.unit,
              status = 'approved',
              updated_at = CURRENT_TIMESTAMP
          `).run(
            request.agent_id,
            request.district,
            request.block,
            request.service_id,
            request.requested_rate,
            request.unit
          );
        }
      });

      transaction();

      res.json({
        success: true,
        message: status === "approved"
          ? "Agent का Rate Approve हो गया"
          : "Rate Request Reject कर दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN - ASSIGN / UPDATE BOOKING
// --------------------------------------------------

app.patch(
  "/api/admin/bookings/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const {
        assigned_agent_id,
        status,
        selfLead,
        allowOutOfArea
      } = req.body;

      const booking = db.prepare(`
        SELECT * FROM bookings WHERE id = ?
      `).get(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking नहीं मिली"
        });
      }

      const oldAgentId = booking.assigned_agent_id || null;

      // Admin खुद Booking संभाले
      if (selfLead === true) {
        const transaction = db.transaction(() => {
          db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = NULL,
                status = 'Admin द्वारा स्वीकार',
                assignment_mode = 'self',
                assigned_at = NULL,
                assignment_due_at = NULL,
                returned_at = NULL
            WHERE id = ?
          `).run(booking.id);

          recordAssignment(
            booking.id,
            oldAgentId,
            null,
            "Admin Self Lead",
            req.user.id,
            "Admin ने Booking स्वयं संभाली"
          );
        });

        transaction();

        return res.json({
          success: true,
          message: "Booking Admin Self Lead में आ गई"
        });
      }

      // Agent को Assign करना
      if (assigned_agent_id) {
        const agent = db.prepare(`
          SELECT * FROM users
          WHERE id = ?
            AND role = 'agent'
            AND status = 'approved'
        `).get(assigned_agent_id);

        if (!agent) {
          return res.status(400).json({
            success: false,
            message: "Approved Agent नहीं मिला"
          });
        }

        const sameDistrict = agent.district === booking.district;
        const sameBlock = agent.block === booking.block;
        const sameArea = sameDistrict && sameBlock;

        if (!sameArea && allowOutOfArea !== true) {
          return res.status(400).json({
            success: false,
            message: "Agent का District/Block अलग है। Out of Area Assignment की अनुमति दें।"
          });
        }

        const transaction = db.transaction(() => {
          db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = ?,
                status = 'एजेंट नियुक्त',
                assigned_at = CURRENT_TIMESTAMP,
                assignment_due_at = datetime('now', '+72 hours'),
                returned_at = NULL,
                assignment_mode = 'agent',
                assignment_count = COALESCE(assignment_count, 0) + 1
            WHERE id = ?
          `).run(agent.id, booking.id);

          recordAssignment(
            booking.id,
            oldAgentId,
            agent.id,
            "Admin ने Agent नियुक्त किया",
            req.user.id,
            sameArea
              ? "Booking Agent के क्षेत्र में Assign की गई"
              : "Admin द्वारा Out of Area Assignment की गई"
          );

          makeNotification(
            "booking_assigned",
            "नई Booking Agent को दी गई",
            `${makeBookingId(booking.id)} - ${booking.name} की Booking ${agent.name} को Assign की गई।`,
            booking.id
          );
        });

        transaction();

        return res.json({
          success: true,
          message: "Booking Agent को Assign हो गई। Agent को 72 घंटे का समय दिया गया।"
        });
      }

      // केवल Status बदलना
      if (status) {
        db.prepare(`
          UPDATE bookings SET status = ? WHERE id = ?
        `).run(status, booking.id);

        return res.json({
          success: true,
          message: "Booking Status अपडेट हो गया"
        });
      }

      // Agent हटाकर Admin के पास वापस
      if (assigned_agent_id === null) {
        const transaction = db.transaction(() => {
          db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = NULL,
                status = 'Admin के पास वापस',
                assignment_due_at = NULL,
                assignment_mode = 'admin',
                returned_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(booking.id);

          recordAssignment(
            booking.id,
            oldAgentId,
            null,
            "Admin ने Agent हटाया",
            req.user.id,
            "Admin ने Booking वापस ली"
          );

          makeNotification(
            "booking_returned",
            "Booking Admin के पास वापस",
            `${makeBookingId(booking.id)} - ${booking.name} की Booking Admin के पास वापस आई।`,
            booking.id
          );
        });

        transaction();

        return res.json({
          success: true,
          message: "Booking Admin के पास वापस आ गई"
        });
      }

      res.status(400).json({
        success: false,
        message: "Booking Update के लिए सही जानकारी भेजें"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// REFERRAL PARTNER BOOKING
// --------------------------------------------------

app.post(
  "/api/referral/bookings",
  authenticateToken,
  (req, res) => {
    try {
      if (req.user.role !== "referral") {
        return res.status(403).json({
          success: false,
          message: "केवल Referral Partner Booking कर सकता है"
        });
      }

      const partner = getCurrentUser(req.user.id);

      if (!partner || partner.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Referral Account Approved नहीं है"
        });
      }

      const {
        customerName,
        name,
        mobile,
        district,
        tehsil,
        block,
        address,
        village,
        service
      } = req.body;

      const bookingName = customerName || name;

      if (
        !bookingName || !mobile || !district ||
        !block || !service
      ) {
        return res.status(400).json({
          success: false,
          message: "Customer Name, Mobile, District, Block और Service आवश्यक हैं"
        });
      }

      const activeService = db.prepare(`
        SELECT * FROM services
        WHERE name = ? AND active = 1
      `).get(service);

      if (!activeService) {
        return res.status(400).json({
          success: false,
          message: "Service उपलब्ध नहीं है"
        });
      }

      const customer = db.prepare(`
        SELECT id FROM users WHERE mobile = ?
      `).get(String(mobile));

      const result = db.prepare(`
        INSERT INTO bookings
        (
          name, mobile, district, block, village,
          service, status, customer_user_id,
          tehsil, address, referral_partner_id,
          referral_code_at_booking,
          referral_name_at_booking,
          assignment_mode, assignment_count
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, 'नई बुकिंग', ?,
          ?, ?, ?, ?, ?, 'admin', 0
        )
      `).run(
        bookingName,
        String(mobile),
        district,
        block,
        village || null,
        service,
        customer?.id || null,
        tehsil || null,
        address || null,
        req.user.id,
        partner.referral_code || null,
        partner.name || null
      );

      res.status(201).json({
        success: true,
        message: "Referral Booking सफलतापूर्वक दर्ज हुई",
        bookingId: result.lastInsertRowid,
        bookingCode: makeBookingId(result.lastInsertRowid)
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// REFERRAL ROUTES
// referral.js के सभी पुराने routes चालू रहेंगे
// --------------------------------------------------

registerReferralRoutes(
  app,
  db,
  authenticateToken,
  adminOnly
);

// --------------------------------------------------
// SERVER START
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Borewell Mitra MP Server running: http://localhost:${PORT}`);

  try {
    returnExpiredBookings();
  } catch (error) {
    console.error("Startup expiry check error:", error);
  }
});