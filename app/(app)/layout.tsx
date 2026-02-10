"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { FABMenu } from "../components/navigation/fab-menu";
import { MotionProvider } from "../components/providers/motion-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <MotionProvider>
        {children}
      </MotionProvider>
      <FABMenu />
    </div>
  );
}
