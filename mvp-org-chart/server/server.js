import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { init, getDb } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
  members.forEach(m => { m.children=[]; map.set(m.id, m); });
  let root=null;
  members.forEach(m => {
    if(m.parent_id){
      const parent = map.get(m.parent_id);
      parent.children.push(m);
    } else root=m;
  });
  if(root) root.company = org?.name || '';
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
