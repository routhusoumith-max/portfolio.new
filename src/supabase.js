import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vdmlugbfpqcvpwzqhqbh.supabase.co";

const supabaseKey = "sb_publishable_wxjXjltiZH4iV57QCKsqZQ_T0t5USWE";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);