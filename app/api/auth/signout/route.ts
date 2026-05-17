import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Sign out from Supabase Auth
  await supabase.auth.signOut();

  const url = new URL(request.url);
  url.pathname = "/";
  return NextResponse.redirect(url, {
    status: 303, // See Other (forces a GET request)
  });
}
