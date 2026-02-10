"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary mb-4">Settings</h1>
      <div className="bg-white rounded-lg shadow-md p-6 border border-border space-y-4">
        <p className="text-foreground/70 mb-4">
          Settings coming in Phase 4
        </p>

        <div className="pt-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
