
import sharp from 'sharp';
import path from 'path';

async function checkMetadata() {
    const iconPath = path.join(__dirname, '..', '..', 'web', 'current', 'server-icon.png');
    try {
        const metadata = await sharp(iconPath).metadata();
        console.log(`Icon Metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}, depth: ${metadata.depth}, channels: ${metadata.channels}`);
    } catch (err) {
        console.error('Failed to read metadata:', err);
    }
}

checkMetadata();
