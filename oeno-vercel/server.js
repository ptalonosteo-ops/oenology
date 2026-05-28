'use strict';
require('dotenv').config();
const express  = require('express');
const path     = require('path');
const { parseCookies } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use((req,_,next)=>{ req.cookies=parseCookies(req); next(); });
app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:true}));

app.use('/api',   require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/admin', express.static(path.join(__dirname,'admin')));
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT, ()=>console.log(`🍷 Oenologie App → http://localhost:${PORT}  |  /admin`));
