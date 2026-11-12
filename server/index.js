import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import registerReferralRoutes from "./referral.js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_BMM_SECRET_BEFORE_PRODUCTION";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// --------------------------------------------------
// DATABASE
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
// BLOCK WISE BANNER TABLE
// --------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS block_banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    block TEXT NOT NULL,
    image_data TEXT NOT NULL,
    image_type TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district, block)
  );
`);
// --------------------------------------------------
// SAFE DATABASE MIGRATION
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

  // Agent approval और Active/Inactive अलग-अलग रहेंगे
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

CREATE INDEX IF NOT EXISTS idx_users_agent_public
ON users(role, status, is_active, deleted_at);
`);

// --------------------------------------------------
// OLD USERS USER ID GENERATION
// --------------------------------------------------

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

// --------------------------------------------------
// DEFAULT SERVICES
// --------------------------------------------------

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
      referral_code,
      is_active,
      deleted_at
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

    // पुराने Login Token से Inactive / Archived Agent काम नहीं कर पाएगा
    if (req.user.role === "agent") {
      const agent = db.prepare(`
        SELECT status, is_active, deleted_at
        FROM users
        WHERE id = ? AND role = 'agent'
      `).get(req.user.id);

      if (
        !agent ||
        agent.status !== "approved" ||
        Number(agent.is_active) !== 1 ||
        agent.deleted_at
      ) {
        return res.status(403).json({
          success: false,
          message: "आपका Agent Account अभी Active नहीं है। Admin से संपर्क करें।"
        });
      }
    }

    next();
  } catch (error) {
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
// 24 HOURS EXPIRED BOOKING RETURN
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
        recordAssignment(
          booking.id,
          booking.assigned_agent_id,
          null,
          "समय समाप्त",
          null,
          "24 घंटे में Agent द्वारा Booking स्वीकार नहीं की गई"
        );

        makeNotification(
          "booking_expired",
          "Agent Booking समय समाप्त",
          `${makeBookingId(booking.id)} - ${booking.name} की Booking समय समाप्त होने पर Admin के पास वापस आई।`,
          booking.id
        );
      }
    }
  });

  transaction(expired);
}

// हर 60 सेकंड में Booking Expiry जाँच
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
    message: "borewells Mitra API चालू है",
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
      tehsil,
      block,
      address,
      officeAddress,
      agencyName,
      service,
      referralCode
    } = req.body;

    // आवश्यक जानकारी
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

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "पासवर्ड कम से कम 8 अक्षर का होना चाहिए"
      });
    }

    if (!["customer", "agent"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Registration role सही नहीं है"
      });
    }

    // Customer Validation
    if (role === "customer") {
      if (!district || !(tehsil || block) || !address || !service) {
        return res.status(400).json({
          success: false,
          message: "जिला, ब्लॉक, पता और सेवा आवश्यक हैं"
        });
      }

      if (!["New Borewell", "Repairing"].includes(service)) {
        return res.status(400).json({
          success: false,
          message: "सही सेवा चुनें"
        });
      }
    }

    // Agent Validation
    if (role === "agent") {
      if (!district || !(tehsil || block) || !agencyName || !(officeAddress || address)) {
        return res.status(400).json({
          success: false,
          message: "Agent के सभी आवश्यक विवरण भरें"
        });
      }
    }

    // आवश्यक Database Columns सुनिश्चित करें
    const existingColumns = db.prepare(
      "PRAGMA table_info(users)"
    ).all();

    const columnNames = existingColumns.map(col => col.name);

    const requiredColumns = {
      address: "TEXT",
      service: "TEXT",
      agencyName: "TEXT",
      officeAddress: "TEXT",
      tehsil: "TEXT"
    };

    for (const [column, type] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(column)) {
        db.exec(
          `ALTER TABLE users ADD COLUMN "${column}" ${type}`
        );
      }
    }

    // Duplicate Mobile Check
    const duplicate = db.prepare(
      "SELECT id FROM users WHERE mobile = ?"
    ).get(String(mobile));

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "यह मोबाइल नंबर पहले से Registered है"
      });
    }

    // Referral Information
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
          AND is_active = 1
          AND deleted_at IS NULL
      `).get(code, code);

      if (partner) {
        referredBy = partner.id;
      } else if (agent) {
        referredAgentId = agent.id;
      }
    }

    // Password Hash
    const hash = await bcrypt.hash(password, 10);

    const finalAddress = role === "agent"
      ? String(officeAddress || address).trim()
      : String(address || "").trim();

    // Save User
    const result = db.prepare(`
      INSERT INTO users (
        name,
        mobile,
        password,
        role,
        status,
        district,
        block,
        tehsil,
        address,
        service,
        agencyName,
        officeAddress,
        referred_by,
        referred_agent_id
      )
      VALUES (
        ?, ?, ?, ?, 'pending',
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      String(name).trim(),
      String(mobile),
      hash,
      role,
      district || null,
      block || tehsil || null,
      tehsil || block || null,
      finalAddress || null,
      role === "customer" ? service : null,
      role === "agent" ? String(agencyName).trim() : null,
      role === "agent" ? finalAddress : null,
      referredBy,
      referredAgentId
    );

    // Generate User ID
    const userId = role === "agent"
      ? makeAgentId(result.lastInsertRowid)
      : makeCustomerId(result.lastInsertRowid);

    db.prepare(`
      UPDATE users SET userId = ? WHERE id = ?
    `).run(userId, result.lastInsertRowid);

    // Response
    const user = {
      id: result.lastInsertRowid,
      userId,
      name: String(name).trim(),
      mobile: String(mobile),
      role,
      status: "pending",
      district: district || null,
      tehsil: tehsil || block || null,
      block: block || tehsil || null,
      address: finalAddress || null,
      service: role === "customer" ? service : null,
      agencyName: role === "agent" ? agencyName : null
    };

    return res.status(201).json({
      success: true,
      message: "Registration सफल। Admin Approval के बाद Login करें।",
      userId,
      user
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    sendError(res, error);
  }
});


// --------------------------------------------------
// AUTH LOGIN
// --------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { login, mobile, userId, password } = req.body;
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

    if (
      user.role === "agent" &&
      (Number(user.is_active) !== 1 || user.deleted_at)
    ) {
      return res.status(403).json({
        success: false,
        message: "आपका Agent Account Inactive है। Admin से संपर्क करें।"
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

// --------------------------------------------------
// PUBLIC RATE LIST - DISTRICT > BLOCK
// --------------------------------------------------


// --------------------------------------------------
// PUBLIC RATE LIST - DISTRICT > BLOCK
// --------------------------------------------------

app.get("/api/rates", (req, res) => {
  try {
    const district = String(req.query.district || "").trim();
    const block = String(req.query.block || "").trim();
    const agent = String(req.query.agent || "").trim();

    if (!district || !block) {
      return res.json([]);
    }

    // Agent के Approved Personal Rates
    if (agent) {
      const agentUser = db.prepare(`
        SELECT id
        FROM users
        WHERE userId = ?
          AND role = 'agent'
          AND status = 'approved'
          AND is_active = 1
          AND deleted_at IS NULL
      `).get(agent);

      if (agentUser) {
        const personalRates = db.prepare(`
          SELECT
            ar.id,
            ar.district,
            ar.block,
            ar.service_id,
            s.name AS service,
            s.name AS service_name,
            ar.rate,
            ar.unit
          FROM agent_rates ar
          JOIN services s ON s.id = ar.service_id
          WHERE ar.agent_id = ?
            AND ar.status = 'approved'
            AND TRIM(ar.district) = TRIM(?)
            AND TRIM(ar.block) = TRIM(?)
          ORDER BY s.name
        `).all(agentUser.id, district, block);

        if (personalRates.length > 0) {
          return res.json(personalRates);
        }
      }
    }

    // सामान्य District और Block Rates
    // Inactive Service होने पर भी Saved Rate दिखेगा
    const rates = db.prepare(`
      SELECT
        r.id,
        r.district,
        r.block,
        r.service,
        r.service AS service_name,
        s.id AS service_id,
        r.rate,
        COALESCE(s.unit, 'प्रति फुट') AS unit
      FROM rates r
      LEFT JOIN services s
        ON TRIM(LOWER(s.name)) = TRIM(LOWER(r.service))
      WHERE TRIM(r.district) = TRIM(?)
        AND TRIM(r.block) = TRIM(?)
      ORDER BY r.service
    `).all(district, block);

    return res.json(rates);

  } catch (error) {
    console.error("PUBLIC RATE LIST ERROR:", error);
    sendError(res, error);
  }
});


// --------------------------------------------------
// PUBLIC: APPROVED ACTIVE AGENTS BY DISTRICT + BLOCK
// --------------------------------------------------

app.get("/api/public/agents", (req, res) => {
  try {
    const district = String(req.query.district || "").trim();
    const block = String(req.query.block || "").trim();

    if (!district || !block) {
      return res.status(400).json({
        success: false,
        message: "पहले District और Block चुनें"
      });
    }

    const agents = db.prepare(`
      SELECT
        id,
        name,
        mobile,
        agency_name,
        district,
        block,
        office_address
      FROM users
      WHERE role = 'agent'
        AND status = 'approved'
        AND is_active = 1
        AND deleted_at IS NULL
        AND district = ?
        AND block = ?
      ORDER BY agency_name, name
    `).all(district, block);

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    sendError(res, error);
  }
});
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
          AND is_active = 1
          AND deleted_at IS NULL
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
// COMMON LOGIN PROFILE
// --------------------------------------------------

app.get("/api/auth/me", authenticateToken, (req, res) => {
  try {
    const user = getCurrentUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User नहीं मिला"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------
// ADMIN: ALL BOOKINGS
// --------------------------------------------------

app.get(
  "/api/admin/bookings",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      returnExpiredBookings();

      const bookings = db.prepare(`
        SELECT
          b.*,
          u.name AS agent_name,
          u.mobile AS agent_mobile,
          u.userId AS agent_userId
        FROM bookings b
        LEFT JOIN users u ON u.id = b.assigned_agent_id
        ORDER BY b.id DESC
      `).all();

      res.json(bookings.map((booking) => ({
        ...booking,
        bookingCode: makeBookingId(booking.id)
      })));
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: BOOKING HISTORY
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
          newAgent.name AS new_agent_name
        FROM booking_assignment_history h
        LEFT JOIN users oldAgent ON oldAgent.id = h.previous_agent_id
        LEFT JOIN users newAgent ON newAgent.id = h.new_agent_id
        WHERE h.booking_id = ?
        ORDER BY h.id DESC
      `).all(Number(req.params.id));

      res.json(history);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: NOTIFICATIONS
// --------------------------------------------------

app.get(
  "/api/admin/notifications",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const notifications = db.prepare(`
        SELECT *
        FROM admin_notifications
        ORDER BY id DESC
        LIMIT 200
      `).all();

      res.json(notifications);
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
      `).run(Number(req.params.id));

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
// ADMIN: PENDING USERS
// --------------------------------------------------

app.get(
  "/api/admin/users/pending",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const users = db.prepare(`
        SELECT
          id, name, mobile, role, status,
          userId, district, block,
          agency_name, office_address, created_at
        FROM users
        WHERE status = 'pending'
          AND role != 'admin'
          AND deleted_at IS NULL
        ORDER BY id DESC
      `).all();

      res.json(users);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: APPROVE / REJECT USER
// --------------------------------------------------

app.patch(
  "/api/admin/users/:id/status",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { status } = req.body;
      const userId = Number(req.params.id);

      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status सही नहीं है"
        });
      }

      const user = db.prepare(`
        SELECT * FROM users
        WHERE id = ? AND role != 'admin'
          AND deleted_at IS NULL
      `).get(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User नहीं मिला"
        });
      }

      db.prepare(`
        UPDATE users SET status = ? WHERE id = ?
      `).run(status, userId);

      if (user.role === "agent" && status !== "approved") {
        db.prepare(`
          UPDATE users SET is_active = 0 WHERE id = ?
        `).run(userId);
      }

      if (user.role === "agent" && status === "approved") {
        db.prepare(`
          UPDATE users SET is_active = 1 WHERE id = ?
        `).run(userId);
      }

      res.json({
        success: true,
        message: `User status ${status} कर दिया गया`
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: AGENT LIST
// --------------------------------------------------

app.get(
  "/api/admin/agents",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const includeArchived = req.query.includeArchived === "1";

      const agents = db.prepare(`
        SELECT
          id,
          name,
          mobile,
          userId,
          role,
          status,
          is_active,
          deleted_at,
          district,
          block,
          agency_name,
          office_address,
          referral_code,
          created_at
        FROM users
        WHERE role = 'agent'
          ${includeArchived ? "" : "AND deleted_at IS NULL"}
        ORDER BY id DESC
      `).all();

      res.json(agents);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: CREATE AGENT
// --------------------------------------------------
app.post(
  "/api/admin/agents",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const agencyName = String(req.body.agency_name || req.body.agencyName || "").trim();
      const mobile = String(req.body.mobile || "").trim();
      const password = String(req.body.password || "");
      const district = String(req.body.district || "").trim();
      const block = String(req.body.block || "").trim();
      const officeAddress = String(req.body.office_address || req.body.officeAddress || "").trim();

      if (!name || !agencyName || !mobile || !password || !district || !block || !officeAddress) {
        return res.status(400).json({ success: false, message: "Agent के सभी विवरण भरना आवश्यक है" });
      }
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ success: false, message: "10 अंकों का सही मोबाइल नंबर दर्ज करें" });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "पासवर्ड कम से कम 8 अक्षर का होना चाहिए" });
      }
      const duplicate = db.prepare("SELECT id FROM users WHERE mobile = ?").get(mobile);
      if (duplicate) {
        return res.status(409).json({ success: false, message: "यह मोबाइल नंबर पहले से Registered है" });
      }

      const hash = await bcrypt.hash(password, 10);
      const result = db.prepare(`
        INSERT INTO users (
          name, mobile, password, role, status, district, block,
          agency_name, office_address, is_active
        ) VALUES (?, ?, ?, 'agent', 'approved', ?, ?, ?, ?, 1)
      `).run(name, mobile, hash, district, block, agencyName, officeAddress);

      const userId = makeAgentId(result.lastInsertRowid);
      const referralCode = makeReferralCode(result.lastInsertRowid);
      db.prepare("UPDATE users SET userId = ?, referral_code = ? WHERE id = ?")
        .run(userId, referralCode, result.lastInsertRowid);

      const agent = {
        id: result.lastInsertRowid, userId, name, mobile, role: "agent",
        status: "approved", is_active: 1, district, block,
        agency_name: agencyName, office_address: officeAddress,
        referral_code: referralCode
      };
      return res.status(201).json({
        success: true,
        message: "नया Agent सफलतापूर्वक बनाया गया और Active कर दिया गया।",
        userId,
        agent
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: EDIT AGENT PROFILE / AREA
// --------------------------------------------------

app.patch(
  "/api/admin/agents/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);

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
          AND deleted_at IS NULL
      `).get(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला"
        });
      }

      const nextName = name !== undefined
        ? String(name).trim()
        : agent.name;

      const nextMobile = mobile !== undefined
        ? String(mobile).trim()
        : agent.mobile;

      if (!nextName || !/^[6-9]\d{9}$/.test(nextMobile)) {
        return res.status(400).json({
          success: false,
          message: "नाम या मोबाइल नंबर सही नहीं है"
        });
      }

      const duplicate = db.prepare(`
        SELECT id FROM users
        WHERE mobile = ? AND id != ?
      `).get(nextMobile, id);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "यह मोबाइल नंबर दूसरे User के पास है"
        });
      }

      db.prepare(`
        UPDATE users
        SET name = ?,
            mobile = ?,
            district = ?,
            block = ?,
            agency_name = ?,
            office_address = ?
        WHERE id = ? AND role = 'agent'
      `).run(
        nextName,
        nextMobile,
        district !== undefined ? district : agent.district,
        block !== undefined ? block : agent.block,
        agency_name !== undefined ? agency_name : agent.agency_name,
        office_address !== undefined ? office_address : agent.office_address,
        id
      );

      res.json({
        success: true,
        message: "Agent की जानकारी अपडेट हो गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: AGENT ACTIVE / INACTIVE
// --------------------------------------------------

app.patch(
  "/api/admin/agents/:id/active",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const { is_active } = req.body;

      if (![true, false, 0, 1].includes(is_active)) {
        return res.status(400).json({
          success: false,
          message: "is_active में true, false, 1 या 0 भेजें"
        });
      }

      const agent = db.prepare(`
        SELECT id, status, is_active, deleted_at
        FROM users
        WHERE id = ? AND role = 'agent'
      `).get(id);

      if (!agent || agent.deleted_at) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला या Archive हो चुका है"
        });
      }

      const activeValue = is_active === true || is_active === 1 ? 1 : 0;

      if (activeValue === 1 && agent.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "पहले Agent Application Approve करें"
        });
      }

      db.prepare(`
        UPDATE users SET is_active = ?
        WHERE id = ? AND role = 'agent'
      `).run(activeValue, id);

      res.json({
        success: true,
        is_active: activeValue,
        message: activeValue
          ? "Agent Active कर दिया गया"
          : "Agent Inactive कर दिया गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: ARCHIVE AGENT (SOFT DELETE)
// पुराने Booking और History सुरक्षित रहेंगे
// --------------------------------------------------

app.delete(
  "/api/admin/agents/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);

      const agent = db.prepare(`
        SELECT id, name, mobile
        FROM users
        WHERE id = ?
          AND role = 'agent'
          AND deleted_at IS NULL
      `).get(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Agent नहीं मिला या पहले से Archive है"
        });
      }

      const transaction = db.transaction(() => {
        // केवल चल रही Booking वापस Admin के पास जाएगी
        const activeBookings = db.prepare(`
          SELECT id, status
          FROM bookings
          WHERE assigned_agent_id = ?
            AND status NOT IN ('पूर्ण', 'रद्द', 'Completed', 'Cancelled')
        `).all(id);

        for (const booking of activeBookings) {
          db.prepare(`
            UPDATE bookings
            SET assigned_agent_id = NULL,
                status = 'Admin के पास वापस',
                assignment_due_at = NULL,
                returned_at = CURRENT_TIMESTAMP,
                assignment_mode = 'admin'
            WHERE id = ?
          `).run(booking.id);

          recordAssignment(
            booking.id,
            id,
            null,
            "Agent Archive",
            req.user.id,
            "Agent Archive होने पर Booking Admin को वापस की गई"
          );

          makeNotification(
            "agent_archived_booking",
            "Agent Archive - Booking वापस",
            `${makeBookingId(booking.id)} की Booking Admin के पास वापस आई।`,
            booking.id
          );
        }

        // Hard delete नहीं: सिर्फ Archive
        db.prepare(`
          UPDATE users
          SET is_active = 0,
              deleted_at = CURRENT_TIMESTAMP
          WHERE id = ? AND role = 'agent'
        `).run(id);

        makeNotification(
          "agent_archived",
          "Agent Archive किया गया",
          `${agent.name} (${agent.mobile}) को Archive किया गया।`
        );
      });

      transaction();

      res.json({
        success: true,
        message: "Agent Archive हो गया। पुराने Booking और History सुरक्षित हैं।"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: RESTORE ARCHIVED AGENT
// --------------------------------------------------

app.patch(
  "/api/admin/agents/:id/restore",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);

      const agent = db.prepare(`
        SELECT id, status FROM users
        WHERE id = ? AND role = 'agent'
          AND deleted_at IS NOT NULL
      `).get(id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: "Archived Agent नहीं मिला"
        });
      }

      db.prepare(`
        UPDATE users
        SET deleted_at = NULL,
            is_active = ?
        WHERE id = ?
      `).run(agent.status === "approved" ? 1 : 0, id);

      res.json({
        success: true,
        message: "Agent Restore हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// CUSTOMER: MY BOOKINGS
// --------------------------------------------------

app.get(
  "/api/customer/bookings",
  authenticateToken,
  (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Customer Login आवश्यक है"
        });
      }

      const bookings = db.prepare(`
        SELECT
          b.*,
          u.name AS agent_name,
          u.mobile AS agent_mobile,
          u.agency_name
        FROM bookings b
        LEFT JOIN users u ON u.id = b.assigned_agent_id
        WHERE b.customer_user_id = ?
           OR b.mobile = (
             SELECT mobile FROM users WHERE id = ?
           )
        ORDER BY b.id DESC
      `).all(req.user.id, req.user.id);

      res.json(bookings.map((booking) => ({
        ...booking,
        bookingCode: makeBookingId(booking.id)
      })));
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// CUSTOMER: AREA / PROFILE
// --------------------------------------------------

app.get(
  "/api/customer/profile",
  authenticateToken,
  (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Customer Login आवश्यक है"
        });
      }

      res.json({
        success: true,
        user: getCurrentUser(req.user.id)
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: SERVICES MANAGEMENT
// --------------------------------------------------

app.get(
  "/api/admin/services",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const services = db.prepare(`
        SELECT * FROM services ORDER BY id
      `).all();

      res.json(services);
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
      const { name, unit = "प्रति फुट" } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Service का नाम आवश्यक है"
        });
      }

      const result = db.prepare(`
        INSERT INTO services (name, unit, active)
        VALUES (?, ?, 1)
      `).run(String(name).trim(), unit);

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
      const id = Number(req.params.id);
      const { name, unit, active } = req.body;

      const service = db.prepare(
        "SELECT * FROM services WHERE id = ?"
      ).get(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service नहीं मिली"
        });
      }

      const nextName = name !== undefined
        ? String(name).trim()
        : service.name;

      const nextUnit = unit !== undefined
        ? String(unit).trim()
        : service.unit;

      const nextActive = active !== undefined
        ? (active ? 1 : 0)
        : service.active;

      if (!nextName || !nextUnit) {
        return res.status(400).json({
          success: false,
          message: "Service का नाम और Unit आवश्यक हैं"
        });
      }

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE services
          SET name = ?, unit = ?, active = ?
          WHERE id = ?
        `).run(nextName, nextUnit, nextActive, id);

        // पुराने Rates में भी Service का नाम अपडेट करें
        if (nextName !== service.name) {
          db.prepare(`
            UPDATE rates
            SET service = ?, updated_at = CURRENT_TIMESTAMP
            WHERE service = ?
          `).run(nextName, service.name);
        }
      });

      transaction();

      res.json({
        success: true,
        message: "Service और उससे जुड़े Rates अपडेट हो गए"
      });

    } catch (error) {
      sendError(res, error, 400);
    }
  }
);
// --------------------------------------------------
// ADMIN: DELETE SERVICE
// --------------------------------------------------

app.delete(
  "/api/admin/services/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);

      const service = db.prepare(`
        SELECT * FROM services WHERE id = ?
      `).get(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service नहीं मिली"
        });
      }

      // पुराना Rate या Agent Rate होने पर Delete नहीं करेंगे
      const hasRates = db.prepare(`
        SELECT id FROM rates WHERE service = ? LIMIT 1
      `).get(service.name);

      const hasAgentRates = db.prepare(`
        SELECT id FROM agent_rates
        WHERE service_id = ?
        LIMIT 1
      `).get(id);

      const hasRequests = db.prepare(`
        SELECT id FROM agent_rate_requests
        WHERE service_id = ?
        LIMIT 1
      `).get(id);

      if (hasRates || hasAgentRates || hasRequests) {
        return res.status(400).json({
          success: false,
          message: "इस Service का Rate या Agent Request मौजूद है। इसे Delete करने के बजाय Inactive करें।"
        });
      }

      db.prepare(`
        DELETE FROM services WHERE id = ?
      `).run(id);

      res.json({
        success: true,
        message: "Service Delete हो गई"
      });

    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// ADMIN: RATE MANAGEMENT
// --------------------------------------------------

app.get(
  "/api/admin/rates",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const rates = db.prepare(`
        SELECT * FROM rates
        ORDER BY district, block, service
      `).all();

      res.json(rates);
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.post(
  "/api/admin/rates",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { district, block, service, rate } = req.body;

      if (
        !district ||
        !block ||
        !service ||
        rate === undefined ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "District, Block, Service और सही Rate आवश्यक हैं"
        });
      }

      db.prepare(`
        INSERT INTO rates (district, block, service, rate, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(district, block, service)
        DO UPDATE SET
          rate = excluded.rate,
          updated_at = CURRENT_TIMESTAMP
      `).run(district, block, service, Number(rate));

      res.json({
        success: true,
        message: "Rate Save हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.put(
  "/api/admin/rates/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const { district, block, service, rate } = req.body;

      if (
        !district ||
        !block ||
        !service ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "सभी Rate जानकारी सही भरें"
        });
      }

      const result = db.prepare(`
        UPDATE rates
        SET district = ?,
            block = ?,
            service = ?,
            rate = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        district,
        block,
        service,
        Number(rate),
        Number(req.params.id)
      );

      if (!result.changes) {
        return res.status(404).json({
          success: false,
          message: "Rate नहीं मिला"
        });
      }

      res.json({
        success: true,
        message: "Rate अपडेट हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

app.delete(
  "/api/admin/rates/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const result = db.prepare(
        "DELETE FROM rates WHERE id = ?"
      ).run(Number(req.params.id));

      res.json({
        success: result.changes > 0,
        message: result.changes
          ? "Rate हटा दिया गया"
          : "Rate नहीं मिला"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);


// --------------------------------------------------
// ADMIN: BULK RATE SAVE / UPDATE
// District + Block के सभी Service Rates
// --------------------------------------------------

app.post(
  "/api/admin/rates/bulk",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const district = String(req.body.district || "").trim();
      const block = String(req.body.block || "").trim();
      const rates = req.body.rates;

      if (!district || !block) {
        return res.status(400).json({
          success: false,
          message: "पहले जिला और ब्लॉक चुनें"
        });
      }

      if (!Array.isArray(rates) || rates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "कम से कम एक Service Rate आवश्यक है"
        });
      }

      // सभी Rate की जाँच पहले होगी
      const preparedRates = [];

      for (const item of rates) {
        const service = String(item.service || "").trim();
        const rate = Number(item.rate);

        if (
          !service ||
          item.rate === undefined ||
          item.rate === null ||
          String(item.rate).trim() === "" ||
          !Number.isFinite(rate) ||
          rate < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${service || "एक Service"} का Rate सही नहीं है`
          });
        }

        preparedRates.push({
          service,
          rate
        });
      }

      // एक ही District + Block + Service का Rate Update होगा
      const saveRate = db.prepare(`
        INSERT INTO rates (
          district,
          block,
          service,
          rate,
          updated_at
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(district, block, service)
        DO UPDATE SET
          rate = excluded.rate,
          updated_at = CURRENT_TIMESTAMP
      `);

      // सभी Rates एक साथ Save होंगे
      const transaction = db.transaction((items) => {
        for (const item of items) {
          saveRate.run(
            district,
            block,
            item.service,
            item.rate
          );
        }

        return items.length;
      });

      const count = transaction(preparedRates);

      // Save होने के बाद उसी Location के सभी Rates वापस भेजें
      const savedRates = db.prepare(`
        SELECT *
        FROM rates
        WHERE district = ?
          AND block = ?
        ORDER BY service
      `).all(district, block);

      return res.json({
        success: true,
        count,
        district,
        block,
        rates: savedRates,
        message: `${count} Service के Rate सफलतापूर्वक Save / Update हो गए`
      });

    } catch (error) {
      console.error("BULK RATE SAVE ERROR:", error);
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: PROFILE
// --------------------------------------------------

app.get(
  "/api/agent/profile",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const user = getCurrentUser(req.user.id);

      res.json({
        success: true,
        user
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: CUSTOMERS
// --------------------------------------------------

app.get(
  "/api/agent/customers",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const customers = db.prepare(`
        SELECT DISTINCT
          b.name,
          b.mobile,
          b.district,
          b.block,
          b.village,
          b.address
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
// AGENT: REQUEST PROFILE CHANGE
// --------------------------------------------------

app.post(
  "/api/agent/profile-request",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const agent = getCurrentUser(req.user.id);

      const {
        name,
        mobile,
        agency_name,
        office_address
      } = req.body;

      const newMobile = mobile !== undefined
        ? String(mobile).trim()
        : agent.mobile;

      if (!/^[6-9]\d{9}$/.test(newMobile)) {
        return res.status(400).json({
          success: false,
          message: "मोबाइल नंबर सही नहीं है"
        });
      }

      const duplicate = db.prepare(`
        SELECT id FROM users
        WHERE mobile = ? AND id != ?
      `).get(newMobile, agent.id);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "यह मोबाइल नंबर पहले से उपयोग में है"
        });
      }

      const pendingRequest = db.prepare(`
        SELECT id FROM agent_profile_requests
        WHERE agent_id = ? AND status = 'pending'
      `).get(agent.id);

      if (pendingRequest) {
        return res.status(409).json({
          success: false,
          message: "आपकी एक Profile Request पहले से Pending है"
        });
      }

      const result = db.prepare(`
        INSERT INTO agent_profile_requests
        (
          agent_id,
          old_name,
          new_name,
          old_mobile,
          new_mobile,
          old_agency_name,
          new_agency_name,
          old_office_address,
          new_office_address
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agent.id,
        agent.name,
        name !== undefined ? name : agent.name,
        agent.mobile,
        newMobile,
        agent.agency_name,
        agency_name !== undefined ? agency_name : agent.agency_name,
        agent.office_address,
        office_address !== undefined ? office_address : agent.office_address
      );

      makeNotification(
        "agent_profile_request",
        "Agent Profile Request",
        `${agent.name} ने Profile Update Request भेजी है।`
      );

      res.status(201).json({
        success: true,
        requestId: result.lastInsertRowid,
        message: "Profile Request Admin को भेज दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: AGENT PROFILE REQUEST LIST
// --------------------------------------------------

app.get(
  "/api/admin/agent-profile-requests",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT
          r.*,
          u.userId,
          u.name AS agent_current_name,
          u.mobile AS agent_current_mobile
        FROM agent_profile_requests r
        JOIN users u ON u.id = r.agent_id
        ORDER BY r.id DESC
      `).all();

      res.json(requests);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: APPROVE / REJECT AGENT PROFILE REQUEST
// --------------------------------------------------

app.patch(
  "/api/admin/agent-profile-requests/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, admin_note } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status approved या rejected होना चाहिए"
        });
      }

      const request = db.prepare(`
        SELECT * FROM agent_profile_requests
        WHERE id = ? AND status = 'pending'
      `).get(id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending Request नहीं मिली"
        });
      }

      const transaction = db.transaction(() => {
        if (status === "approved") {
          const duplicate = db.prepare(`
            SELECT id FROM users
            WHERE mobile = ? AND id != ?
          `).get(request.new_mobile, request.agent_id);

          if (duplicate) {
            throw new Error("नया मोबाइल नंबर किसी अन्य User के पास है");
          }

          db.prepare(`
            UPDATE users
            SET name = ?,
                mobile = ?,
                agency_name = ?,
                office_address = ?
            WHERE id = ? AND role = 'agent'
              AND deleted_at IS NULL
          `).run(
            request.new_name,
            request.new_mobile,
            request.new_agency_name,
            request.new_office_address,
            request.agent_id
          );
        }

        db.prepare(`
          UPDATE agent_profile_requests
          SET status = ?,
              admin_note = ?,
              reviewed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, admin_note || null, id);
      });

      transaction();

      res.json({
        success: true,
        message: status === "approved"
          ? "Agent Profile Update कर दी गई"
          : "Profile Request Reject कर दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: MY BOOKINGS
// --------------------------------------------------

app.get(
  "/api/agent/bookings",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const bookings = db.prepare(`
        SELECT *
        FROM bookings
        WHERE assigned_agent_id = ?
        ORDER BY id DESC
      `).all(req.user.id);

      res.json(bookings.map((booking) => ({
        ...booking,
        bookingCode: makeBookingId(booking.id)
      })));
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: ACCEPT BOOKING
// --------------------------------------------------

app.patch(
  "/api/agent/bookings/:id/accept",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);

      // Accept करने से पहले deadline जाँचें; expired booking Admin को वापस जाएगी।
      returnExpiredBookings();

      const booking = db.prepare(`
        SELECT * FROM bookings
        WHERE id = ? AND assigned_agent_id = ?
      `).get(id, req.user.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "यह Booking आपके नाम पर नहीं है"
        });
      }

      if (booking.status !== "एजेंट नियुक्त") {
        return res.status(400).json({
          success: false,
          message: "यह Booking अब स्वीकार नहीं की जा सकती"
        });
      }

      db.prepare(`
        UPDATE bookings
        SET status = 'एजेंट द्वारा स्वीकार',
            assignment_due_at = NULL
        WHERE id = ?
      `).run(id);

      recordAssignment(
        id,
        req.user.id,
        req.user.id,
        "Agent Accepted",
        req.user.id,
        "Agent ने Booking स्वीकार की"
      );

      res.json({
        success: true,
        message: "Booking स्वीकार हो गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: REJECT / RETURN BOOKING
// --------------------------------------------------

app.patch(
  "/api/agent/bookings/:id/reject",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const { note } = req.body;

      const booking = db.prepare(`
        SELECT * FROM bookings
        WHERE id = ? AND assigned_agent_id = ?
      `).get(id, req.user.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "यह Booking आपके नाम पर नहीं है"
        });
      }

      if (["पूर्ण", "रद्द"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: "यह Booking पहले ही बंद हो चुकी है"
        });
      }

      db.prepare(`
        UPDATE bookings
        SET assigned_agent_id = NULL,
            status = 'Admin के पास वापस',
            returned_at = CURRENT_TIMESTAMP,
            assignment_due_at = NULL,
            assignment_mode = 'admin'
        WHERE id = ?
      `).run(id);

      recordAssignment(
        id,
        req.user.id,
        null,
        "Agent Returned",
        req.user.id,
        note || "Agent ने Booking वापस की"
      );

      makeNotification(
        "agent_booking_returned",
        "Agent ने Booking वापस की",
        `${makeBookingId(id)} को Agent ने Admin के पास वापस किया।`,
        id
      );

      res.json({
        success: true,
        message: "Booking Admin के पास वापस कर दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: UPDATE WORK STATUS
// --------------------------------------------------

app.patch(
  "/api/agent/bookings/:id/status",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, note } = req.body;

      const allowedStatuses = [
        "एजेंट द्वारा स्वीकार",
        "कार्य शुरू",
        "कार्य प्रगति पर",
        "पूर्ण",
        "रद्द"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Booking Status सही नहीं है"
        });
      }

      const booking = db.prepare(`
        SELECT * FROM bookings
        WHERE id = ? AND assigned_agent_id = ?
      `).get(id, req.user.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking नहीं मिली"
        });
      }

      if (["पूर्ण", "रद्द"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: "यह Booking पहले ही बंद हो चुकी है"
        });
      }

      db.prepare(`
        UPDATE bookings SET status = ? WHERE id = ?
      `).run(status, id);

      if (status === "पूर्ण" || status === "रद्द") {
        db.prepare(`
          UPDATE bookings
          SET assignment_due_at = NULL
          WHERE id = ?
        `).run(id);
      }

      recordAssignment(
        id,
        req.user.id,
        req.user.id,
        "Work Status Updated",
        req.user.id,
        note || status
      );

      makeNotification(
        "booking_status",
        "Booking Status Update",
        `${makeBookingId(id)} का Status: ${status}`,
        id
      );

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
// AGENT: RATE LIST
// --------------------------------------------------

app.get(
  "/api/agent/rates",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const rates = db.prepare(`
        SELECT
          ar.*,
          s.name AS service_name
        FROM agent_rates ar
        JOIN services s ON s.id = ar.service_id
        WHERE ar.agent_id = ?
        ORDER BY s.name
      `).all(req.user.id);

      res.json(rates);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// AGENT: REQUEST RATE CHANGE
// --------------------------------------------------

app.post(
  "/api/agent/rate-requests",
  authenticateToken,
  agentOnly,
  (req, res) => {
    try {
      const {
        service_id,
        requested_rate,
        unit
      } = req.body;

      if (
        !service_id ||
        !Number.isFinite(Number(requested_rate)) ||
        Number(requested_rate) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Service और सही Rate आवश्यक हैं"
        });
      }

      const service = db.prepare(`
        SELECT * FROM services
        WHERE id = ? AND active = 1
      `).get(Number(service_id));

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service नहीं मिली"
        });
      }

      const agent = getCurrentUser(req.user.id);

      const existing = db.prepare(`
        SELECT rate FROM agent_rates
        WHERE agent_id = ? AND service_id = ?
      `).get(req.user.id, Number(service_id));

      const result = db.prepare(`
        INSERT INTO agent_rate_requests
        (agent_id, service_id, old_rate, requested_rate, unit)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        Number(service_id),
        existing?.rate ?? null,
        Number(requested_rate),
        unit || service.unit
      );

      makeNotification(
        "agent_rate_request",
        "Agent Rate Request",
        `${agent?.name || "Agent"} ने ${service.name} का नया Rate मांगा है।`
      );

      res.status(201).json({
        success: true,
        requestId: result.lastInsertRowid,
        message: "Rate Request Admin को भेज दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: AGENT RATE REQUESTS
// --------------------------------------------------

app.get(
  "/api/admin/agent-rate-requests",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT
          r.*,
          u.name AS agent_name,
          u.mobile AS agent_mobile,
          u.district,
          u.block,
          s.name AS service_name
        FROM agent_rate_requests r
        JOIN users u ON u.id = r.agent_id
        JOIN services s ON s.id = r.service_id
        ORDER BY r.id DESC
      `).all();

      res.json(requests);
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: APPROVE / REJECT AGENT RATE REQUEST
// --------------------------------------------------

app.patch(
  "/api/admin/agent-rate-requests/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status सही नहीं है"
        });
      }

      const request = db.prepare(`
        SELECT r.*, u.district, u.block
        FROM agent_rate_requests r
        JOIN users u ON u.id = r.agent_id
        WHERE r.id = ? AND r.status = 'pending'
      `).get(id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Pending Rate Request नहीं मिली"
        });
      }

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE agent_rate_requests
          SET status = ?
          WHERE id = ?
        `).run(status, id);

        if (status === "approved") {
          const agent = db.prepare(`
            SELECT status, is_active, deleted_at
            FROM users WHERE id = ?
          `).get(request.agent_id);

          if (
            !agent ||
            agent.status !== "approved" ||
            Number(agent.is_active) !== 1 ||
            agent.deleted_at
          ) {
            throw new Error("Agent Active और Approved नहीं है");
          }

          db.prepare(`
            INSERT INTO agent_rates
            (agent_id, district, block, service_id, rate, unit, status)
            VALUES (?, ?, ?, ?, ?, ?, 'approved')
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
          ? "Agent Rate Approve और Update हो गया"
          : "Agent Rate Request Reject हो गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: ASSIGN BOOKING TO AGENT
// --------------------------------------------------

app.patch(
  "/api/admin/bookings/:id/assign",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      returnExpiredBookings();

      const bookingId = Number(req.params.id);
      const agentId = Number(req.body.agent_id);

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: "Agent चुनना आवश्यक है"
        });
      }

      const booking = db.prepare(`
        SELECT * FROM bookings WHERE id = ?
      `).get(bookingId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking नहीं मिली"
        });
      }

      if (["पूर्ण", "रद्द"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: "बंद Booking को Assign नहीं किया जा सकता"
        });
      }

      const agent = db.prepare(`
        SELECT * FROM users
        WHERE id = ?
          AND role = 'agent'
          AND status = 'approved'
          AND is_active = 1
          AND deleted_at IS NULL
      `).get(agentId);

      if (!agent) {
        return res.status(400).json({
          success: false,
          message: "Agent Approved और Active होना चाहिए"
        });
      }

      const oldAgentId = booking.assigned_agent_id || null;

      db.prepare(`
        UPDATE bookings
        SET assigned_agent_id = ?,
            status = 'एजेंट नियुक्त',
            assigned_at = CURRENT_TIMESTAMP,
            assignment_due_at = datetime('now', '+24 hours'),
            returned_at = NULL,
            assignment_mode = 'admin',
            assignment_count = COALESCE(assignment_count, 0) + 1
        WHERE id = ?
      `).run(agentId, bookingId);

      recordAssignment(
        bookingId,
        oldAgentId,
        agentId,
        "Admin Assigned",
        req.user.id,
        "Admin द्वारा Agent नियुक्त"
      );

      makeNotification(
        "booking_assigned",
        "Booking Agent को दी गई",
        `${makeBookingId(bookingId)} की Booking ${agent.name} को दी गई।`,
        bookingId
      );

      res.json({
        success: true,
        message: "Booking Agent को Assign हो गई",
        agent: {
          id: agent.id,
          name: agent.name,
          mobile: agent.mobile
        }
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: UNASSIGN BOOKING
// --------------------------------------------------

app.patch(
  "/api/admin/bookings/:id/unassign",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const bookingId = Number(req.params.id);

      const booking = db.prepare(`
        SELECT * FROM bookings WHERE id = ?
      `).get(bookingId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking नहीं मिली"
        });
      }

      if (!booking.assigned_agent_id) {
        return res.status(400).json({
          success: false,
          message: "इस Booking पर कोई Agent नियुक्त नहीं है"
        });
      }

      const oldAgentId = booking.assigned_agent_id;

      db.prepare(`
        UPDATE bookings
        SET assigned_agent_id = NULL,
            status = 'Admin के पास वापस',
            assignment_due_at = NULL,
            returned_at = CURRENT_TIMESTAMP,
            assignment_mode = 'admin'
        WHERE id = ?
      `).run(bookingId);

      recordAssignment(
        bookingId,
        oldAgentId,
        null,
        "Admin Unassigned",
        req.user.id,
        "Admin ने Agent को हटाया"
      );

      res.json({
        success: true,
        message: "Booking Agent से हटाकर Admin के पास वापस कर दी गई"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// PUBLIC: BOOKING STATUS SEARCH
// Booking ID + Registered Mobile Number
// --------------------------------------------------

app.post("/api/public/booking-status", (req, res) => {
  try {
    const bookingId = String(req.body.bookingId || "")
      .trim()
      .toUpperCase();

    const mobile = String(req.body.mobile || "")
      .replace(/\D/g, "");

    if (!/^KB\d{1,10}$/.test(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "सही Booking ID दर्ज करें। उदाहरण: KB000001"
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "सही 10 अंकों का मोबाइल नंबर दर्ज करें"
      });
    }

    // KB000001 से वास्तविक Booking ID निकालें
    const numericId = Number(bookingId.slice(2));

    const booking = db.prepare(`
      SELECT
        b.id,
        b.name,
        b.mobile,
        b.service,
        b.district,
        b.block,
        b.status,
        b.created_at,
        b.payment_verified,
        b.assigned_agent_id,
        u.name AS agent_name,
        u.mobile AS agent_mobile,
        u.agency_name
      FROM bookings b
      LEFT JOIN users u
        ON u.id = b.assigned_agent_id
      WHERE b.id = ?
        AND b.mobile = ?
      LIMIT 1
    `).get(numericId, mobile);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking ID या Registered Mobile Number सही नहीं है"
      });
    }

    return res.json({
      success: true,
      booking: {
        bookingCode: makeBookingId(booking.id),
        customerName: booking.name,
        service: booking.service,
        district: booking.district,
        block: booking.block,
        status: booking.status,
        bookingDate: booking.created_at,
        paymentVerified: Number(booking.payment_verified) === 1,
        agent: booking.assigned_agent_id
          ? {
              name: booking.agent_name,
              mobile: booking.agent_mobile,
              agencyName: booking.agency_name
            }
          : null
      }
    });

  } catch (error) {
    console.error("Booking Status Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Booking Status देखने में समस्या हुई"
    });
  }
});

// --------------------------------------------------
// REFERRAL ROUTES
// referral.js में कोई बदलाव नहीं करना है
// --------------------------------------------------

registerReferralRoutes(
  app,
  db,
  authenticateToken,
  adminOnly
);
// --------------------------------------------------
// PUBLIC: GET BLOCK BANNER
// --------------------------------------------------

app.get("/api/public/block-banner", (req, res) => {
  try {
    const district = String(req.query.district || "").trim();
    const block = String(req.query.block || "").trim();

    if (!district || !block) {
      return res.status(400).json({
        success: false,
        message: "District और Block आवश्यक हैं"
      });
    }

    const banner = db.prepare(`
      SELECT district, block, image_data, image_type, updated_at
      FROM block_banners
      WHERE district = ? AND block = ?
    `).get(district, block);

    res.json({
      success: true,
      banner: banner || null
    });
  } catch (error) {
    sendError(res, error);
  }
});

// --------------------------------------------------
// ADMIN: ALL BLOCK BANNERS
// --------------------------------------------------

app.get(
  "/api/admin/block-banners",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const banners = db.prepare(`
        SELECT id, district, block, image_type, updated_at
        FROM block_banners
        ORDER BY district, block
      `).all();

      res.json({
        success: true,
        banners
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: UPLOAD / UPDATE BLOCK BANNER
// --------------------------------------------------

app.post(
  "/api/admin/block-banners",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const district = String(req.body.district || "").trim();
      const block = String(req.body.block || "").trim();
      const imageData = String(req.body.imageData || "").trim();

      if (!district || !block || !imageData) {
        return res.status(400).json({
          success: false,
          message: "District, Block और Banner Image आवश्यक हैं"
        });
      }

      if (imageData.length > 750000) {
        return res.status(400).json({
          success: false,
          message: "Image का आकार अधिक है। 500 KB से छोटी Image चुनें।"
        });
      }

      const match = imageData.match(
        /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/
      );

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "केवल PNG, JPG या WEBP Image स्वीकार है"
        });
      }

      const imageType = match[1];

      db.prepare(`
        INSERT INTO block_banners (
          district,
          block,
          image_data,
          image_type,
          updated_at
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(district, block)
        DO UPDATE SET
          image_data = excluded.image_data,
          image_type = excluded.image_type,
          updated_at = CURRENT_TIMESTAMP
      `).run(district, block, imageData, imageType);

      res.json({
        success: true,
        message: `${district} - ${block} का Banner Save हो गया`
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

// --------------------------------------------------
// ADMIN: DELETE BLOCK BANNER
// --------------------------------------------------

app.delete(
  "/api/admin/block-banners/:id",
  authenticateToken,
  adminOnly,
  (req, res) => {
    try {
      const result = db.prepare(`
        DELETE FROM block_banners
        WHERE id = ?
      `).run(Number(req.params.id));

      if (!result.changes) {
        return res.status(404).json({
          success: false,
          message: "Banner नहीं मिला"
        });
      }

      res.json({
        success: true,
        message: "Block Banner Delete हो गया"
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);
// --------------------------------------------------
// 404 ROUTE
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route नहीं मिला",
    path: req.originalUrl
  });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error"
  });
});

// --------------------------------------------------
// SERVER START
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------------");
  console.log("borewells Mitra SERVER STARTED");
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log("--------------------------------------");
});