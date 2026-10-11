import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password";

interface Body {
  username?: string;
  password?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "请输入用户名和密码" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, nickname, role, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  const { password_hash: _omit, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
