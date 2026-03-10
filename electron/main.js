const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load .env for dev
// Attempt to load .env from resources in production
require('dotenv').config({ path: path.join(process.resourcesPath, '.env') });

let mainWindow;
let nextApp;

const PORT = 3001; // Use a different port to avoid conflicts with dev server

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: 'Tedifici',
    });

    // Load the Next.js app
    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function startNextApp() {
    const serverPath = path.join(__dirname, '../.next/standalone/server.js');

    // Check if we are in development or production
    // In production (bundled), the path might differ depending on how we package it
    // For now, let's assume we copy .next/standalone to resources in the builder config

    console.log('Starting Next.js server at:', serverPath);
    console.log('GOOGLE_API_KEY present:', !!process.env.GOOGLE_API_KEY);

    nextApp = spawn('node', [serverPath], {
        env: { ...process.env, PORT: PORT.toString() },
        cwd: path.join(__dirname, '../.next/standalone'), // Set CWD to standalone folder
    });

    nextApp.stdout.on('data', (data) => {
        console.log(`Next.js stdout: ${data}`);
    });

    nextApp.stderr.on('data', (data) => {
        console.error(`Next.js stderr: ${data}`);
    });

    // Wait for the server to be ready
    try {
        await waitOn({ resources: [`http://localhost:${PORT}`] });
        createWindow();
    } catch (err) {
        console.error('Failed to wait for Next.js server:', err);
    }
}

app.on('ready', startNextApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (nextApp) {
        nextApp.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow(); // In case we want to support re-opening on macOS, logic would need adjustment for server state
    }
});
