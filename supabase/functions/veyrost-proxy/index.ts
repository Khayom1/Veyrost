import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createProxyHandler } from "./proxy-core.ts";
Deno.serve(createProxyHandler({ env:{get:(name:string)=>Deno.env.get(name)} }));
