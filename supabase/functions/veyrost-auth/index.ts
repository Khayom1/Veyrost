import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAuthHandler } from "./auth-core.ts";
Deno.serve(createAuthHandler({ env:{get:(name:string)=>Deno.env.get(name)} }));
