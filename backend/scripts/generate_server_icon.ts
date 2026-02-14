
import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

async function generateIcon() {
    const source = path.join(__dirname, '..', '..', 'frontend', 'public', 'website-icon.png');
    const destFrontend = path.join(__dirname, '..', '..', 'frontend', 'public', 'server-icon.png');
    const destWeb = path.join(__dirname, '..', '..', 'web', 'current', 'server-icon.png');

    console.log(`Generating icon from: ${source}`);

    if (!(await fs.pathExists(source))) {
        console.error('Source icon not found!');
        process.exit(1);
    }

    try {
        const buffer = await sharp(source)
            .resize(64, 64, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer();

        await fs.writeFile(destFrontend, buffer);
        console.log(`Created: ${destFrontend}`);

        if (await fs.pathExists(path.dirname(destWeb))) {
            await fs.writeFile(destWeb, buffer);
            console.log(`Created: ${destWeb}`);
        }

        console.log('Icon generation successful.');
    } catch (err) {
        console.error('Failed to generate icon:', err);
        process.exit(1);
    }
}

generateIcon();
