"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollAmount() {
  const [scrollAmount, setScrollAmount] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const scrollTransitionDistance = 100;

    const handleScroll = () => {
      const currentScroll = el.scrollTop;
      const amount = Math.min(1, Math.max(0, currentScroll / scrollTransitionDistance));
      setScrollAmount(amount);
    };

    handleScroll();

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrollAmount, mainRef };
}
