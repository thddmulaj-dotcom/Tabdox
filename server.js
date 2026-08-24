require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const BASE = process.env.AIRTEL_ENV === "production"
  ? "https://openapi.airtel.africa"
  : "https://openapiuat.airtel.africa";
const COUNTRY = process.env.AIRTEL_COUNTRY || "CD";
const CURRENCY = process.env.AIRTEL_CURRENCY || "CDF";

let tokenCache = null;
let tokenExpiry = 0;

async function getToken() {
  if (tokenCache && Date.now() < tokenExpiry) return tokenCache;
  const r = await fetch(`${BASE}/auth/oauth2/token`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });
  const text = await r.text();
  const data = JSON.parse(text);
  if (!r.ok || !data.access_token) throw new Error(text);
  tokenCache = data.access_token;
  tokenExpiry = Date.now() + Math.max(30,(data.expires_in || 300)-60)*1000;
  return tokenCache;
}

function phoneNumber(v) {
  const d = String(v || "").replace(/\D/g,"");
  return d.startsWith("0") ? "243" + d.slice(1) : d;
}

app.get("/health", (_,res)=>res.json({ok:true}));

app.post("/payments/airtel", async (req,res)=>{
  try {
    const {phone, plan, amount} = req.body;
    if (!phone || !plan || !Number.isFinite(Number(amount)))
      return res.status(400).json({success:false,status:"INVALID_REQUEST",message:"Téléphone, formule et montant obligatoires."});

    const id = `TADBOX-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const token = await getToken();

    const payload = {
      reference:id,
      subscriber:{country:COUNTRY,currency:CURRENCY,msisdn:phoneNumber(phone)},
      transaction:{amount:Number(amount),country:COUNTRY,currency:CURRENCY,id}
    };

    const r = await fetch(`${BASE}/merchant/v2/payments/`, {
      method:"POST",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json",
        Accept:"application/json",
        "X-Country":COUNTRY,
        "X-Currency":CURRENCY
      },
      body:JSON.stringify(payload)
    });
    const text = await r.text();
    let data; try { data=JSON.parse(text); } catch { data={raw:text}; }

    if (!r.ok) return res.status(r.status).json({
      success:false,status:"AIRTEL_ERROR",
      message:data?.message || text,transactionId:id
    });

    res.json({
      success:true,
      status:data?.data?.transaction?.status || data?.status || "PENDING",
      message:data?.message || "Demande de paiement envoyée.",
      transactionId:id
    });
  } catch(e) {
    res.status(500).json({success:false,status:"SERVER_ERROR",message:e.message});
  }
});

app.get("/payments/airtel/status/:id", async (req,res)=>{
  try {
    const token=await getToken();
    const r=await fetch(`${BASE}/standard/v1/payments/${encodeURIComponent(req.params.id)}`,{
      headers:{Authorization:`Bearer ${token}`,Accept:"application/json","X-Country":COUNTRY,"X-Currency":CURRENCY}
    });
    const text=await r.text();
    let data; try { data=JSON.parse(text); } catch { data={raw:text}; }
    if(!r.ok) return res.status(r.status).json({success:false,status:"AIRTEL_ERROR",message:data?.message||text,transactionId:req.params.id});
    const status=String(data?.data?.transaction?.status||data?.transaction?.status||data?.status||"UNKNOWN").toUpperCase();
    const paid=["SUCCESS","COMPLETED","SUCCESSFUL"].includes(status);
    res.json({success:paid,status,message:paid?"Paiement confirmé.":`Paiement: ${status}`,transactionId:req.params.id});
  } catch(e) {
    res.status(500).json({success:false,status:"SERVER_ERROR",message:e.message,transactionId:req.params.id});
  }
});

app.listen(PORT,()=>console.log(`Tadbox backend :${PORT}`));
