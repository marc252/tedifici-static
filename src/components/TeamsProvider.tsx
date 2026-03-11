'use client';

import { useEffect } from 'react';
import { app } from '@microsoft/teams-js';

export default function TeamsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initTeams = async () => {
      try {
        await app.initialize();
        // Inform Teams that the app has successfully loaded
        app.notifySuccess();
      } catch (err) {
        // Ignore error - the app is probably not running in Teams
        console.warn('Teams initialization failed (probably running in a browser):', err);
      }
    };

    initTeams();
  }, []);

  return <>{children}</>;
}
