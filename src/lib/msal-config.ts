import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';

const msalConfig = {
    auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string) => {
                if (level === LogLevel.Error) console.error('[MSAL]', message);
            },
            logLevel: LogLevel.Error,
        },
    },
};

let msalInstance: ConfidentialClientApplication | null = null;

export function getMsalInstance(): ConfidentialClientApplication {
    if (!msalInstance) {
        msalInstance = new ConfidentialClientApplication(msalConfig);
    }
    return msalInstance;
}

// Scopes required by the Copilot Chat API (as per Microsoft Graph beta)
export const COPILOT_SCOPES = [
    'https://graph.microsoft.com/Sites.Read.All',
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/People.Read.All',
    'https://graph.microsoft.com/OnlineMeetingTranscript.Read.All',
    'https://graph.microsoft.com/Chat.Read',
    'https://graph.microsoft.com/ChannelMessage.Read.All',
    'https://graph.microsoft.com/ExternalItem.Read.All',
];

export const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
