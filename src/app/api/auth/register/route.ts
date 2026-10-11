import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";

interface Body {
  username?: string;
  password?: string;
  nickname?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const username = body.username?.trim();
  const password = body.password ?? "";
  const nickname = body.nickname?.trim() || username;

  if (!username || username.length < 3) {
    return NextResponse.json(
      { error: "用户名至少 3 个字符" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      username,
      password_hash: hashPassword(password),
      nickname,
      role: "user",
    })
    .select("id, username, nickname, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
