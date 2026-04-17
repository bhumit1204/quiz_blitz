"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganizerAuthGuard(redirectTo = "/auth") {
  const router = useRouter();
  const { loading, isOrganizerAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isOrganizerAuthenticated) {
      router.replace(redirectTo);
    }
  }, [loading, isOrganizerAuthenticated, router, redirectTo]);

  return { loading, isOrganizerAuthenticated };
}
