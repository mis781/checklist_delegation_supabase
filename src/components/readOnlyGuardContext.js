import { createContext, useContext } from "react";

// True inside a page wrapped by an active ReadOnlyGuard (lets per-page banners step aside)
export const ReadOnlyGuardContext = createContext(false);
export const useInsideReadOnlyGuard = () => useContext(ReadOnlyGuardContext);
