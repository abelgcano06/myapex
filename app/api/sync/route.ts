import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = "c:/garmin-ai/data";
const STATUS_FILE = path.join(DATA_DIR, "sync_status.json");
const LOG_FILE = path.join(DATA_DIR, "sync_log.txt");
const SYNC_SCRIPT = "c:/garmin-ai/run_sync.py";

interface SyncStatus {
  status: "idle" | "starting" | "running" | "done" | "error";
  step?: string;
  new_activities?: number;
  days_back?: number;
  started_at?: string;
  finished_at?: string;
  message?: string;
}

const STALE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

function readStatus(): SyncStatus {
  if (!fs.existsSync(STATUS_FILE)) return { status: "idle" };
  try {
    const s = JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")) as SyncStatus;
    // Auto-reset if stuck in running/starting for more than 20 min (e.g. machine reboot)
    if ((s.status === "running" || s.status === "starting") && s.started_at) {
      const age = Date.now() - new Date(s.started_at).getTime();
      if (age > STALE_TIMEOUT_MS) {
        const reset: SyncStatus = { status: "idle" };
        fs.writeFileSync(STATUS_FILE, JSON.stringify(reset), "utf-8");
        return reset;
      }
    }
    return s;
  } catch {
    return { status: "idle" };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ?log=1 returns the raw Python log for debugging
  if (searchParams.get("log") === "1") {
    const log = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, "utf-8")
      : "(sin log)";
    return new Response(log, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  return NextResponse.json(readStatus());
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const sections = searchParams.get("sections") ?? "sleep,day,activities,master,ftp,profile";

  const current = readStatus();
  if (current.status === "running" || current.status === "starting") {
    return NextResponse.json(
      { ok: false, error: "Sync already running", step: current.step },
      { status: 409 }
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Clear old log
  fs.writeFileSync(LOG_FILE, `=== SYNC ${new Date().toISOString()} ===\n`, "utf-8");

  // Write initial status so the UI sees it immediately
  fs.writeFileSync(
    STATUS_FILE,
    JSON.stringify({ status: "starting", started_at: new Date().toISOString() }),
    "utf-8"
  );

  const PYTHON = process.env.PYTHON_BIN ?? "c:/garmin-ai/.venv/Scripts/python.exe";

  // On Windows, passing file descriptors to shell:true + detached processes fails.
  // Spawn Python directly (no shell) and let it write its own log via --log-file.
  const proc = spawn(PYTHON, [SYNC_SCRIPT, "--log-file", LOG_FILE, "--sections", sections], {
    cwd: "c:/garmin-ai",
    detached: true,
    shell: false,
    stdio: "ignore",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  proc.on("error", (err) => {
    fs.appendFileSync(LOG_FILE, `\n[spawn error] ${err.message}\n`);
    fs.writeFileSync(
      STATUS_FILE,
      JSON.stringify({ status: "error", message: `No se pudo iniciar Python: ${err.message}` }),
      "utf-8"
    );
  });

  proc.unref();

  return NextResponse.json({ ok: true, message: "Sync started" });
}
