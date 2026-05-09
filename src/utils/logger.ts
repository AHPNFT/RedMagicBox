let RNFS: {
  DocumentDirectoryPath: string;
  mkdir: (p: string) => Promise<void>;
  exists: (p: string) => Promise<boolean>;
  writeFile: (p: string, c: string, e?: string) => Promise<void>;
  appendFile: (p: string, c: string, e?: string) => Promise<void>;
  readFile: (p: string, e?: string) => Promise<string>;
  readDir: (p: string) => Promise<Array<{ name: string; path: string; mtime: number; isFile: () => boolean }>>;
  unlink: (p: string) => Promise<void>;
} | null = null;
try { RNFS = require('react-native-fs'); } catch {}

type Level = 'START' | 'STOP' | 'TOUCH' | 'NAV' | 'INFO' | 'WARN' | 'ERROR' | 'NET' | 'PERM' | 'CRYPTO' | 'FILE';

const BUFFER_SIZE = 10;
const FLUSH_MS = 3000;
const RETENTION_DAYS = 7;

interface Entry {
  ts: number;
  level: Level;
  tag: string;
  msg: string;
}

let buffer: Entry[] = [];
let logDir = '';
let timer: ReturnType<typeof setInterval> | null = null;
let seq = 0;

function pad(n: number, w: number): string {
  return n.toString().padStart(w, '0');
}

function ts(): string {
  const d = new Date();
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${Math.floor(d.getMilliseconds() / 100)}`;
}

function dateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

function fmt(e: Entry): string {
  return `[${ts()}] [#${pad(e.ts % 100000, 5)}] [${e.level.padEnd(6)}] [${e.tag}] ${e.msg}`;
}

async function flush(): Promise<void> {
  if (buffer.length === 0 || !logDir || !RNFS) return;
  const batch = buffer.splice(0);
  try {
    const file = `${logDir}/hongmo_${dateStr()}.log`;
    const lines = batch.map(fmt).join('\n') + '\n';
    if (await RNFS.exists(file)) {
      await RNFS.appendFile(file, lines, 'utf8');
    } else {
      await RNFS.writeFile(file, lines, 'utf8');
    }
  } catch {}
}

async function clean(): Promise<void> {
  if (!logDir || !RNFS) return;
  try {
    if (!(await RNFS.exists(logDir))) return;
    const cutoff = Date.now() - RETENTION_DAYS * 86400000;
    const entries = await RNFS.readDir(logDir);
    for (const e of entries) {
      if (e.isFile() && e.name.startsWith('hongmo_') && e.name.endsWith('.log') && e.mtime < cutoff / 1000) {
        try { await RNFS.unlink(e.path); } catch {}
      }
    }
  } catch {}
}

function add(level: Level, tag: string, msg: string): void {
  seq++;
  const entry: Entry = { ts: seq, level, tag, msg };
  const line = fmt(entry);
  switch (level) {
    case 'ERROR': console.error(line); break;
    case 'WARN': console.warn(line); break;
    default: console.log(line); break;
  }
  buffer.push(entry);
  if (level === 'ERROR' || buffer.length >= BUFFER_SIZE) {
    flush();
  }
}

export async function initLogger(workspacePath?: string): Promise<void> {
  if (!RNFS) return;
  const dir = workspacePath ? `${workspacePath}/logs` : `${RNFS.DocumentDirectoryPath}/hongmo_logs`;
  try {
    if (!(await RNFS.exists(dir))) await RNFS.mkdir(dir);
    logDir = dir;
    await clean();
    if (timer) clearInterval(timer);
    timer = setInterval(() => { flush(); clean(); }, FLUSH_MS);
    add('START', 'Logger', `日志系统初始化, 目录: ${dir}`);
  } catch {
    add('ERROR', 'Logger', '日志目录创建失败');
  }
}

export async function shutdownLogger(): Promise<void> {
  add('STOP', 'Logger', '日志系统关闭');
  if (timer) { clearInterval(timer); timer = null; }
  await flush();
}

export const log = {
  start: (tag: string, msg: string) => add('START', tag, msg),
  stop: (tag: string, msg: string) => add('STOP', tag, msg),
  touch: (tag: string, msg: string) => add('TOUCH', tag, msg),
  nav: (tag: string, msg: string) => add('NAV', tag, msg),
  info: (tag: string, msg: string) => add('INFO', tag, msg),
  warn: (tag: string, msg: string) => add('WARN', tag, msg),
  error: (tag: string, msg: string) => add('ERROR', tag, msg),
  net: (tag: string, msg: string) => add('NET', tag, msg),
  perm: (tag: string, msg: string) => add('PERM', tag, msg),
  crypto: (tag: string, msg: string) => add('CRYPTO', tag, msg),
  file: (tag: string, msg: string) => add('FILE', tag, msg),
};
