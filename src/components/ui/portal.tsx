"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children at <body>, escaping any ancestor with a CSS transform.
// Critical here: the app's page wrapper uses an entrance animation that leaves a
// `transform` on it, which would otherwise make `position: fixed` overlays (modals,
// the mobile FAB) anchor to that wrapper instead of the viewport, so on a phone
// they'd open off-screen. Portalling to <body> keeps them viewport-fixed.
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
