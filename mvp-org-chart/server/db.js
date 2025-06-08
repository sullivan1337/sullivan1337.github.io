import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const dbPromise = open({ filename: './database.db', driver: sqlite3.Database });

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
    await db.run('INSERT INTO organizations (name) VALUES (?)', 'Acme Corp');
    await db.run('INSERT INTO organizations (name) VALUES (?)', 'Globex');

    const hash = await bcrypt.hash('password', 10);
    await db.run('INSERT INTO users (email, password, org_id) VALUES (?,?,?)', 'admin@acme.com', hash, 1);
    await db.run('INSERT INTO users (email, password, org_id) VALUES (?,?,?)', 'user@globex.com', hash, 2);

    // seed members for org 1
    const ceo = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, NULL, 'Luke Warm', 'VP Marketing/Sales','lwarm@example.com','(234) 555-6789','https://www.linkedin.com/in/lukewarm','https://via.placeholder.com/80','MGT','#0000FF')`);
    const ceoId = ceo.lastID;
    const sales = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Meg Meehan Hoffa', 'Sales','mhoffa@example.com','(234) 555-6789','https://www.linkedin.com/in/megmeehan','https://via.placeholder.com/80','SAL','#800080')`, ceoId);
    const salesId = sales.lastID;
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Dot Stubadd', 'Sales Rep','dstubadd@example.com','(234) 555-6789','https://www.linkedin.com/in/dotstubadd','https://via.placeholder.com/80','SAL','#800080')`, salesId);
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Lotta B. Essen', 'Sales Rep','lessen@example.com','(234) 555-6789','https://www.linkedin.com/in/lottabessen','https://via.placeholder.com/80','SAL','#800080')`, salesId);
    const marketing = await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'Al Ligori', 'Marketing','aligori@example.com','(234) 555-6789','https://www.linkedin.com/in/alligori','https://via.placeholder.com/80','MKT','#008000')`, ceoId);
    const marketingId = marketing.lastID;
    await db.run(`INSERT INTO members (org_id, parent_id, name, title, email, phone, linkedin, photo, bu_text, bu_color)
      VALUES (1, ?, 'April Lynn Parris', 'Events Mgr','aparris@example.com','(234) 555-6789','https://www.linkedin.com/in/aprilparris','https://via.placeholder.com/80','MKT','#008000')`, marketingId);
  }
}

export async function getDb() {
  return dbPromise;
}
