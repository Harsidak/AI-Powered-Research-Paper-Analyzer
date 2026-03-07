import { useEffect } from 'react';

interface ShortcutActions {
    onUpload: () => void;
    onHistory: () => void;
    onExportLatex: () => void;
    onExportMd: () => void;
    onToggleTheme: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Only fire with Ctrl/Cmd
            if (!(e.ctrlKey || e.metaKey)) return;
            // Don't fire inside input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'u': e.preventDefault(); actions.onUpload(); break;
                case 'h': e.preventDefault(); actions.onHistory(); break;
                case 'e': e.preventDefault(); actions.onExportLatex(); break;
                case 'm': e.preventDefault(); actions.onExportMd(); break;
                case 'd': e.preventDefault(); actions.onToggleTheme(); break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [actions]);
}
