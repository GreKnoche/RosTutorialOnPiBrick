"use client";

import { useEffect, useState } from "react";

const DEBUG_KEY = "ev3-debug-admin";
const DEBUG_EVENT = "ev3-debug-admin-change";

function readDebugAdmin() {
  try {
    return sessionStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDebugAdmin(on: boolean) {
  if (on) sessionStorage.setItem(DEBUG_KEY, "1");
  else sessionStorage.removeItem(DEBUG_KEY);
  window.dispatchEvent(new Event(DEBUG_EVENT));
}

export function useDebugAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    const sync = () => setAdmin(readDebugAdmin());
    sync();
    window.addEventListener(DEBUG_EVENT, sync);
    return () => window.removeEventListener(DEBUG_EVENT, sync);
  }, []);
  return admin;
}
