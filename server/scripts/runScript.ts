import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the script name from command line arguments
const scriptName = process.argv[2];

if (!scriptName) {
  console.error('Error: Please provide a script name as an argument.');
  console.error('Usage: npm run script <scriptName>');
  process.exit(1);
}

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build the full path to the script
const scriptPath = path.join(__dirname, `${scriptName}.ts`);

// Execute the script with tsx
const command = `npx tsx ${scriptPath}`;
console.log(`Running script: ${command}`);

const childProcess = exec(command);

// Forward stdout and stderr to the parent process
childProcess.stdout?.pipe(process.stdout);
childProcess.stderr?.pipe(process.stderr);

// Handle process exit
childProcess.on('exit', (code) => {
  console.log(`Script exited with code ${code}`);
  process.exit(code || 0);
});