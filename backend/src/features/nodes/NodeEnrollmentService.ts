import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { nodeRegistryService } from './NodeRegistryService';
import { systemSettingsService } from '../system/SystemSettingsService';
import { logger } from '../../utils/logger';

export class NodeEnrollmentService {
    private templatePath: string;
    private agentPath: string;

    constructor() {
        this.templatePath = path.join(__dirname, '../../../templates/bootstrap.bat.template');
        this.agentPath = path.join(__dirname, '../../../../agent');
    }

    /**
     * Create a ZIP stream containing the pre-configured agent.
     */
    async createEnrollmentPackage(nodeId: string, token: string, panelUrl: string): Promise<NodeJS.ReadableStream> {
        const node = nodeRegistryService.getNode(nodeId);
        if (!node) throw new Error('Node not found');
        if (!node.enrollmentSecret) throw new Error('Node has no enrollment secret');
        if (!node.enrollmentToken || node.enrollmentToken !== token) {
            throw new Error('Invalid or expired enrollment token');
        }

        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Load and process the .bat template
        let batContent = await fs.readFile(this.templatePath, 'utf8');
        batContent = batContent
            .replace(/{{NODE_ID}}/g, nodeId)
            .replace(/{{NODE_SECRET}}/g, node.enrollmentSecret)
            .replace(/{{PANEL_URL}}/g, panelUrl)
            .replace(/{{NODE_NAME}}/g, node.name);

        // Bundle agent files
        // We include dist/ and package.json
        const distPath = path.join(this.agentPath, 'dist');
        const pkgPath = path.join(this.agentPath, 'package.json');

        if (!fs.existsSync(distPath)) {
            logger.error(`[Enrollment] Agent dist folder missing at ${distPath}. Build the agent first!`);
            throw new Error('Agent distribution files are missing. Please contact administrator.');
        }

        archive.append(batContent, { name: 'bootstrap_agent.bat' });
        archive.directory(distPath, 'dist');
        
        if (fs.existsSync(pkgPath)) {
            archive.file(pkgPath, { name: 'package.json' });
        }

        // Add a Readme
        const readme = `CraftCommand Node Agent Setup
-------------------------------
1. Extract this ZIP to a folder.
2. Ensure Node.js is installed (v18+).
3. Run bootstrap_agent.bat.

The agent will automatically connect to your panel at:
${panelUrl}
`;
        archive.append(readme, { name: 'README.txt' });

        archive.finalize();
        return archive;
    }
}

export const nodeEnrollmentService = new NodeEnrollmentService();
