import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => undefined);
