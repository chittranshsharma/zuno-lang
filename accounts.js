const express = require('express');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const User = mongoose.model('User', new mongoose.Schema({ email: { type:String, unique:true }, salt:String, hash:String }));
const Session = mongoose.model('Session', new mongoose.Schema({ token:{type:String,unique:true}, user:mongoose.Schema.Types.ObjectId, expires:{type:Date,expires:0} }));
const router = express.Router();
const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const attempts = new Map();
setInterval(()=>attempts.clear(),60000).unref();
router.use(async (req,res,next)=>{
  const origin=req.get('origin');
  if(req.method!=='GET' && origin && origin!==req.protocol+'://'+req.get('host'))return res.status(403).json({error:'Origin not allowed.'});
  try {
    const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('zuno_session='))?.slice(13);
    if(token){const session=await Session.findOne({token:digest(token),expires:{$gt:new Date()}});if(session)req.user=await User.findById(session.user);}
    next();
  }catch{res.status(503).json({error:'Account database unavailable.'});}
});
router.get('/auth/me',(req,res)=>res.json({user:req.user?{email:req.user.email}:null}));
for(const action of ['register','login'])router.post('/auth/'+action,async(req,res)=>{
  const count=attempts.get(req.ip)||0;if(count>=10)return res.status(429).json({error:'Wait a minute before trying again.'});attempts.set(req.ip,count+1);
  const {email,password}=req.body||{};
  if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'Enter a valid email and a password of 12–128 characters.'});
  try{
    let user;
    if(action==='register'){
      const salt=crypto.randomBytes(16).toString('hex');const hash=(await scrypt(password,salt,64)).toString('hex');
      user=await User.create({email:email.trim().toLowerCase(),salt,hash});
    }else{
      user=await User.findOne({email:email.trim().toLowerCase()});
      const calculated=await scrypt(password,user?.salt||'invalid-account-salt',64);
      if(!user||!crypto.timingSafeEqual(calculated,Buffer.from(user.hash,'hex')))return res.status(401).json({error:'Email or password is incorrect.'});
    }
    const token=crypto.randomBytes(32).toString('hex');
    await Session.create({token:digest(token),user:user._id,expires:new Date(Date.now()+7*86400000)});
    res.cookie('zuno_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:7*86400000,path:'/'});
    res.json({user:{email:user.email}});
  }catch(error){res.status(error.code===11000?409:503).json({error:error.code===11000?'This email is already registered.':'Account service unavailable.'});}
});
router.post('/auth/logout',async(req,res)=>{
  const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('zuno_session='))?.slice(13);
  try { if(token)await Session.deleteOne({token:digest(token)}); } catch { return res.status(503).json({error:'Could not sign out. Please retry.'}); }
  res.clearCookie('zuno_session',{path:'/'});res.json({message:'Signed out'});
});
router.use('/programs',(req,res,next)=>req.user?next():res.status(401).json({error:'Sign in to open your private projects.'}));
module.exports=router;
