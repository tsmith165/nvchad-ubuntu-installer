#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Logger configuration
const logFile = 'debug.log';
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    logStream.write(logMessage);
    console.log(message);
}

function logError(message) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}\n`;
    logStream.write(errorMessage);
    console.error(message);
}

// Prerequisites check
const prerequisites = [
    { name: 'Node.js', command: 'node --version', minVersion: 'v14.0.0' },
    { name: 'npm', command: 'npm --version', minVersion: '6.0.0' },
    { name: 'Git', command: 'git --version', minVersion: '2.0.0' },
];

prerequisites.forEach((prereq) => {
    try {
        const version = execSync(prereq.command, { encoding: 'utf8' }).trim();
        log(`${prereq.name} version: ${version}`);

        const currentVersion = version.replace(/^v/, '');
        const requiredVersion = prereq.minVersion.replace(/^v/, '');

        if (currentVersion < requiredVersion) {
            logError(
                `${prereq.name} version ${prereq.minVersion} or higher is required. Please update ${prereq.name} and run the script again.`
            );
            process.exit(1);
        }
    } catch (error) {
        logError(`${prereq.name} is not installed. Please install it and run the script again.`);
        process.exit(1);
    }
});

// Helper function to run shell commands
function runCommand(command) {
    try {
        execSync(command, { stdio: 'inherit' });
        log(`Command executed: ${command}`);
    } catch (error) {
        logError(`Error executing command: ${command}`);
        logError(error.message);
        process.exit(1);
    }
}

// Install NeoVim if not already installed
log('Checking if NeoVim is installed...');
try {
    execSync('nvim --version', { stdio: 'inherit' });
    log('NeoVim is already installed.');
} catch (error) {
    log('Installing NeoVim...');
    runCommand('sudo apt-get install neovim');
    log('NeoVim installation completed.');
}

// Install JetBrains Mono Nerd Font
log('Installing JetBrains Mono Nerd Font...');
const fontDir = path.join(process.env.HOME, '.local', 'share', 'fonts');
if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
}

const fontZip = 'JetBrainsMono.zip';
const fontUrl = 'https://download.jetbrains.com/fonts/JetBrainsMono-2.242.zip';
runCommand(`curl -L -o ${fontZip} ${fontUrl}`);
runCommand(`unzip -q ${fontZip} -d ${fontDir}`);
fs.unlinkSync(fontZip);
runCommand('fc-cache -f');
log('JetBrains Mono Nerd Font installation completed.');

// Install NVChad
log('Checking if NVChad is installed...');
const nvimDir = path.join(process.env.HOME, '.config', 'nvim');
if (fs.existsSync(nvimDir)) {
    log('Removing existing NVChad installation...');
    fs.rmdirSync(nvimDir, { recursive: true });
    log('Existing NVChad installation removed.');
}

log('Installing NVChad...');
runCommand(`git clone -b v2.0 https://github.com/NvChad/NvChad ${nvimDir} --depth 1`);
log('NVChad installation completed.');

// Configure NVChad / LSPs
log('Configuring NVChad and LSPs...');
const customDir = path.join(nvimDir, 'lua', 'custom');
if (!fs.existsSync(customDir)) {
    fs.mkdirSync(customDir, { recursive: true });
}

const configFiles = [
    { src: path.join(__dirname, 'configs', 'chadrc.lua'), dest: path.join(nvimDir, 'lua', 'custom', 'chadrc.lua') },
    { src: path.join(__dirname, 'configs', 'plugins.lua'), dest: path.join(nvimDir, 'lua', 'custom', 'plugins.lua') },
    { src: path.join(__dirname, 'configs', 'lspconfig.lua'), dest: path.join(nvimDir, 'lua', 'plugins', 'configs', 'lspconfig.lua') },
];

configFiles.forEach((file) => {
    fs.copyFileSync(file.src, file.dest);
    log(`Copied ${file.src} to ${file.dest}`);
});
log('NVChad and LSPs configuration completed.');

// Install LSPs (Python / TypeScript)
log('Installing LSPs for Python and TypeScript...');
runCommand('sudo npm install -g pyright');
runCommand('sudo npm install -g typescript-language-server');
log('LSPs for Python and TypeScript installed.');

log('Setup completed successfully!');
logStream.end();
