"use client";

import { useEffect } from "react";

// This is a simple client-side interceptor simulation.
// In a real app, you'd use an axios interceptor or a custom fetch wrapper.
export function useAuthInterceptor() {
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const response = await originalFetch(...args);

            if (response.status === 401) {
                console.warn("Received 401 while running in guest mode.");
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);
}
