
import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

async function verify() {
    const testFile = path.join(__dirname, 'test_large_icon.png');
    const stabilizedFile = path.join(__dirname, 'stabilized_icon.png');

    // Create a dummy large image (red square 512x512)
    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
    }).png().toFile(testFile);

    console.log('Created dummy large icon.');

    // Stabilize it like our route does
    await sharp(testFile)
        .resize(64, 64)
        .png()
        .toFile(stabilizedFile);

    const metadata = await sharp(stabilizedFile).metadata();
    console.log(`Stabilized icon metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    if (metadata.width === 64 && metadata.height === 64 && metadata.format === 'png') {
        console.log('Verification SUCCESS: Icon correctly stabilized to 64x64 PNG.');
    } else {
        console.error('Verification FAILURE: Icon dimensions or format incorrect.');
    }

    // Cleanup
    await fs.remove(testFile);
    await fs.remove(stabilizedFile);
}

verify();
