import { useEffect } from 'react';

/**
 * Custom hook to dynamically set document title for browser tabs.
 * Restores the previous title on unmount.
 * 
 * @param {string} title - Page specific title segment
 */
export default function usePageTitle(title) {
    useEffect(() => {
        const defaultTitle = 'ClubHouse — University Club & Academic Management Portal';
        const previousTitle = document.title;
        
        if (title) {
            document.title = `${title} | ClubHouse`;
        } else {
            document.title = defaultTitle;
        }

        return () => {
            document.title = previousTitle;
        };
    }, [title]);
}
