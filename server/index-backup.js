import registerReferralRoutes from "./referral.js";
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dirname, join } from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_BMM_SECRET_BEFORE_PRODUCTION";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const dbPath = join(__dirname, "borewell-mitra.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("Database path:", dbPath);

// ==================================================
// DATABASE
// ==================================================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 mobile TEXT UNIQUE NOT NULL,
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
 village TEXT NOT NULL,
 service TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'नई बुकिंग',
 assigned_agent_id INTEGER,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(assigned_agent_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rates (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 district TEXT NOT NULL,
 block TEXT NOT NULL,
 service TEXT NOT NULL,
 rate REAL NOT NULL DEFAULT 0,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(district,block,service)
);

CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL UNIQUE,
 unit TEXT NOT NULL DEFAULT 'प्रति फुट',
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_rates (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 agent_id INTEGER NOT NULL,
 district TEXT NOT NULL,
 block TEXT NOT NULL,
 service_id INTEGER NOT NULL,
 rate REAL NOT NULL,
 unit TEXT NOT NULL DEFAULT 'प्रति फुट',
 status TEXT NOT NULL DEFAULT 'pending',
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(agent_id) REFERENCES users(id),
 FOREIGN KEY(service_id) REFERENCES services(id),
 UNIQUE(agent_id,service_id)
);

CREATE TABLE IF NOT EXISTS agent_rate_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 agent_id INTEGER NOT NULL,
 service_id INTEGER NOT NULL,
 old_rate REAL,
 requested_rate REAL NOT NULL,
 unit TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(agent_id) REFERENCES users(id),
 FOREIGN KEY(service_id) REFERENCES services(id)
);
`);

// ==================================================
// DATABASE MIGRATION
// ==================================================

function addColumnIfMissing(table, column, definition) {
 const columns = db.prepare(`PRAGMA table_info(${table})`).all();

 if (!columns.some(c => c.name === column)) {
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
 }
}

[
 ["users","userId","TEXT"],
 ["users","referral_code","TEXT"],
 ["users","referred_by","INTEGER"],
 ["users","district","TEXT"],
 ["users","block","TEXT"],
 ["users","agency_name","TEXT"],
 ["users","referred_agent_id","INTEGER"],

 ["bookings","customer_user_id","INTEGER"],
 ["bookings","rate_at_booking","REAL"],
 ["bookings","rate_unit","TEXT"],
 ["bookings","assigned_at","TEXT"],
 ["bookings","assignment_due_at","TEXT"],
 ["bookings","returned_at","TEXT"],
 ["bookings","assignment_mode","TEXT"],
 ["bookings","assignment_count","INTEGER NOT NULL DEFAULT 0"],
 ["bookings","tehsil","TEXT"],
 ["bookings","address","TEXT"],
 ["bookings","referral_partner_id","INTEGER"]
].forEach(([table,column,definition]) => {
 addColumnIfMissing(table,column,definition);
});

// ==================================================
// INDEXES
// ==================================================

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_userId ON users(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_referred_agent ON users(referred_agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent ON bookings(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_due ON bookings(assignment_due_at);
`);

// पुराने User IDs सुरक्षित रखें
const missingUsers = db.prepare(`
 SELECT id FROM users WHERE userId IS NULL OR userId=''
`).all();

const migrateUsers = db.transaction(() => {
 for (const item of missingUsers) {
  db.prepare(`UPDATE users SET userId=? WHERE id=?`)
   .run(`BMM${String(item.id).padStart(6,"0")}`,item.id);
 }
});

migrateUsers();

// ==================================================
// HELPERS
// ==================================================

function makeAgentId(id) {
 return `KA${String(id).padStart(5,"0")}`;
}

function makeCustomerId(id) {
 return `KC${String(id).padStart(5,"0")}`;
}

function makeBookingId(id) {
 return `KB${String(id).padStart(6,"0")}`;
}

function makeReferralCode(id) {
 return makeAgentId(id);
}

function sendError(res,error,message="सर्वर त्रुटि हुई।") {
 console.error(error);
 return res.status(500).json({success:false,message});
}

function authenticateToken(req,res,next) {
 const header=req.headers.authorization || "";
 const token=header.startsWith("Bearer ")?header.slice(7):"";

 if (!token) {
  return res.status(401).json({
   success:false,
   message:"Login आवश्यक है।"
  });
 }

 try {
  req.user=jwt.verify(token,JWT_SECRET);
  next();
 } catch {
  return res.status(401).json({
   success:false,
   message:"Login समाप्त हो गया है। दोबारा Login करें।"
  });
 }
}

function adminOnly(req,res,next) {
 if(req.user?.role!=="admin") {
  return res.status(403).json({
   success:false,
   message:"यह सुविधा केवल Admin के लिए है।"
  });
 }
 next();
}

function agentOnly(req,res,next) {
 if(req.user?.role!=="agent") {
  return res.status(403).json({
   success:false,
   message:"यह सुविधा केवल Agent के लिए है।"
  });
 }
 next();
}

function getCurrentUser(req) {
 return db.prepare(`SELECT * FROM users WHERE id=?`).get(req.user.id);
}

// केवल जवाब न देने वाली नियुक्तियाँ 72 घंटे बाद Admin के पास लौटेंगी।
function returnExpiredBookings() {
 return db.prepare(`
  UPDATE bookings
  SET assigned_agent_id=NULL,
      status='समय समाप्त - Admin के पास वापस',
      returned_at=CURRENT_TIMESTAMP,
      assignment_due_at=NULL,
      assignment_mode='admin'
  WHERE assigned_agent_id IS NOT NULL
    AND assignment_due_at IS NOT NULL
    AND datetime(assignment_due_at)<=datetime('now')
    AND status='एजेंट नियुक्त'
 `).run();
}

// ==================================================
// ADMIN ACCOUNT
// ==================================================

const ADMIN_MOBILE=process.env.ADMIN_MOBILE || "9098520283";
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD;

const existingAdmin=db.prepare(`
 SELECT id FROM users WHERE mobile=?
`).get(ADMIN_MOBILE);

if(!existingAdmin) {
 if(!ADMIN_PASSWORD || ADMIN_PASSWORD.length<8) {
  throw new Error("पहली बार Admin बनाने के लिए ADMIN_PASSWORD में कम से कम 8 अक्षरों का पासवर्ड सेट करें।");
 }

 db.prepare(`
  INSERT INTO users(name,mobile,password,role,status,userId)
  VALUES(?,?,?,'admin','approved','ADMIN')
 `).run(
  "Borewell Mitra Admin",
  ADMIN_MOBILE,
  bcrypt.hashSync(ADMIN_PASSWORD,10)
 );
} else {
 db.prepare(`
  UPDATE users SET role='admin',status='approved',userId='ADMIN' WHERE id=?
 `).run(existingAdmin.id);
}

// ==================================================
// HEALTH
// ==================================================

app.get("/api/health",(req,res)=>{
 res.json({
  success:true,
  message:"Borewell Mitra MP API चालू है।"
 });
});

// ==================================================
// REGISTER
// ==================================================

app.post("/api/auth/register",(req,res)=>{
 try {
  const name=String(req.body.name||"").trim();
  const mobile=String(req.body.mobile||"").trim();
  const password=String(req.body.password||"");
  const referralCode=String(req.body.referralCode||"").trim().toUpperCase();
  const requestedRole=String(req.body.role||"customer");
  const district=String(req.body.district||"").trim();
  const block=String(req.body.block||"").trim();
  const agencyName=String(req.body.agencyName||"").trim();

  if(!name || !/^\d{10}$/.test(mobile) || password.length<8) {
   return res.status(400).json({
    success:false,
    message:"नाम, सही 10 अंकों का मोबाइल और कम से कम 8 अक्षरों का पासवर्ड भरें।"
   });
  }

  if(!["customer","agent"].includes(requestedRole)) {
   return res.status(400).json({
    success:false,
    message:"Registration Role सही नहीं है।"
   });
  }

  if(requestedRole==="agent" && (!district||!block)) {
   return res.status(400).json({
    success:false,
    message:"Agent के लिए जिला और ब्लॉक आवश्यक हैं।"
   });
  }

  if(db.prepare(`SELECT id FROM users WHERE mobile=?`).get(mobile)) {
   return res.status(409).json({
    success:false,
    message:"यह मोबाइल नंबर पहले से रजिस्टर है।"
   });
  }

  let referralPartner=null;
  let referringAgent=null;

  if(referralCode) {
   referringAgent=db.prepare(`
    SELECT id,district,block FROM users
    WHERE UPPER(referral_code)=? AND role='agent' AND status='approved'
   `).get(referralCode);

   if(!referringAgent) {
    referralPartner=db.prepare(`
     SELECT id FROM users
     WHERE UPPER(referral_code)=? AND role='referral' AND status='approved'
    `).get(referralCode);
   }

   if(!referringAgent&&!referralPartner) {
    return res.status(400).json({
     success:false,
     message:"Referral Link या Code मान्य नहीं है।"
    });
   }
  }

  const result=db.prepare(`
   INSERT INTO users
   (name,mobile,password,role,status,district,block,agency_name,referred_by,referred_agent_id)
   VALUES(?,?,?,?,?,?,?,?,?,?)
  `).run(
   name,
   mobile,
   bcrypt.hashSync(password,10),
   requestedRole,
   "pending",
   requestedRole==="agent"?district:null,
   requestedRole==="agent"?block:null,
   requestedRole==="agent"?agencyName:null,
   referralPartner?.id??null,
   requestedRole==="customer"?referringAgent?.id??null:null
  );

  const id=Number(result.lastInsertRowid);
  const userId=requestedRole==="agent"?makeAgentId(id):makeCustomerId(id);

  db.prepare(`UPDATE users SET userId=? WHERE id=?`).run(userId,id);

  res.status(201).json({
   success:true,
   message:"Registration सफल। Admin की मंजूरी के बाद Login करें।",
   user:{
    id,
    userId,
    name,
    mobile,
    role:requestedRole,
    status:"pending",
    district:requestedRole==="agent"?district:null,
    block:requestedRole==="agent"?block:null
   }
  });

 } catch(error) {
  sendError(res,error,"Registration में त्रुटि हुई।");
 }
});

// ==================================================
// LOGIN
// ==================================================

app.post("/api/auth/login",(req,res)=>{
 try {
  const identifier=String(req.body.login||req.body.mobile||"").trim();
  const password=String(req.body.password||"");

  if(!identifier||!password) {
   return res.status(400).json({
    success:false,
    message:"User ID/मोबाइल और पासवर्ड भरें।"
   });
  }

  const user=db.prepare(`
   SELECT * FROM users WHERE mobile=? OR userId=? LIMIT 1
  `).get(identifier,identifier);

  if(!user||!bcrypt.compareSync(password,user.password)) {
   return res.status(401).json({
    success:false,
    message:"User ID/मोबाइल या पासवर्ड गलत है।"
   });
  }

  if(user.role!=="admin"&&user.status!=="approved") {
   return res.status(403).json({
    success:false,
    message:"आपका अकाउंट Admin की मंजूरी की प्रतीक्षा में है।"
   });
  }

  const token=jwt.sign(
   {id:user.id,role:user.role},
   JWT_SECRET,
   {expiresIn:"7d"}
  );

  res.json({
   success:true,
   message:"Login सफल।",
   token,
   user:{
    id:user.id,
    userId:user.userId,
    name:user.name,
    mobile:user.mobile,
    role:user.role,
    status:user.status,
    district:user.district,
    block:user.block,
    agencyName:user.agency_name,
    referralCode:user.referral_code
   }
  });

 } catch(error) {
  sendError(res,error,"Login में त्रुटि हुई।");
 }
});

// ==================================================
// PUBLIC SERVICES
// ==================================================

app.get("/api/services",(req,res)=>{
 try {
  const services=db.prepare(`
   SELECT id,name,unit FROM services WHERE active=1 ORDER BY name
  `).all();

  res.json({success:true,services});
 } catch(error) {
  sendError(res,error,"Services लोड नहीं हुईं।");
 }
});

// ==================================================
// PUBLIC RATES
// ==================================================

app.get("/api/rates",(req,res)=>{
 try {
  const district=String(req.query.district||"").trim();
  const block=String(req.query.block||"").trim();
  const agentCode=String(req.query.agent||"").trim().toUpperCase();

  if(!district||!block) {
   return res.status(400).json({
    success:false,
    message:"जिला और ब्लॉक चुनें।"
   });
  }

  let agent=null;

  if(agentCode) {
   agent=db.prepare(`
    SELECT id,district,block FROM users
    WHERE UPPER(userId)=? AND role='agent' AND status='approved'
   `).get(agentCode);

   if(!agent||agent.district!==district||agent.block!==block) {
    return res.status(400).json({
     success:false,
     message:"इस ब्लॉक के लिए Agent उपलब्ध नहीं है।"
    });
   }
  }

  let rates;

  if(agent) {
   rates=db.prepare(`
    SELECT s.id AS service_id,s.name AS service,ar.rate,ar.unit
    FROM agent_rates ar JOIN services s ON s.id=ar.service_id
    WHERE ar.agent_id=? AND ar.district=? AND ar.block=?
      AND ar.status='approved' AND s.active=1 ORDER BY s.name
   `).all(agent.id,district,block);
  } else {
   rates=db.prepare(`
    SELECT s.id AS service_id,s.name AS service,r.rate,s.unit
    FROM rates r JOIN services s ON s.name=r.service
    WHERE r.district=? AND r.block=? AND s.active=1 ORDER BY s.name
   `).all(district,block);
  }

  res.json({success:true,rates});

 } catch(error) {
  sendError(res,error,"रेट लोड नहीं हो सके।");
 }
});

// ==================================================
// PUBLIC AGENTS
// ==================================================

app.get("/api/agents/public",(req,res)=>{
 try {
  const district=String(req.query.district||"").trim();
  const block=String(req.query.block||"").trim();

  let sql=`
   SELECT u.id,u.userId,u.name,u.district,u.block,u.agency_name,
          s.name AS service,ar.rate,ar.unit
   FROM users u
   LEFT JOIN agent_rates ar ON ar.agent_id=u.id AND ar.status='approved'
   LEFT JOIN services s ON s.id=ar.service_id AND s.active=1
   WHERE u.role='agent' AND u.status='approved'
  `;

  const params=[];

  if(district){sql+=" AND u.district=?";params.push(district);}
  if(block){sql+=" AND u.block=?";params.push(block);}

  sql+=" ORDER BY u.district,u.block,u.name";

  const rows=db.prepare(sql).all(...params);
  const map=new Map();

  for(const row of rows) {
   if(!map.has(row.id)) {
    map.set(row.id,{
     id:row.id,
     userId:row.userId,
     name:row.name,
     district:row.district,
     block:row.block,
     agencyName:row.agency_name||"",
     rates:[]
    });
   }

   if(row.service&&row.rate!==null) {
    map.get(row.id).rates.push({
     service:row.service,
     rate:row.rate,
     unit:row.unit
    });
   }
  }

  res.json({success:true,agents:Array.from(map.values())});

 } catch(error) {
  sendError(res,error,"Public Agent List लोड नहीं हुई।");
 }
});

// ==================================================
// CREATE BOOKING
// ==================================================

app.post("/api/bookings",(req,res)=>{
 try {
  const name=String(req.body.name||"").trim();
  const mobile=String(req.body.mobile||"").trim();
  const district=String(req.body.district||"").trim();
  const block=String(req.body.block||"").trim();
  const village=String(req.body.village||"").trim();
  const service=String(req.body.service||"").trim();

  if(!name||!/^\d{10}$/.test(mobile)||!district||!block||!village||!service) {
   return res.status(400).json({
    success:false,
    message:"बुकिंग के सभी विवरण सही-सही भरें।"
   });
  }

  const activeService=db.prepare(`
   SELECT id,name,unit FROM services WHERE name=? AND active=1
  `).get(service);

  const customer=db.prepare(`
   SELECT id,referred_agent_id,referred_by
   FROM users WHERE mobile=? AND role='customer'
  `).get(mobile);

  let rate=null,rateUnit=null;

  if(customer?.referred_agent_id&&activeService) {
   const agent=db.prepare(`
    SELECT id,district,block FROM users
    WHERE id=? AND role='agent' AND status='approved'
   `).get(customer.referred_agent_id);

   if(agent&&agent.district===district&&agent.block===block) {
    const personal=db.prepare(`
     SELECT rate,unit FROM agent_rates
     WHERE agent_id=? AND service_id=? AND status='approved'
    `).get(agent.id,activeService.id);

    rate=personal?.rate??null;
    rateUnit=personal?.unit??null;
   }
  }

  if(rate===null&&activeService) {
   const standard=db.prepare(`
    SELECT rate FROM rates WHERE district=? AND block=? AND service=?
   `).get(district,block,service);

   rate=standard?.rate??null;
   rateUnit=activeService.unit;
  }

  const result=db.prepare(`
   INSERT INTO bookings
   (
    name,mobile,district,block,village,service,
    customer_user_id,rate_at_booking,rate_unit,referral_partner_id
   )
   VALUES(?,?,?,?,?,?,?,?,?,?)
  `).run(
   name,
   mobile,
   district,
   block,
   village,
   service,
   customer?.id??null,
   rate,
   rateUnit,
   customer?.referred_by??null
  );

  const id=Number(result.lastInsertRowid);

  res.status(201).json({
   success:true,
   message:"बुकिंग सफलतापूर्वक दर्ज हुई।",
   bookingId:id,
   bookingCode:makeBookingId(id)
  });

 } catch(error) {
  sendError(res,error,"बुकिंग में सर्वर त्रुटि हुई।");
 }
});

// ==================================================
// ADMIN BOOKING LIST
// ==================================================

app.get("/api/bookings",authenticateToken,adminOnly,(req,res)=>{
 try {
  returnExpiredBookings();

  const bookings=db.prepare(`
   SELECT b.*,u.name AS agent_name,u.mobile AS agent_mobile,
          u.userId AS agent_userId
   FROM bookings b LEFT JOIN users u ON u.id=b.assigned_agent_id
   ORDER BY b.id DESC
  `).all().map(b=>({...b,bookingCode:makeBookingId(b.id)}));

  res.json({success:true,bookings});

 } catch(error) {
  sendError(res,error,"Bookings लोड नहीं हो सकीं।");
 }
});

// ==================================================
// ADMIN PENDING USERS
// ==================================================

app.get("/api/admin/pending-users",authenticateToken,adminOnly,(req,res)=>{
 try {
  const users=db.prepare(`
   SELECT id,userId,name,mobile,role,status,district,block,agency_name,created_at
   FROM users WHERE status='pending' ORDER BY id DESC
  `).all();

  res.json({success:true,users});

 } catch(error) {
  sendError(res,error,"Pending Users लोड नहीं हुए।");
 }
});

// ==================================================
// ADMIN APPROVE / REJECT USERS
// ==================================================

app.patch("/api/admin/users/:id/status",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const {status,role}=req.body;

  if(!Number.isInteger(id)||id<1) {
   return res.status(400).json({success:false,message:"User ID गलत है।"});
  }

  if(!["approved","pending","rejected"].includes(status)) {
   return res.status(400).json({success:false,message:"Status गलत है।"});
  }

  const current=db.prepare(`SELECT * FROM users WHERE id=?`).get(id);

  if(!current||current.role==="admin") {
   return res.status(404).json({success:false,message:"यूज़र नहीं मिला।"});
  }

  const nextRole=["customer","agent","referral"].includes(role)?role:current.role;

  if(nextRole==="agent"&&(!current.district||!current.block)) {
   return res.status(400).json({
    success:false,
    message:"Agent को स्वीकृत करने से पहले जिला और ब्लॉक दर्ज होना चाहिए।"
   });
  }

  const userId=nextRole==="agent"?makeAgentId(id):
   nextRole==="customer"?makeCustomerId(id):current.userId;

  const referralCode=nextRole==="agent"?makeReferralCode(id):
   nextRole==="referral"?`REF${String(id).padStart(6,"0")}`:current.referral_code;

  db.prepare(`
   UPDATE users SET status=?,role=?,userId=?,referral_code=? WHERE id=?
  `).run(status,nextRole,userId,referralCode,id);

  res.json({
   success:true,
   message:"यूज़र का Status अपडेट हो गया।",
   userId,
   referralCode
  });

 } catch(error) {
  sendError(res,error,"यूज़र अपडेट नहीं हो सका।");
 }
});

// ==================================================
// ADMIN AGENTS
// ==================================================

app.get("/api/admin/agents",authenticateToken,adminOnly,(req,res)=>{
 try {
  const agents=db.prepare(`
   SELECT id,userId,name,mobile,role,status,district,block,agency_name,referral_code,created_at
   FROM users WHERE role='agent' ORDER BY id DESC
  `).all();

  res.json({success:true,agents});

 } catch(error) {
  sendError(res,error,"Agent List लोड नहीं हुई।");
 }
});

app.patch("/api/admin/agents/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const name=String(req.body.name||"").trim();
  const agencyName=String(req.body.agencyName||"").trim();
  const district=String(req.body.district||"").trim();
  const block=String(req.body.block||"").trim();

  const agent=db.prepare(`
   SELECT id FROM users WHERE id=? AND role='agent'
  `).get(id);

  if(!agent) {
   return res.status(404).json({success:false,message:"Agent नहीं मिला।"});
  }

  if(!name||!district||!block) {
   return res.status(400).json({
    success:false,
    message:"नाम, जिला और ब्लॉक आवश्यक हैं।"
   });
  }

  db.prepare(`
   UPDATE users SET name=?,agency_name=?,district=?,block=? WHERE id=?
  `).run(name,agencyName,district,block,id);

  res.json({success:true,message:"Agent Profile अपडेट हो गई।"});

 } catch(error) {
  sendError(res,error,"Agent Profile अपडेट नहीं हुई।");
 }
});

app.patch("/api/admin/agents/:id/status",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const status=String(req.body.status||"");

  if(!["approved","rejected","inactive"].includes(status)) {
   return res.status(400).json({success:false,message:"Status गलत है।"});
  }

  const result=db.prepare(`
   UPDATE users SET status=? WHERE id=? AND role='agent'
  `).run(status,id);

  if(!result.changes) {
   return res.status(404).json({success:false,message:"Agent नहीं मिला।"});
  }

  res.json({success:true,message:"Agent Status अपडेट हो गया।"});

 } catch(error) {
  sendError(res,error,"Agent Status अपडेट नहीं हुआ।");
 }
});

// ==================================================
// ADMIN SERVICES
// ==================================================

app.get("/api/admin/services",authenticateToken,adminOnly,(req,res)=>{
 try {
  const services=db.prepare(`
   SELECT * FROM services ORDER BY id DESC
  `).all();

  res.json({success:true,services});

 } catch(error) {
  sendError(res,error,"Services लोड नहीं हुईं।");
 }
});

app.post("/api/admin/services",authenticateToken,adminOnly,(req,res)=>{
 try {
  const name=String(req.body.name||"").trim();
  const unit=String(req.body.unit||"प्रति फुट").trim();

  if(!name) {
   return res.status(400).json({success:false,message:"सेवा का नाम भरें।"});
  }

  const result=db.prepare(`
   INSERT INTO services(name,unit) VALUES(?,?)
  `).run(name,unit);

  res.status(201).json({
   success:true,
   message:"नई सेवा जोड़ दी गई।",
   id:Number(result.lastInsertRowid)
  });

 } catch(error) {
  if(String(error.message).includes("UNIQUE")) {
   return res.status(409).json({
    success:false,
    message:"यह सेवा पहले से मौजूद है।"
   });
  }

  sendError(res,error,"सेवा नहीं जुड़ सकी।");
 }
});

app.patch("/api/admin/services/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const name=String(req.body.name||"").trim();
  const unit=String(req.body.unit||"प्रति फुट").trim();
  const active=req.body.active===false||req.body.active===0?0:1;

  if(!name) {
   return res.status(400).json({success:false,message:"सेवा का नाम भरें।"});
  }

  const result=db.prepare(`
   UPDATE services SET name=?,unit=?,active=? WHERE id=?
  `).run(name,unit,active,id);

  if(!result.changes) {
   return res.status(404).json({success:false,message:"सेवा नहीं मिली।"});
  }

  res.json({success:true,message:"सेवा अपडेट हो गई।"});

 } catch(error) {
  sendError(res,error,"सेवा अपडेट नहीं हुई।");
 }
});

// ==================================================
// ADMIN STANDARD RATES
// ==================================================

app.get("/api/admin/rates",authenticateToken,adminOnly,(req,res)=>{
 try {
  const rates=db.prepare(`
   SELECT id,district,block,service,rate,updated_at
   FROM rates ORDER BY district,block,service
  `).all();

  res.json({success:true,rates});

 } catch(error) {
  sendError(res,error,"Rates लोड नहीं हुए।");
 }
});

app.post("/api/admin/rates",authenticateToken,adminOnly,(req,res)=>{
 try {
  const district=String(req.body.district||"").trim();
  const block=String(req.body.block||"").trim();
  const service=String(req.body.service||"").trim();
  const rate=Number(req.body.rate);

  if(!district||!block||!service||!Number.isFinite(rate)||rate<0) {
   return res.status(400).json({
    success:false,
    message:"जिला, ब्लॉक, सेवा और सही रेट भरें।"
   });
  }

  const active=db.prepare(`
   SELECT id FROM services WHERE name=? AND active=1
  `).get(service);

  if(!active) {
   return res.status(400).json({
    success:false,
    message:"पहले सेवा को Admin Services में जोड़ें और Active करें।"
   });
  }

  db.prepare(`
   INSERT INTO rates(district,block,service,rate,updated_at)
   VALUES(?,?,?,?,CURRENT_TIMESTAMP)
   ON CONFLICT(district,block,service)
   DO UPDATE SET rate=excluded.rate,updated_at=CURRENT_TIMESTAMP
  `).run(district,block,service,rate);

  res.json({success:true,message:"Block Rate सेव हो गया।"});

 } catch(error) {
  sendError(res,error,"रेट सेव नहीं हो सका।");
 }
});

app.delete("/api/admin/rates/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const result=db.prepare(`
   DELETE FROM rates WHERE id=?
  `).run(Number(req.params.id));

  if(!result.changes) {
   return res.status(404).json({success:false,message:"रेट नहीं मिला।"});
  }

  res.json({success:true,message:"रेट हटा दिया गया।"});

 } catch(error) {
  sendError(res,error,"रेट हटाया नहीं जा सका।");
 }
});

app.put("/api/admin/rates/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const district=String(req.body.district||"").trim();
  const block=String(req.body.block||"").trim();
  const service=String(req.body.service||"").trim();
  const rate=Number(req.body.rate);

  if(!district||!block||!service||!Number.isFinite(rate)||rate<0) {
   return res.status(400).json({
    success:false,
    message:"रेट विवरण सही भरें।"
   });
  }

  const result=db.prepare(`
   UPDATE rates
   SET district=?,block=?,service=?,rate=?,updated_at=CURRENT_TIMESTAMP
   WHERE id=?
  `).run(district,block,service,rate,id);

  if(!result.changes) {
   return res.status(404).json({success:false,message:"रेट नहीं मिला।"});
  }

  res.json({success:true,message:"रेट अपडेट हो गया।"});

 } catch(error) {
  sendError(res,error,"रेट अपडेट नहीं हुआ।");
 }
});

// ==================================================
// AGENT PROFILE
// ==================================================

app.get("/api/agent/profile",authenticateToken,agentOnly,(req,res)=>{
 try {
  const agent=getCurrentUser(req);

  if(!agent) {
   return res.status(404).json({success:false,message:"Agent नहीं मिला।"});
  }

  res.json({
   success:true,
   agent:{
    id:agent.id,
    userId:agent.userId,
    name:agent.name,
    mobile:agent.mobile,
    district:agent.district,
    block:agent.block,
    agencyName:agent.agency_name,
    referralCode:agent.referral_code||agent.userId
   }
  });

 } catch(error) {
  sendError(res,error,"Agent Profile लोड नहीं हुई।");
 }
});

// ==================================================
// AGENT CUSTOMERS
// ==================================================

app.get("/api/agent/customers",authenticateToken,agentOnly,(req,res)=>{
 try {
  const customers=db.prepare(`
   SELECT id,userId,name,mobile,status,created_at
   FROM users WHERE referred_agent_id=? AND role='customer'
   ORDER BY id DESC
  `).all(req.user.id);

  res.json({success:true,customers});

 } catch(error) {
  sendError(res,error,"ग्राहक सूची लोड नहीं हुई।");
 }
});

// ==================================================
// AGENT BOOKINGS
// ==================================================

app.get("/api/agent/bookings",authenticateToken,agentOnly,(req,res)=>{
 try {
  returnExpiredBookings();

  const bookings=db.prepare(`
   SELECT b.*,u.userId AS agent_userId
   FROM bookings b
   JOIN users u ON u.id=b.assigned_agent_id
   WHERE b.assigned_agent_id=?
   ORDER BY b.id DESC
  `).all(req.user.id).map(b=>({...b,bookingCode:makeBookingId(b.id)}));

  res.json({success:true,bookings});

 } catch(error) {
  sendError(res,error,"Agent Bookings लोड नहीं हुईं।");
 }
});

// ==================================================
// AGENT ACCEPT / REJECT BOOKING
// ==================================================

app.patch("/api/agent/bookings/:id",authenticateToken,agentOnly,(req,res)=>{
 try {
  returnExpiredBookings();

  const id=Number(req.params.id);
  const action=String(req.body.action||"").toLowerCase();

  if(!Number.isInteger(id)||id<1||!["accept","reject"].includes(action)) {
   return res.status(400).json({
    success:false,
    message:"Booking ID या Action गलत है।"
   });
  }

  const booking=db.prepare(`
   SELECT * FROM bookings WHERE id=? AND assigned_agent_id=?
  `).get(id,req.user.id);

  if(!booking) {
   return res.status(403).json({
    success:false,
    message:"यह Booking अब आपके पास नहीं है। Admin ने इसे वापस ले लिया हो सकता है।"
   });
  }

  if(booking.status!=="एजेंट नियुक्त") {
   return res.status(409).json({
    success:false,
    message:"इस Booking का जवाब पहले ही दिया जा चुका है या समय समाप्त हो गया है।"
   });
  }

  if(action==="accept") {
   const result=db.prepare(`
    UPDATE bookings
    SET status='एजेंट द्वारा स्वीकार'
    WHERE id=? AND assigned_agent_id=? AND status='एजेंट नियुक्त'
      AND datetime(assignment_due_at)>datetime('now')
   `).run(id,req.user.id);

   if(!result.changes) {
    return res.status(409).json({
     success:false,
     message:"72 घंटे की समय-सीमा समाप्त हो गई है या Booking बदल गई है।"
    });
   }

   return res.json({success:true,message:"Booking स्वीकार कर ली गई।"});
  }

  const result=db.prepare(`
   UPDATE bookings
   SET assigned_agent_id=NULL,
       status='Agent ने Reject किया - Admin के पास वापस',
       returned_at=CURRENT_TIMESTAMP,
       assignment_due_at=NULL,
       assignment_mode='admin'
   WHERE id=? AND assigned_agent_id=? AND status='एजेंट नियुक्त'
  `).run(id,req.user.id);

  if(!result.changes) {
   return res.status(409).json({
    success:false,
    message:"Booking बदल गई है।"
   });
  }

  res.json({
   success:true,
   message:"Booking Admin के पास वापस भेज दी गई।"
  });

 } catch(error) {
  sendError(res,error,"Booking Action पूरा नहीं हुआ।");
 }
});

// ==================================================
// AGENT WORK STATUS
// ==================================================

app.patch("/api/agent/bookings/:id/work-status",authenticateToken,agentOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const status=String(req.body.status||"");

  if(!["कार्य प्रगति पर","पूर्ण"].includes(status)) {
   return res.status(400).json({
    success:false,
    message:"मान्य Work Status चुनें।"
   });
  }

  const result=db.prepare(`
   UPDATE bookings
   SET status=?
   WHERE id=?
     AND assigned_agent_id=?
     AND status IN ('एजेंट द्वारा स्वीकार','कार्य प्रगति पर')
  `).run(status,id,req.user.id);

  if(!result.changes) {
   return res.status(403).json({
    success:false,
    message:"आप इस Booking को अपडेट नहीं कर सकते। यह Booking अब आपके पास नहीं है या आपने Accept नहीं किया है।"
   });
  }

  res.json({success:true,message:"Booking Status अपडेट हो गया।"});

 } catch(error) {
  sendError(res,error,"Work Status अपडेट नहीं हुआ।");
 }
});

// ==================================================
// AGENT PERSONAL RATES
// ==================================================

app.get("/api/agent/rates",authenticateToken,agentOnly,(req,res)=>{
 try {
  const agent=getCurrentUser(req);

  const rates=db.prepare(`
   SELECT ar.id,ar.service_id,s.name AS service,ar.rate,ar.unit,ar.status
   FROM agent_rates ar JOIN services s ON s.id=ar.service_id
   WHERE ar.agent_id=? ORDER BY s.name
  `).all(req.user.id);

  const services=db.prepare(`
   SELECT id,name,unit FROM services WHERE active=1 ORDER BY name
  `).all();

  res.json({
   success:true,
   agent:{district:agent.district,block:agent.block},
   rates,
   services
  });

 } catch(error) {
  sendError(res,error,"Personal Rates लोड नहीं हुए।");
 }
});

app.post("/api/agent/rates/request",authenticateToken,agentOnly,(req,res)=>{
 try {
  const serviceId=Number(req.body.serviceId);
  const requestedRate=Number(req.body.rate);
  const unit=String(req.body.unit||"प्रति फुट").trim();

  if(!Number.isInteger(serviceId)||!Number.isFinite(requestedRate)||requestedRate<0) {
   return res.status(400).json({
    success:false,
    message:"Service और सही Rate भरें।"
   });
  }

  const service=db.prepare(`
   SELECT id FROM services WHERE id=? AND active=1
  `).get(serviceId);

  if(!service) {
   return res.status(404).json({
    success:false,
    message:"सेवा उपलब्ध नहीं है।"
   });
  }

  const current=db.prepare(`
   SELECT rate FROM agent_rates WHERE agent_id=? AND service_id=?
  `).get(req.user.id,serviceId);

  db.prepare(`
   INSERT INTO agent_rate_requests(agent_id,service_id,old_rate,requested_rate,unit)
   VALUES(?,?,?,?,?)
  `).run(
   req.user.id,
   serviceId,
   current?.rate??null,
   requestedRate,
   unit
  );

  res.status(201).json({
   success:true,
   message:"Rate Change Request Admin को भेज दी गई।"
  });

 } catch(error) {
  sendError(res,error,"Rate Request नहीं भेजी जा सकी।");
 }
});

// ==================================================
// ADMIN AGENT RATE REQUESTS
// ==================================================

app.get("/api/admin/agent-rate-requests",authenticateToken,adminOnly,(req,res)=>{
 try {
  const requests=db.prepare(`
   SELECT rr.*,u.userId AS agent_userId,u.name AS agent_name,
          u.mobile AS agent_mobile,u.district,u.block,s.name AS service_name
   FROM agent_rate_requests rr
   JOIN users u ON u.id=rr.agent_id
   JOIN services s ON s.id=rr.service_id
   ORDER BY rr.id DESC
  `).all();

  res.json({success:true,requests});

 } catch(error) {
  sendError(res,error,"Rate Requests लोड नहीं हुईं।");
 }
});

app.patch("/api/admin/agent-rate-requests/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);
  const status=String(req.body.status||"");

  if(!["approved","rejected"].includes(status)) {
   return res.status(400).json({
    success:false,
    message:"Status गलत है।"
   });
  }

  const request=db.prepare(`
   SELECT rr.*,u.district,u.block,u.status AS agent_status
   FROM agent_rate_requests rr JOIN users u ON u.id=rr.agent_id
   WHERE rr.id=?
  `).get(id);

  if(!request) {
   return res.status(404).json({
    success:false,
    message:"Request नहीं मिली।"
   });
  }

  const update=db.transaction(()=>{
   if(status==="approved"&&request.agent_status!=="approved") {
    throw new Error("Agent स्वीकृत नहीं है।");
   }

   db.prepare(`
    UPDATE agent_rate_requests SET status=? WHERE id=?
   `).run(status,id);

   if(status==="approved") {
    db.prepare(`
     INSERT INTO agent_rates
     (agent_id,district,block,service_id,rate,unit,status,updated_at)
     VALUES(?,?,?,?,?,?,'approved',CURRENT_TIMESTAMP)
     ON CONFLICT(agent_id,service_id)
     DO UPDATE SET district=excluded.district,block=excluded.block,
       rate=excluded.rate,unit=excluded.unit,status='approved',
       updated_at=CURRENT_TIMESTAMP
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

  update();

  res.json({
   success:true,
   message:status==="approved"
    ?"Agent Personal Rate स्वीकृत हो गया।"
    :"Rate Request अस्वीकृत कर दी गई।"
  });

 } catch(error) {
  sendError(res,error,"Rate Request अपडेट नहीं हुई।");
 }
});

// ==================================================
// REFERRAL MITRA - DIRECT CUSTOMER BOOKING
// ==================================================

app.post(
 "/api/referral/bookings",
 authenticateToken,
 (req,res)=>{
  try {
   const partner=db.prepare(`
    SELECT id,userId,referral_code,name
    FROM users
    WHERE id=? AND role='referral' AND status='approved'
   `).get(req.user.id);

   if(!partner) {
    return res.status(403).json({
     success:false,
     message:"केवल Approved Referral Mitra ही Booking बना सकता है।"
    });
   }

   const name=String(req.body.customerName||"").trim();
   const mobile=String(req.body.mobile||"").trim();
   const district=String(req.body.district||"").trim();
   const tehsil=String(req.body.tehsil||"").trim();
   const block=String(req.body.block||"").trim();
   const address=String(req.body.address||"").trim();
   const service=String(req.body.service||"").trim();

   if(
    !name ||
    !/^[6-9]\d{9}$/.test(mobile) ||
    !district ||
    !tehsil ||
    !block ||
    !address ||
    !service
   ) {
    return res.status(400).json({
     success:false,
     message:"ग्राहक की सभी जानकारी सही-सही भरें।"
    });
   }

   const activeService=db.prepare(`
    SELECT id,name,unit
    FROM services
    WHERE name=? AND active=1
   `).get(service);

   if(!activeService) {
    return res.status(400).json({
     success:false,
     message:"चुनी गई Service उपलब्ध नहीं है।"
    });
   }

   const result=db.prepare(`
    INSERT INTO bookings
    (
     name,mobile,district,block,village,service,
     tehsil,address,referral_partner_id
    )
    VALUES(?,?,?,?,?,?,?,?,?)
   `).run(
    name,
    mobile,
    district,
    block,
    address,
    service,
    tehsil,
    address,
    partner.id
   );

   const bookingId=Number(result.lastInsertRowid);

   res.status(201).json({
    success:true,
    message:"Referral Booking सफलतापूर्वक दर्ज हुई।",
    bookingId,
    bookingCode:makeBookingId(bookingId),
    referralCode:partner.referral_code
   });

  } catch(error) {
   sendError(res,error,"Referral Booking सेव नहीं हो सकी।");
  }
 }
);

// ==================================================
// ADMIN REFERRALS
// ==================================================

app.get("/api/admin/referrals",authenticateToken,adminOnly,(req,res)=>{
 try {
  const referrals=db.prepare(`
   SELECT u.id,u.userId,u.name,u.mobile,u.referral_code,u.status,u.created_at,
          COUNT(joined.id) AS joined_count
   FROM users u LEFT JOIN users joined ON joined.referred_by=u.id
   WHERE u.role='referral'
   GROUP BY u.id
   ORDER BY u.id DESC
  `).all();

  res.json({
   success:true,
   referrals,
   totalReferralPartners:referrals.length,
   totalJoined:referrals.reduce((sum,item)=>sum+item.joined_count,0)
  });

 } catch(error) {
  sendError(res,error,"Referral List लोड नहीं हुई।");
 }
});

app.get("/api/admin/referrals/:id/members",authenticateToken,adminOnly,(req,res)=>{
 try {
  const id=Number(req.params.id);

  const referral=db.prepare(`
   SELECT id,name,userId,referral_code
   FROM users WHERE id=? AND role='referral'
  `).get(id);

  if(!referral) {
   return res.status(404).json({
    success:false,
    message:"Referral Partner नहीं मिला।"
   });
  }

  const members=db.prepare(`
   SELECT id,userId,name,mobile,role,status,created_at
   FROM users WHERE referred_by=? ORDER BY id DESC
  `).all(id);

  res.json({success:true,referral,members,count:members.length});

 } catch(error) {
  sendError(res,error,"Referral Members लोड नहीं हुए।");
 }
});

// ==================================================
// ADMIN BOOKING OVERRIDE / ASSIGNMENT
// ==================================================

app.patch("/api/admin/bookings/:id",authenticateToken,adminOnly,(req,res)=>{
 try {
  const bookingId=Number(req.params.id);
  const {status,assigned_agent_id,assignmentMode}=req.body;

  if(!Number.isInteger(bookingId)||bookingId<1) {
   return res.status(400).json({
    success:false,
    message:"Booking ID गलत है।"
   });
  }

  const booking=db.prepare(`
   SELECT * FROM bookings WHERE id=?
  `).get(bookingId);

  if(!booking) {
   return res.status(404).json({
    success:false,
    message:"बुकिंग नहीं मिली।"
   });
  }

  // Admin खुद Booking संभाले
  if(assignmentMode==="self") {
   db.prepare(`
    UPDATE bookings
    SET assigned_agent_id=NULL,
        status='Admin द्वारा स्वीकृत',
        assigned_at=CURRENT_TIMESTAMP,
        assignment_due_at=NULL,
        returned_at=NULL,
        assignment_mode='self',
        assignment_count=assignment_count+1
    WHERE id=?
   `).run(bookingId);

   return res.json({
    success:true,
    message:"Booking अब Admin स्वयं संभालेंगे।"
   });
  }

  // नया Agent नियुक्त करना या पुराने Agent को बदलना
  if(assigned_agent_id!==undefined&&assigned_agent_id!==null&&assigned_agent_id!=="") {
   const agentId=Number(assigned_agent_id);

   const agent=db.prepare(`
    SELECT id,name,district,block FROM users
    WHERE id=? AND role='agent' AND status='approved'
   `).get(agentId);

   if(!agent) {
    return res.status(400).json({
     success:false,
     message:"स्वीकृत Agent नहीं मिला।"
    });
   }

   if(agent.district!==booking.district||agent.block!==booking.block) {
    return res.status(400).json({
     success:false,
     message:"इस Booking के जिला और ब्लॉक का Agent ही नियुक्त करें।"
    });
   }

   db.prepare(`
    UPDATE bookings
    SET assigned_agent_id=?,
        status='एजेंट नियुक्त',
        assigned_at=CURRENT_TIMESTAMP,
        assignment_due_at=datetime('now','+3 days'),
        returned_at=NULL,
        assignment_mode='agent',
        assignment_count=assignment_count+1
    WHERE id=?
   `).run(agentId,bookingId);

   return res.json({
    success:true,
    message:"Agent नियुक्त हो गया। उसे 72 घंटे में जवाब देना होगा।",
    agent:{id:agent.id,name:agent.name},
    responseHours:72
   });
  }

  // Agent हटाकर Admin के पास वापस
  if(assigned_agent_id===null||assigned_agent_id==="") {
   db.prepare(`
    UPDATE bookings
    SET assigned_agent_id=NULL,
        status='Admin के पास वापस',
        assignment_due_at=NULL,
        returned_at=CURRENT_TIMESTAMP,
        assignment_mode='admin'
    WHERE id=?
   `).run(bookingId);

   return res.json({
    success:true,
    message:"Booking Admin के पास वापस आ गई।"
   });
  }

  const allowedStatuses=[
   "नई बुकिंग",
   "जाँच में",
   "स्वीकृत",
   "Admin द्वारा स्वीकृत",
   "कार्य प्रगति पर",
   "पूर्ण",
   "रद्द"
  ];

  if(status!==undefined) {
   if(!allowedStatuses.includes(status)) {
    return res.status(400).json({
     success:false,
     message:"Booking Status गलत है।"
    });
   }

   db.prepare(`
    UPDATE bookings SET status=? WHERE id=?
   `).run(status,bookingId);
  }

  res.json({success:true,message:"Booking अपडेट हो गई।"});

 } catch(error) {
  sendError(res,error,"Booking अपडेट नहीं हुई।");
 }
});
registerReferralRoutes(app, db, authenticateToken, adminOnly);
// ==================================================
// START SERVER
// ==================================================

app.listen(PORT,()=>{
 console.log(`Borewell Mitra MP API: http://localhost:${PORT}`);
});
