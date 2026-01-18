// start.js - Orchestrator for multi-project workspace
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  backend: '\x1b[36m',   // Cyan
  frontend: '\x1b[33m',  // Yellow
  docker: '\x1b[35m',    // Magenta
  error: '\x1b[31m',     // Red
};

const processes = [];

// Helper function to create colored log prefix
const logPrefix = (service, color) => {
  const timestamp = new Date().toLocaleTimeString();
  return `${colors.bright}[${timestamp}]${colors.reset} ${color}[${service}]${colors.reset}`;
};

// Helper to spawn process with logging
const spawnProcess = (name, command, args, options, color) => {
  console.log(`${logPrefix(name, color)} Starting ${name}...`);
  
  const proc = spawn(command, args, {
    ...options,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${logPrefix(name, color)} ${output}`);
    }
  });

  proc.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${logPrefix(name, colors.error)} ${output}`);
    }
  });

  proc.on('error', (error) => {
    console.error(`${logPrefix(name, colors.error)} Failed to start: ${error.message}`);
  });

  proc.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.log(`${logPrefix(name, colors.error)} Exited with code ${code}`);
    } else if (signal) {
      console.log(`${logPrefix(name, color)} Terminated by signal ${signal}`);
    }
  });

  processes.push({ name, proc, color });
  return proc;
};

// Graceful shutdown handler
const shutdown = () => {
  console.log(`\n${colors.bright}Shutting down all services...${colors.reset}`);
  
  processes.forEach(({ name, proc, color }) => {
    if (proc && !proc.killed) {
      console.log(`${logPrefix(name, color)} Stopping...`);
      proc.kill('SIGTERM');
    }
  });

  // Force kill after 5 seconds if processes don't stop gracefully
  setTimeout(() => {
    processes.forEach(({ name, proc, color }) => {
      if (proc && !proc.killed) {
        console.log(`${logPrefix(name, colors.error)} Force stopping...`);
        proc.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
};

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  processes.forEach(({ proc }) => {
    if (proc && !proc.killed) {
      proc.kill('SIGKILL');
    }
  });
});

console.log(`${colors.bright}=== Starting Frontend Development Server ===${colors.reset}\n`);

// Launch Frontend (Static HTTP Server para index.html)
// Sirve el Frontend/index.html y archivos estáticos en puerto 5500
const frontend = spawnProcess(
  'Frontend',
  'npx',
  ['http-server', '.', '-p', '5500', '-c-1', '--cors', '-o', '/index.html'],
  { cwd: path.join(__dirname, 'Frontend') },
  colors.frontend
);

console.log(`\n${colors.bright}=== Frontend started ===${colors.reset}`);
console.log(`${colors.frontend}Frontend:${colors.reset}  http://localhost:5500 (index.html)`);
console.log(`\nPress ${colors.bright}Ctrl+C${colors.reset} to stop Frontend server\n`);
