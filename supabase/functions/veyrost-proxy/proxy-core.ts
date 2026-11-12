export type Env = { get(name: string): string | undefined };
type HandlerOptions = { env: Env; fetchImpl?: typeof fetch; now?: () => number; maxRequestsPerMinute?: number };
const JSON_HEADERS = { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" };
const MAX_BODY_BYTES = 1_000_000;
const WINDOW_MS = 60_000;
function json(data: unknown, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {status,headers:{...JSON_HEADERS,...headers}});
}
function decodeClaims(token:string):Record<string,unknown>|null {
  try {
    const part=token.split(".")[1]; if(!part)return null;
    const value=part.replace(/-/g,"+").replace(/_/g,"/");
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length/4)*4,"=")));
  } catch { return null; }
}
function blockedHost(hostname:string):boolean {
  const host=hostname.toLowerCase().replace(/^\[|\]$/g,"");
  if(!host||host==="localhost"||host.endsWith(".localhost")||/\.(local|internal|lan|home)$/.test(host)||
     host==="metadata.google.internal"||host==="metadata"||host==="instance-data"||host.includes("%")||host.includes(":"))return true;
  const p=host.split(".");
  if(p.length===4&&p.every(v=>/^\d{1,3}$/.test(v)&&Number(v)<=255)){
    const [a,b]=p.map(Number);
    if(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||
       (a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19)))return true;
  }
  return false;
}
function validHttps(value:string):URL|null {
  try { const u=new URL(value); return u.protocol==="https:"&&!u.username&&!u.password&&!blockedHost(u.hostname)?u:null; }
  catch { return null; }
}
function originAllowed(origin:string|null,env:Env):string|null {
  if(!origin)return null;
  const list=(env.get("VEYROST_ALLOWED_ORIGINS")||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!list.length)return "*";
  return list.includes(origin)?origin:null;
}
function cors(origin:string|null,env:Env):Record<string,string> {
  return {"access-control-allow-origin":originAllowed(origin,env)||"null","access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"POST, OPTIONS","access-control-max-age":"600","vary":"Origin"};
}
function githubRoute(path:string,method:string):boolean {
  if(path.length>1800||path.includes("\\")||/%2e|%2f|%5c/i.test(path)||path.split("/").some(x=>x==="."||x===".."))return false;
  if(path==="/user/repos")return method==="GET"||method==="POST";
  const m=path.match(/^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(.*))?$/);
  if(!m)return false;
  const tail=m[1]||"";
  if(!tail)return method==="GET";
  if(/^(actions\/secrets|environments\/[^/]+\/secrets|hooks|keys|deploy-keys|codespaces|dependabot\/secrets)(\/|$)/i.test(tail))return false;
  if(/^contents(\/|$)/.test(tail))return ["GET","PUT","DELETE"].includes(method);
  if(/^(commits|issues)(\/|$)/.test(tail))return method==="GET"||(method==="POST"&&tail==="issues");
  return false;
}
function allowedHeaders(value:unknown):Headers {
  const out=new Headers();
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    const x=value as Record<string,unknown>;
    for(const k of ["accept","content-type","x-github-api-version"]){const v=x[k];if(typeof v==="string"&&v.length<300)out.set(k,v);}
  }
  return out;
}
export function createProxyHandler(options:HandlerOptions) {
  const fetchImpl=options.fetchImpl||fetch, now=options.now||Date.now, limit=options.maxRequestsPerMinute??90;
  const buckets=new Map<string,{start:number,count:number}>();
  return async(req:Request):Promise<Response>=>{
    const origin=req.headers.get("origin"), ch=cors(origin,options.env);
    if(req.method==="OPTIONS"){if(origin&&originAllowed(origin,options.env)===null)return json({error:"origin_not_allowed"},403);return new Response("ok",{status:200,headers:ch});}
    if(origin&&originAllowed(origin,options.env)===null)return json({error:"origin_not_allowed"},403,ch);
    if(req.method!=="POST")return json({error:"method_not_allowed"},405,ch);
    const auth=req.headers.get("authorization")||"",match=auth.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/);
    if(!match)return json({error:"authentication_required"},401,ch);
    // The Supabase gateway must enforce JWT signature validation (verify_jwt=true).
    const claims=decodeClaims(match[1]);
    if(!claims||claims.role!=="authenticated"||typeof claims.sub!=="string"||!claims.sub||
       (typeof claims.exp==="number"&&claims.exp*1000<=now()))return json({error:"authenticated_user_required"},401,ch);
    const bucket=buckets.get(claims.sub);
    if(!bucket||now()-bucket.start>=WINDOW_MS)buckets.set(claims.sub,{start:now(),count:1});
    else {bucket.count++;if(bucket.count>limit)return json({error:"rate_limit_exceeded"},429,{...ch,"retry-after":"60"});}
    let raw="";try{raw=await req.text();}catch{return json({error:"invalid_body"},400,ch);}
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"request_too_large"},413,ch);
    let input:Record<string,unknown>;try{input=JSON.parse(raw);}catch{return json({error:"invalid_json"},400,ch);}
    if(!input||typeof input!=="object"||Array.isArray(input))return json({error:"invalid_payload"},400,ch);
    if(input.action==="health")return json({ok:true,authenticated:true},200,ch);
    const target=typeof input.target==="string"?validHttps(input.target):null;
    if(!target)return json({error:"target_not_allowed"},400,ch);
    const method=typeof input.method==="string"?input.method.toUpperCase():"GET";
    if(!["GET","POST","PUT","DELETE"].includes(method))return json({error:"method_not_allowed"},405,ch);
    const headers=allowedHeaders(input.headers);
    let body:string|undefined;
    if(method!=="GET"&&method!=="DELETE"&&typeof input.body==="string"){
      if(new TextEncoder().encode(input.body).byteLength>MAX_BODY_BYTES)return json({error:"upstream_body_too_large"},413,ch);
      body=input.body;
    }
    const host=target.hostname.toLowerCase();
    if(host==="api.deepseek.com"){
      if(target.pathname!=="/chat/completions"||method!=="POST")return json({error:"route_not_allowed"},403,ch);
      const key=options.env.get("DEEPSEEK_API_KEY");if(!key)return json({error:"provider_not_configured"},503,ch);
      headers.set("authorization","Bearer "+key);
    } else if(host==="api.siliconflow.com"){
      if(target.pathname!=="/v1/chat/completions"||method!=="POST")return json({error:"route_not_allowed"},403,ch);
      const key=options.env.get("SILICONFLOW_API_KEY");if(!key)return json({error:"provider_not_configured"},503,ch);
      headers.set("authorization","Bearer "+key);
    } else if(host==="api.github.com"){
      if(!githubRoute(target.pathname,method))return json({error:"github_route_not_allowed"},403,ch);
      const key=options.env.get("GITHUB_TOKEN");if(!key)return json({error:"github_not_configured"},503,ch);
      headers.set("authorization","Bearer "+key);headers.set("accept","application/vnd.github+json");headers.set("x-github-api-version","2022-11-28");
    } else if(host==="www.googleapis.com"){
      if(target.pathname!=="/customsearch/v1"||method!=="GET")return json({error:"google_route_not_allowed"},403,ch);
      const key=options.env.get("GOOGLE_API_KEY"),cx=options.env.get("GOOGLE_CX");
      if(!key||!cx)return json({error:"google_not_configured"},503,ch);
      target.searchParams.delete("key");target.searchParams.set("key",key);target.searchParams.set("cx",cx);
    } else if(host==="s.jina.ai"){
      if(method!=="GET")return json({error:"jina_method_not_allowed"},403,ch);
    } else if(host==="r.jina.ai"){
      if(method!=="GET")return json({error:"jina_method_not_allowed"},403,ch);
      const nested=target.pathname.replace(/^\/+/,"");
      if(!nested.startsWith("https://")||!validHttps(nested))return json({error:"jina_target_not_allowed"},400,ch);
    } else return json({error:"upstream_host_not_allowed"},403,ch);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60_000);
    try{
      const upstream=await fetchImpl(target.toString(),{method,headers,body,signal:controller.signal,redirect:"manual"});
      const rh=new Headers(ch);rh.set("cache-control","no-store");
      const ct=upstream.headers.get("content-type");if(ct)rh.set("content-type",ct);
      const retry=upstream.headers.get("retry-after");if(retry)rh.set("retry-after",retry);
      return new Response(upstream.body,{status:upstream.status,headers:rh});
    }catch(error){return controller.signal.aborted?json({error:"upstream_timeout"},504,ch):json({error:"upstream_unavailable"},502,ch);}
    finally{clearTimeout(timer);}
  };
}
