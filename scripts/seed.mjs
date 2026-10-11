// 数据导入脚本：cards + 默认式神评分（归属管理员 fofobwp）
// 运行方式：pnpm seed
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请确认 .env.local 已配置。"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ADMIN_USERNAME = "fofobwp";
const ADMIN_PASSWORD = "fofo123";

function readJson(name) {
  return JSON.parse(readFileSync(join(root, name), "utf-8"));
}

/** 按 id 去重（保留最后一条），避免 ON CONFLICT 批次内重复报错 */
function dedupeBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) map.set(keyFn(row), row);
  return Array.from(map.values());
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** 只保留数据表存在的字段，并做类型归一化 */
function normalizeCard(raw) {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    role: raw.role != null ? String(raw.role) : null,
    type: raw.type ?? null,
    xiyoudu: raw.xiyoudu ?? null,
    stage: raw.stage ?? null,
    ll: raw.ll ?? null,
    sm: raw.sm ?? null,
    desc: raw.desc ?? null,
    keyword: raw.keyword ?? null,
    faction: raw.faction ?? null,
    alias: Array.isArray(raw.alias) ? raw.alias : [],
  };
}

/** 式神评分条目：用 role 作为式神标识 */
function normalizeScore(raw) {
  return {
    role: String(raw.role ?? raw.id ?? raw.name ?? ""),
    name: raw.name ?? null,
    faction: raw.faction ?? null,
    jue_sheng: Number(raw.jue_sheng ?? 0),
    zhan_chang: Number(raw.zhan_chang ?? 0),
    jie_hou: Number(raw.jie_hou ?? 0),
    guo_pai: Number(raw.guo_pai ?? 0),
    xing_dong_dian: Number(raw.xing_dong_dian ?? 0),
    zeng_yi: Number(raw.zeng_yi ?? 0),
    qiang_shi_gou_ci: raw.qiang_shi_gou_ci ?? null,
    note: raw.note ?? null,
    score: Number(raw.score ?? 0),
    personal_score:
      raw.personal_score == null ? null : Number(raw.personal_score),
    evaluation: raw.evaluation ?? null,
  };
}

async function ensureAdmin() {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("users")
    .insert({
      username: ADMIN_USERNAME,
      password_hash: hashPassword(ADMIN_PASSWORD),
      nickname: "管理员",
      role: "admin",
    })
    .select("id")
    .single();
  if (error) {
    console.error("创建管理员账号失败：", error.message);
    process.exit(1);
  }
  return data.id;
}

async function upsertInChunks(table, rows, onConflict, chunkSize = 500) {
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) {
      console.error(`导入 ${table} 失败：`, error.message);
      process.exit(1);
    }
    done += chunk.length;
    console.log(`  ${table}: ${done}/${rows.length}`);
  }
}

async function main() {
  console.log("开始导入数据...");

  const adminId = await ensureAdmin();
  console.log(`管理员账号 ${ADMIN_USERNAME} id=${adminId}`);

  const cards = dedupeBy(
    readJson("json/cards_extracted.json").map(normalizeCard),
    (r) => r.id
  );
  await upsertInChunks("cards", cards, "id");

  const shishen = dedupeBy(
    readJson("json/shishen_data.json").map(normalizeScore),
    (r) => r.role
  );

  // 每个用户一条评分系统记录，shishen 为式神评分数组
  const { error: ratingError } = await supabase
    .from("shishen_ratings")
    .upsert(
      {
        user_id: adminId,
        shishen,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (ratingError) {
    console.error("导入默认式神评分失败：", ratingError.message);
    process.exit(1);
  }

  console.log(
    `完成：cards ${cards.length} 条，默认评分系统 ${shishen.length} 位式神。`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
