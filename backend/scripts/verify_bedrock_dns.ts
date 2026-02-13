import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

async function verifyDNS() {
    const domains = [
        'www.minecraft.net',
        'minecraft.azureedge.net',
        'raw.githubusercontent.com',
        'google.com'
    ];

    console.log('[DNS] Verifying resolution for Bedrock-related domains...');

    for (const domain of domains) {
        try {
            const ips = await resolve4(domain);
            console.log(`[DNS] SUCCESS: ${domain} -> ${ips.join(', ')}`);
        } catch (err: any) {
            console.error(`[DNS] FAILURE: ${domain} -> ${err.code} (${err.message})`);
        }
    }
}

verifyDNS();
