import { useEffect, useRef } from "react";

interface ShortcutOptions {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Skip firing when focus is inside input/textarea/select/contenteditable. Default: true */
  ignoreInputs?: boolean;
}

export function useShortcutKey(options: ShortcutOptions, callback: () => void): void {
  const { key, mod = false, shift = false, alt = false, ignoreInputs = true } = options;

  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (ignoreInputs && event.target instanceof HTMLElement) {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
        if (event.target.isContentEditable) return;
      }

      const isMod = event.metaKey || event.ctrlKey;
      if (mod && !isMod) return;
      if (!mod && isMod) return;
      if (shift !== event.shiftKey) return;
      if (alt !== event.altKey) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      event.preventDefault();
      callbackRef.current();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, mod, shift, alt, ignoreInputs]);
}
