import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { init, getDb } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import puppeteer from 'puppeteer';

const SECRET = 'supersecret';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

await init();
const db = await getDb();

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.sendStatus(401);
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch(e){
    res.sendStatus(401);
  }
}

app.post('/api/login', async (req,res)=>{
  const {email, password} = req.body;
  const user = await db.get('SELECT * FROM users WHERE email=?', email);
  if(!user) return res.sendStatus(401);
  const valid = await bcrypt.compare(password, user.password);
  if(!valid) return res.sendStatus(401);
  const token = jwt.sign({id:user.id, org_id:user.org_id}, SECRET, {expiresIn:'1h'});
  res.json({token});
});

app.get('/api/org-chart', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const members = await db.all('SELECT * FROM members WHERE org_id=?', orgId);
  const org = await db.get('SELECT name FROM organizations WHERE id=?', orgId);
  const map = new Map();
  members.forEach(m => { m.children = []; map.set(m.id, m); });

  const roots = [];
  members.forEach(m => {
    if (m.parent_id && map.get(m.parent_id)) {
      map.get(m.parent_id).children.push(m);
    } else {
      roots.push(m);
    }
  });

  let root = roots.length === 1 ? roots[0] : { children: roots };
  if (root) root.company = org?.name || '';
  res.json(root);
});

app.post('/api/members', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const {parent_id,name,title,email,phone,linkedin,photo,bu_text,bu_color} = req.body;
  const result = await db.run(`INSERT INTO members (org_id,parent_id,name,title,email,phone,linkedin,photo,bu_text,bu_color) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    orgId,parent_id,name,title,email,phone,linkedin,photo,bu_text,bu_color);
  const member = await db.get('SELECT * FROM members WHERE id=?', result.lastID);
  res.json(member);
});

app.put('/api/members/:id', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const id = req.params.id;
  const m = await db.get('SELECT * FROM members WHERE id=? AND org_id=?', id, orgId);
  if(!m) return res.sendStatus(404);
  const {name,title,email,phone,linkedin,photo,bu_text,bu_color,parent_id} = req.body;
  await db.run(`UPDATE members SET name=?, title=?, email=?, phone=?, linkedin=?, photo=?, bu_text=?, bu_color=?, parent_id=? WHERE id=?`,
    name,title,email,phone,linkedin,photo,bu_text,bu_color,parent_id,id);
  const member = await db.get('SELECT * FROM members WHERE id=?', id);
  res.json(member);
});

app.delete('/api/members/:id', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const id = req.params.id;
  const m = await db.get('SELECT * FROM members WHERE id=? AND org_id=?', id, orgId);
  if(!m) return res.sendStatus(404);
  await db.run(
    `WITH RECURSIVE sub(id) AS (
      SELECT id FROM members WHERE id=? AND org_id=?
      UNION ALL
      SELECT m.id FROM members m JOIN sub s ON m.parent_id=s.id
    ) DELETE FROM members WHERE id IN sub`,
    id, orgId
  );
  res.sendStatus(204);
});

app.post('/api/import', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const {members, company} = req.body; // expecting root object
  if(!members) return res.status(400).send('No members');
  await db.run('DELETE FROM members WHERE org_id=?', orgId);
  function insert(node,parent){
    return db.run(`INSERT INTO members (org_id,parent_id,name,title,email,phone,linkedin,photo,bu_text,bu_color) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      orgId,parent,node.name,node.title,node.email,node.phone,node.linkedin,node.photo,node.bu_text,node.bu_color)
      .then(r=>{
        node.children && node.children.forEach(child=>insert(child,r.lastID));
      });
  }
  await insert(members,null);
  if(company){
    await db.run('UPDATE organizations SET name=? WHERE id=?', company, orgId);
  }
  res.sendStatus(201);
});

app.post('/api/linkedin', authMiddleware, async (req,res)=>{
  const { url } = req.body;
  if(!url) return res.status(400).send('url required');
  try {
    let html = '';
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox','--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      html = await page.content();
      await browser.close();
    } catch(err){
      const tmp = path.join(os.tmpdir(), 'li'+Date.now()+'.html');
      async function fetchPage(u){
        try {
          await new Promise((resolve, reject)=>{
            execFile('curl', ['-L', '--compressed', '-A', 'Mozilla/5.0', u, '-o', tmp], err => err ? reject(err) : resolve());
          });
        } catch(e){
          return false;
        }
        return true;
      }

      let ok = await fetchPage(url);
      if(!ok){
        const proxy = 'https://r.jina.ai/' + url;
        await fetchPage(proxy);
      }
      html = await fs.promises.readFile(tmp,'utf8');
      await fs.promises.unlink(tmp);
    }
    function meta(prop){
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
      const m = html.match(re);
      return m ? m[1] : null;
    }

    const titleMatch = meta('og:title');
    const descMatch = meta('og:description');
    const imgMatch = meta('og:image');
    const titleTag = html.match(/<title>([^<]+)<\/title>/i);

    let name='', title='', company='', photo=imgMatch;

    const jsonMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
    if(jsonMatch){
      try {
        let obj = JSON.parse(jsonMatch[1]);
        if(Array.isArray(obj['@graph'])) obj = obj['@graph'].find(o=>o['@type']==='Person') || obj;
        if(obj['@type']==='Person'){
          name = obj.name || name;
          title = obj.jobTitle || obj.headline || title;
          if(Array.isArray(title)) title = title[0];
          if(obj.worksFor && obj.worksFor.name) company = obj.worksFor.name;
          photo = obj.image?.url || obj.image?.contentUrl || obj.image || photo;
        }
      } catch(e){}
    }

    const baseText = descMatch || titleMatch || (titleTag ? titleTag[1] : '');
    const text = baseText.replace(/\s+\|.*$/, '');
    if(!name){
      const dashIdx = text.indexOf(' - ');
      if(dashIdx!==-1){
        name = text.slice(0,dashIdx).trim();
        const rest = text.slice(dashIdx+3);
        if(!title){
          if(rest.includes(' at ')){
            const atIdx = rest.indexOf(' at ');
            title = rest.slice(0,atIdx).trim();
            if(!company) company = rest.slice(atIdx+4).replace(/\|.*$/,'').trim();
          } else if(rest.includes(' - ')){
            const parts = rest.split(' - ');
            title = parts.shift().trim();
            if(!company) company = parts.join(' - ').replace(/\|.*$/,'').trim();
          } else {
            title = rest.replace(/\|.*$/,'').trim();
          }
        }
      }
    }

    res.json({name, title, company, photo});
  } catch(e){
    console.error(e);
    res.status(500).send('Failed to fetch');
  }
});

app.put('/api/org', authMiddleware, async (req,res)=>{
  const orgId = req.user.org_id;
  const {name} = req.body;
  if(!name) return res.status(400).send('name required');
  await db.run('UPDATE organizations SET name=? WHERE id=?', name, orgId);
  res.sendStatus(204);
});

app.get('*', (req,res)=>{ res.sendFile(path.join(__dirname,'../client/login.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on '+PORT));
