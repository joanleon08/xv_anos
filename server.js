const express=require("express"), cors=require("cors"), crypto=require("crypto");
const {createClient}=require("@supabase/supabase-js");
const app=express(); app.use(cors()); app.use(express.json());
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const ADMIN_KEY=process.env.ADMIN_KEY;
function code(){return "XV-"+crypto.randomBytes(3).toString("hex").toUpperCase();}
app.post("/register",async(req,res)=>{
 let {nombre,asiste,acompanantes=[]}=req.body;
 nombre=(nombre||"").trim(); acompanantes=(acompanantes||[]).slice(0,3).map(String);
 if(!nombre)return res.status(400).json({error:"Nombre requerido"});
 let codigo=code();
 let {error}=await supabase.from("guests").insert({nombre,asiste,acompanantes,codigo});
 if(error)return res.status(500).json({error:"No se pudo guardar el registro."});
 res.json({codigo});
});
app.post("/checkin",async(req,res)=>{
 if(req.body.adminKey!==ADMIN_KEY)return res.status(403).json({error:"Clave de administrador incorrecta."});
 const codigo=(req.body.codigo||"").toUpperCase();
 let {data,error}=await supabase.from("guests").select("*").eq("codigo",codigo).single();
 if(error||!data)return res.status(404).json({error:"Código no encontrado."});
 if(!data.asiste)return res.status(400).json({error:"El invitado indicó que no asistiría."});
 if(data.entrada)return res.status(409).json({error:"Este código ya fue utilizado."});
 let up=await supabase.from("guests").update({entrada:true,entrada_at:new Date().toISOString()}).eq("id",data.id);
 if(up.error)return res.status(500).json({error:"No se pudo registrar la entrada."});
 res.json({nombre:data.nombre,acompanantes:data.acompanantes.length});
});
app.get("/guests",async(req,res)=>{
 if(req.headers.adminkey!==ADMIN_KEY)return res.status(403).json({error:"No autorizado"});
 let {data,error}=await supabase.from("guests").select("*").order("created_at",{ascending:false});
 if(error)return res.status(500).json({error:"Error al consultar."});
 res.json({total:data.length,personas:data.reduce((n,x)=>n+(x.asiste?1+x.acompanantes.length:0),0),guests:data.map(x=>({nombre:x.nombre,acompanantes:x.acompanantes.length,entrada:x.entrada}))});
});
app.listen(process.env.PORT||3000);