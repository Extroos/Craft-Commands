import { permissionService } from './features/auth/PermissionService';
import {  UserProfile, Permission  } from '@shared/types';

async function testPermissions() {
    console.log('--- Testing Granular Permissions ---');

    const mockUser: UserProfile = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'ADMIN',
        serverAcl: {
            'server-1': {
                allow: [],
                deny: ['server.start'] as Permission[]
            }
        },
        preferences: {
            accentColor: 'emerald',
            reducedMotion: false,
            notifications: { browser: true, sound: true, events: { onJoin: true, onCrash: true } },
            terminal: { fontSize: 13, fontFamily: 'monospace' },
            backgrounds: {},
            visualQuality: true
        }
    };

    // 1. Admin normally has server.start
    // Let's verify that the deny override works.
    const canStart = permissionService.can(mockUser, 'server.start', 'server-1');
    console.log(`Admin can start server-1 (Expect false): ${canStart}`);

    // 2. Viewer normally does NOT have server.start
    const mockViewer: UserProfile = {
        ...mockUser,
        role: 'VIEWER',
        serverAcl: {
            'server-1': {
                allow: ['server.start'] as Permission[],
                deny: []
            }
        }
    };
    const viewerCanStart = permissionService.can(mockViewer, 'server.start', 'server-1');
    console.log(`Viewer with allow override can start server-1 (Expect true): ${viewerCanStart}`);

    // 3. Deny always wins over Allow
    const mockConflict: UserProfile = {
        ...mockUser,
        serverAcl: {
            'server-1': {
                allow: ['server.start'] as Permission[],
                deny: ['server.start'] as Permission[]
            }
        }
    };
    const conflictResult = permissionService.can(mockConflict, 'server.start', 'server-1');
    console.log(`Conflict (Allow + Deny) results in (Expect false): ${conflictResult}`);

    console.log('--- Permission Tests Complete ---');
}

testPermissions().catch(console.error);
