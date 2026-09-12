

// import { createClient } from "@supabase/supabase-js";

// const supabaseURL =import.meta.env.VITE_SUPABASE_URL
// const supabaseKey=import.meta.env.VITE_SUPABASE_ANON_KEY 
// const supabase =  createClient(supabaseURL,supabaseKey)    

// export default supabase;



import { createClient } from "@supabase/supabase-js";

const envProcess = typeof globalThis !== "undefined" && globalThis.process ? globalThis.process.env : {};

const supabaseURL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) 
  || envProcess?.VITE_SUPABASE_URL 
  || "https://ztlhroslxqnzxdkedbcn.supabase.co";

const supabaseKey = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) 
  || envProcess?.VITE_SUPABASE_ANON_KEY 
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGhyb3NseHFuenhka2VkYmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTQyNzEsImV4cCI6MjA5NzE3MDI3MX0.85wuE_mCouGmakA9t3HG-x8Mzk8lJOyKN1PNKmXM9RQ";

const supabase = createClient(supabaseURL, supabaseKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export { supabase };
export default supabase;




// import { createClient } from "@supabase/supabase-js";

// const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
// const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // service_role
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // anon

// const supabase = createClient(
//   supabaseURL,
//   import.meta.env.DEV ? supabaseServiceKey : supabaseAnonKey, // 👈 use service locally, anon on live
//   { realtime: { params: { eventsPerSecond: 10 } } }
// );

// export default supabase;
