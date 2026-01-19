
import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isWindows = os.platform() === 'win32';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}[Tauri Dev Wrapper] ${message}${colors.reset}`);
}

function killPort() {
  log(`Checking port ${PORT} for existing processes...`, colors.cyan);

  try {
    if (isWindows) {
      const scriptPath = path.join(__dirname, 'kill-port.ps1');
      // Using -Force to skip confirmation
      execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Port ${PORT} -Force`, {
        stdio: 'inherit',
      });
    } else {
      const scriptPath = path.join(__dirname, 'kill-port.sh');
      // Using -f/--force to skip confirmation
      execSync(`bash "${scriptPath}" ${PORT} --force`, {
        stdio: 'inherit',
      });
    }
    log('Port cleanup completed.', colors.green);
  } catch (_error) {
    // It's possible the script fails if no process is found (though the scripts should handle that gracefully-ish)
    // or if permissions are missing. We'll log a warning but try to proceed.
    log('Warning during port cleanup. Proceeding anyway...', colors.yellow);
  }
}

function startDevServer() {
  log('Starting Next.js dev server...', colors.cyan);

  // The original command from tauri.conf.json
  const command = 'cross-env';
  const args = ['TAURI=true', 'pnpm', 'dev', '-p', String(PORT)];

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true, // Use shell to ensure command is found and handled correctly
  });

  child.on('error', (err) => {
    log(`Failed to start dev server: ${err.message}`, colors.red);
    process.exit(1);
  });

  child.on('close', (code) => {
    log(`Dev server exited with code ${code}`, code === 0 ? colors.green : colors.yellow);
    process.exit(code ?? 0);
  });
}

// Main execution flow
try {
  killPort();
  startDevServer();
} catch (error) {
  log(`Unexpected error: ${error}`, colors.red);
  process.exit(1);
}
