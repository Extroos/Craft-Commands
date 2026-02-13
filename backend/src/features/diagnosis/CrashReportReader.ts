import fs from 'fs-extra';
import path from 'path';
import { logger } from '../../utils/logger';

export interface CrashReport {
    filename: string;
    description: string;
    content: string;
    timestamp: number;
}

export class CrashReportReader {
    
    /**
     * Finds and reads the most recent crash report for a server.
     * Only considers reports generated in the last 10 minutes to ensure relevance.
     */
    static async getRecentCrashReport(serverCwd: string): Promise<CrashReport | null> {
        try {
            const crashDir = path.join(serverCwd, 'crash-reports');
            if (!await fs.pathExists(crashDir)) return null;

            const files = await fs.readdir(crashDir);
            const crashFiles = files.filter(f => 
                (f.endsWith('.txt') && f.startsWith('crash-')) || 
                (f.startsWith('hs_err_pid') && f.endsWith('.log'))
            );

            if (crashFiles.length === 0) return null;

            // Sort by time (filename usually has date, but we check fs stats for accuracy)
            const fileStats = await Promise.all(crashFiles.map(async file => {
                const filePath = path.join(crashDir, file);
                const stat = await fs.stat(filePath);
                return { file, mtime: stat.mtimeMs, path: filePath };
            }));

            // Get newest
            const newest = fileStats.sort((a, b) => b.mtime - a.mtime)[0];

            // Filter out old crashes (older than 10 mins)
            // This prevents diagnosing a crash from last week as a current issue
            const TEN_MINUTES = 10 * 60 * 1000;
            if (Date.now() - newest.mtime > TEN_MINUTES) {
                return null;
            }

            const content = await fs.readFile(newest.path, 'utf-8');
            const description = this.extractDescription(content);

            logger.info(`[CrashReportReader] Found recent crash report: ${newest.file}`);

            return {
                filename: newest.file,
                description,
                content,
                timestamp: newest.mtime
            };

        } catch (error) {
            logger.warn(`[CrashReportReader] Failed to read crash reports: ${error}`);
            return null;
        }
    }

    private static extractDescription(content: string): string {
        const lines = content.split('\n');
        // Minecraft crash reports usually have a "Description: " line near the top
        const descLine = lines.find(l => l.trim().startsWith('Description: '));
        if (descLine) {
            return descLine.replace('Description: ', '').trim();
        }
        // Fallback: Try to find the exception type
        const exceptionLine = lines.find(l => l.includes('Exception') || l.includes('Error'));
        return exceptionLine ? exceptionLine.trim() : 'Unknown Error';
    }
}
