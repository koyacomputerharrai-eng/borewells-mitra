import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("borewell-mitra.db");

const userId = "ADMIN4681";
const password = "Koya@4681";
const name = "Borewell Mitra Admin";
const primaryMobile = "9098520283";
const alternateMobile = "9343863725";

try {
  const passwordHash = await bcrypt.hash(password, 12);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE
    );
  `);

  const existingAdmin = db.prepare(
    "SELECT id FROM users WHERE user_id = ?"
  ).get(userId);

  const phoneConflict = db.prepare(`
  SELECT user_id FROM users
  WHERE mobile = ? AND user_id != ?
`).get(primaryMobile, userId);

if (phoneConflict) {
  throw new Error(
    "Admin का मुख्य मोबाइल नंबर किसी दूसरे Account में इस्तेमाल हो रहा है।"
  );
}

  if (existingAdmin) {
    db.prepare(`
      UPDATE users
      SET name = ?, mobile = ?, password_hash = ?,
          role = 'admin', status = 'active'
      WHERE user_id = ?
    `).run(name, primaryMobile, passwordHash, userId);
  } else {
    db.prepare(`
      INSERT INTO users
        (user_id, name, mobile, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'admin', 'active')
    `).run(userId, name, primaryMobile, passwordHash);
  }

  db.prepare(
    "DELETE FROM admin_contacts WHERE user_id = ?"
  ).run(userId);

  const saveContact = db.prepare(`
    INSERT INTO admin_contacts (user_id, mobile)
    VALUES (?, ?)
  `);

  saveContact.run(userId, primaryMobile);
  saveContact.run(userId, alternateMobile);

  console.log("Admin Account सफलतापूर्वक तैयार हो गया।");
  console.log("User ID:", userId);
  console.log("दोनों मोबाइल नंबर सेव हो गए।");
} catch (error) {
  console.error("Admin बनाने में समस्या:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
