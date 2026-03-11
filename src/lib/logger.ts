
import fs from 'fs';
import path from 'path';

export function logToFile(msg: string, filename: string = 'debug.log') {
    try {
        const logPath = path.join(process.cwd(), filename);
        fs.appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n');
    } catch (e) {
        // console.error('Logging failed', e);
    }
}
