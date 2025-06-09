import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const DB_FILE = process.env.DB_FILE || './database.db';
const dbPromise = open({ filename: DB_FILE, driver: sqlite3.Database });

export async function init() {
  const db = await dbPromise;
  await db.exec(`CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
  )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      org_id INTEGER,
      FOREIGN KEY(org_id) REFERENCES organizations(id)
  )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER,
      parent_id INTEGER,
      name TEXT,
      title TEXT,
      email TEXT,
      phone TEXT,
      linkedin TEXT,
      photo TEXT,
      bu_text TEXT,
      bu_color TEXT,
      FOREIGN KEY(org_id) REFERENCES organizations(id),
      FOREIGN KEY(parent_id) REFERENCES members(id)
  )`);
  // add photo column if coming from an older schema
  try {
    await db.run('ALTER TABLE members ADD COLUMN photo TEXT');
  } catch (e) {
    // column already exists
  }

  // seed data if tables empty
  const orgs = await db.all('SELECT id FROM organizations');
  if (orgs.length === 0) {
    await db.run('INSERT INTO organizations (name) VALUES (?)', 'Example Corp');
    await db.run('INSERT INTO organizations (name) VALUES (?)', 'Globex');

    const hash = await bcrypt.hash('password', 10);
    await db.run('INSERT INTO users (email, password, org_id) VALUES (?,?,?)', 'admin@acme.com', hash, 1);
    await db.run('INSERT INTO users (email, password, org_id) VALUES (?,?,?)', 'user@globex.com', hash, 2);

    // seed a fuller example org chart for org 1
    const ceo = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, NULL, 'Casey CEO', 'Chief Executive Officer','ceo@example.com','(555) 000-0001','https://www.linkedin.com/in/caseyceo','https://via.placeholder.com/80','EXEC','#0000FF')`);
    const ceoId = ceo.lastID;

    const coo = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Owen Ops', 'Chief Operating Officer','coo@example.com','(555) 000-0002','https://www.linkedin.com/in/owenops','https://via.placeholder.com/80','OPS','#FF0000')`, ceoId);
    const cto = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Terry Tech', 'Chief Technology Officer','cto@example.com','(555) 000-0003','https://www.linkedin.com/in/terrytech','https://via.placeholder.com/80','ENG','#00FF00')`, ceoId);
    const cfo = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Finn Finance', 'Chief Financial Officer','cfo@example.com','(555) 000-0004','https://www.linkedin.com/in/finnfinance','https://via.placeholder.com/80','FIN','#800080')`, ceoId);
    const ciso = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Cynthia Secure', 'Chief Information Security Officer','ciso@example.com','(555) 000-0005','https://www.linkedin.com/in/cynthiasecure','https://via.placeholder.com/80','SEC','#FFA500')`, ceoId);

    const cooMgr = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Opal Opsman', 'Operations Manager','opal@example.com','(555) 000-0011','https://www.linkedin.com/in/opalops','https://via.placeholder.com/80','OPS','#FF0000')`, coo.lastID);
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Olivia Ops', 'Operations Specialist','olivia@example.com','(555) 000-0012','https://www.linkedin.com/in/oliviaops','https://via.placeholder.com/80','OPS','#FF0000')`, cooMgr.lastID);

    const engMgr = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Eddie Eng', 'Engineering Manager','eddie@example.com','(555) 000-0021','https://www.linkedin.com/in/eddieeng','https://via.placeholder.com/80','ENG','#00FF00')`, cto.lastID);
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Ivy Dev', 'Software Engineer','ivy@example.com','(555) 000-0022','https://www.linkedin.com/in/ivydev','https://via.placeholder.com/80','ENG','#00FF00')`, engMgr.lastID);

    const acctMgr = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Abe Account', 'Accounting Manager','abe@example.com','(555) 000-0031','https://www.linkedin.com/in/abeaccount','https://via.placeholder.com/80','FIN','#800080')`, cfo.lastID);
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Fay Finance', 'Accountant','fay@example.com','(555) 000-0032','https://www.linkedin.com/in/fayfinance','https://via.placeholder.com/80','FIN','#800080')`, acctMgr.lastID);

    const secMgr = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Sam Secure', 'Security Manager','sam@example.com','(555) 000-0041','https://www.linkedin.com/in/samsecure','https://via.placeholder.com/80','SEC','#FFA500')`, ciso.lastID);
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Sid Safe', 'Security Analyst','sid@example.com','(555) 000-0042','https://www.linkedin.com/in/sidsafe','https://via.placeholder.com/80','SEC','#FFA500')`, secMgr.lastID);
  }
}

export async function getDb() {
  return dbPromise;
}
