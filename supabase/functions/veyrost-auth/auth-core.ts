type Env = { get(name:string):string|undefined };
type Options = { env:Env; fetchImpl?:typeof fetch; now?:()=>number };
function json(data:unknown,status:number,headers:HeadersInit={}){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});}
function publicKey(env:Env):string{
  const direct=env.get("SUPABASE_PUBLISHABLE_KEY")||env.get("VEYROST_SUPABASE_PUBLISHABLE_KEY");if(direct)return direct;
  const raw=env.get("SUPABASE_PUBLISHABLE_KEYS");if(raw){try{const x=JSON.parse(raw);if(typeof x.default==="string")return x.default;}catch{}}
  return env.get("SUPABASE_ANON_KEY")||"";
}
function cors(origin:string|null,env:Env):Record<string,string>{
  const list=(env.get("VEYROST_ALLOWED_ORIGINS")||"https://veyrost.is-a.dev,https://khayom1.github.io").split(",").map(x=>x.trim()).filter(Boolean);
  return {"access-control-allow-origin":!origin?"*":(!list.length?"*":(list.includes(origin)?origin:"null")),"access-control-allow-headers":"apikey, content-type","access-control-allow-methods":"POST, OPTIONS","access-control-max-age":"600","vary":"Origin"};
}
export function createAuthHandler(options:Options){
  const fetchImpl=options.fetchImpl||fetch,now=options.now||Date.now,buckets=new Map<string,{start:number,count:number}>();
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get("origin"),ch=cors(origin,options.env);
    if(ch["access-control-allow-origin"]==="null")return json({error:"origin_not_allowed"},403,ch);
    if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:ch});
    if(req.method!=="POST")return json({error:"method_not_allowed"},405,ch);
    const ip=(req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim().slice(0,80),b=buckets.get(ip);
    if(!b||now()-b.start>=60_000)buckets.set(ip,{start:now(),count:1});
    else{b.count++;if(b.count>8)return json({error:"rate_limit_exceeded"},429,{...ch,"retry-after":"60"});}
    let raw="";try{raw=await req.text();}catch{return json({error:"invalid_body"},400,ch);}
    if(new TextEncoder().encode(raw).byteLength>16_384)return json({error:"request_too_large"},413,ch);
    let input:Record<string,unknown>;try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400,ch);}
    const action=input?.action,email=typeof input?.email==="string"?input.email.trim().slice(0,254):"",password=typeof input?.password==="string"?input.password:"";
    if(!["sign_up","sign_in","refresh","sign_out"].includes(String(action)))return json({error:"unsupported_auth_action"},400,ch);
    if(!["refresh","sign_out"].includes(String(action))&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"invalid_email"},400,ch);
    if(!["refresh","sign_out"].includes(String(action))&&password.length<8)return json({error:"invalid_password"},400,ch);
    const base=(options.env.get("SUPABASE_URL")||"").replace(/\/+$/,""),key=publicKey(options.env);
    if(!base||!key)return json({error:"auth_service_not_configured"},503,ch);
    if(req.headers.get("apikey")!==key)return json({error:"invalid_publishable_key"},401,ch);
    let endpoint="",body:Record<string,unknown>={};
    if(action==="sign_up"){endpoint="/auth/v1/signup";body={email,password};}
    if(action==="sign_in"){endpoint="/auth/v1/token?grant_type=password";body={email,password};}
    if(action==="refresh"){const refresh=typeof input.refresh_token==="string"?input.refresh_token:"";if(!refresh)return json({error:"refresh_token_required"},400,ch);endpoint="/auth/v1/token?grant_type=refresh_token";body={refresh_token:refresh};}
    if(action==="sign_out"){
      const access=typeof input.access_token==="string"?input.access_token:"";
      if(access){try{await fetchImpl(base+"/auth/v1/logout",{method:"POST",headers:{"apikey":key,"authorization":"Bearer "+access},signal:AbortSignal.timeout(15_000)});}catch{}}
      return json({ok:true},200,ch);
    }
    try{
      const upstream=await fetchImpl(base+endpoint,{method:"POST",headers:{"apikey":key,"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000),redirect:"manual"});
      let data:Record<string,unknown>={};try{data=await upstream.json();}catch{}
      if(!upstream.ok){const message=typeof data.msg==="string"?data.msg:(typeof data.message==="string"?data.message:"authentication_failed");return json({error:message.slice(0,180)},upstream.status,ch);}
      const rawUser = data.user && typeof data.user === "object" ? data.user as Record<string,unknown> : {};
      const safeUser = {
        id: typeof rawUser.id === "string" ? rawUser.id : null,
        email: typeof rawUser.email === "string" ? rawUser.email : null,
        role: typeof rawUser.role === "string" ? rawUser.role : null,
        created_at: typeof rawUser.created_at === "string" ? rawUser.created_at : null,
        email_confirmed_at: typeof rawUser.email_confirmed_at === "string" ? rawUser.email_confirmed_at : null
      };
      return json({ok:true,access_token:typeof data.access_token==="string"?data.access_token:null,refresh_token:typeof data.refresh_token==="string"?data.refresh_token:null,expires_in:typeof data.expires_in==="number"?data.expires_in:null,token_type:typeof data.token_type==="string"?data.token_type:null,user:rawUser.id?safeUser:null,needs_email_confirmation:!data.access_token,publishable_key:key},200,ch);
    }catch{return json({error:"auth_upstream_unavailable"},502,ch);}
  };
}
