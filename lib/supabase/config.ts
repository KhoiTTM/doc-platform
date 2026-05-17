export function getSupabaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  
  if (!url) {
    return "https://placeholder-id.supabase.co";
  }

  url = url.trim();

  // If the user only inputted the project ID, e.g., 'ljqycbcvqfdgekufwolw'
  if (!url.startsWith("http")) {
    if (url.includes("supabase.co")) {
      url = `https://${url}`;
    } else {
      url = `https://${url}.supabase.co`;
    }
  }

  return url;
}

export function getSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
}
