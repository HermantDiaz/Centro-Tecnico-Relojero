import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'start' ? 'start' : 'dev';

const apps = [
  { name: 'WEB:3000', workspace: '@relojeria/web', color: '\x1b[36m' },
  { name: 'ADMIN:3001', workspace: '@relojeria/admin', color: '\x1b[33m' },
];

const resetColor = '\x1b[0m';
const children = [];

console.log(
  `\n🚀 Iniciando ecosistema Relojería IA en modo [${mode.toUpperCase()}]...\n` +
    `   • Tienda B2C + Rastreo + Chatbot IA -> http://localhost:3000\n` +
    `   • ERP Administrativo / POS Taller   -> http://localhost:3001\n`
);

for (const app of apps) {
  const command = `npm run ${mode} --workspace=${app.workspace}`;
  const child = spawn(command, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  children.push(child);

  child.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      console.log(`${app.color}[${app.name}]${resetColor} ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      console.error(`${app.color}[${app.name}]${resetColor} ${line}`);
    }
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${app.color}[${app.name}]${resetColor} finalizó con código ${code}`);
    }
  });
}

const shutdown = () => {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
