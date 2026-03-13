/**
 * MSAL helper for Microsoft OAuth login.
 * Uses loginPopup to get an access token, then exchange with backend.
 */
import { PublicClientApplication } from '@azure/msal-browser';

let msalInstance = null;

async function getMsalInstance() {
    if (msalInstance) return msalInstance;
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    if (!clientId) return null;
    msalInstance = new PublicClientApplication({
        auth: {
            clientId,
            authority: 'https://login.microsoftonline.com/common',
        },
    });
    await msalInstance.initialize();
    return msalInstance;
}

export async function loginWithMicrosoft() {
    const instance = await getMsalInstance();
    if (!instance) throw new Error('Microsoft OAuth is not configured.');
    const result = await instance.loginPopup({ scopes: ['User.Read'] });
    return result.accessToken;
}
