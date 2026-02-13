import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAIN_LOG = path.join(LOG_DIR, 'app.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

class Logger {
    private lastMessage: string = '';
    private repeatCount: number = 0;
    private throttleTimeout: NodeJS.Timeout | null = null;

    constructor() {
        fs.ensureDirSync(LOG_DIR);
    }

    private getTimestamp() {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-GB', { hour12: false });
        return `${date} ${time}`;
    }

    private format(level: string, message: string) {
        return `[+] CraftCommand: ${this.getTimestamp()} - ${level}: ${message}`;
    }

    private async writeToFile(line: string) {
        try {
            // Rotation Logic
            if (fs.existsSync(MAIN_LOG)) {
                const stats = fs.statSync(MAIN_LOG);
                if (stats.size > MAX_LOG_SIZE) {
                    fs.moveSync(MAIN_LOG, path.join(LOG_DIR, `app-${Date.now()}.log`));
                }
            }
            fs.appendFileSync(MAIN_LOG, line + '\n');
        } catch (e) {
            console.error('FAILED TO WRITE TO LOG FILE:', e);
        }
    }

    private logThrottled(level: string, message: string, colorFn: (s: string) => string) {
        if (message === this.lastMessage) {
            this.repeatCount++;
            if (this.throttleTimeout) clearTimeout(this.throttleTimeout);
            
            this.throttleTimeout = setTimeout(() => {
                if (this.repeatCount > 0) {
                    const statusMsg = `(Previous message repeated ${this.repeatCount} times)`;
                    console.log(chalk.gray(this.format('STABILITY', statusMsg)));
                    this.writeToFile(this.format('STABILITY', statusMsg));
                    this.repeatCount = 0;
                    this.lastMessage = '';
                }
            }, 2000);
            return;
        }

        // If we were repeating and a new message comes in, flush the repeat status
        if (this.repeatCount > 0) {
            const statusMsg = `(Previous message repeated ${this.repeatCount} times)`;
            console.log(chalk.gray(this.format('STABILITY', statusMsg)));
            this.writeToFile(this.format('STABILITY', statusMsg));
            this.repeatCount = 0;
        }

        this.lastMessage = message;
        const formatted = this.format(level, message);
        console.log(colorFn(formatted));
        this.writeToFile(formatted);
    }

    info(message: string) {
        this.logThrottled('INFO', message, chalk.white);
    }

    success(message: string) {
        this.logThrottled('SUCCESS', message, chalk.green);
    }

    warn(message: string) {
        this.logThrottled('WARNING', message, chalk.yellow);
    }

    error(message: string) {
        this.logThrottled('ERROR', message, chalk.red);
    }

    debug(message: string) {
        if (process.env.NODE_ENV === 'development' || process.env.VERBOSE === 'true') {
            this.logThrottled('DEBUG', message, chalk.gray);
        }
    }

    raw(message: string) {
        console.log(message);
        this.writeToFile(message);
    }
}

export const logger = new Logger();
