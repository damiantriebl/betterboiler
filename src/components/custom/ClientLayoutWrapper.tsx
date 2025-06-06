"use client";

import { Suspense } from "react";
import AppSidebar from "../ui/app-sidebar";
import { SidebarProvider } from "../ui/sidebar";
import AuthGuard from "./AuthGuard";
import ExtensionBlocker from "./ExtensionBlocker";
import PaymentNotificationManager from "./PaymentNotificationManager";
import ScrollableMain from "./ScrollableMain";
import SessionErrorBoundary from "./SessionErrorBoundary";

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
  sessionError?: string | null;
}

export default function ClientLayoutWrapper({ children, sessionError }: ClientLayoutWrapperProps) {
  return (
    <>
      <ExtensionBlocker />
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        }
      >
        <SessionErrorBoundary sessionError={sessionError}>
          <AuthGuard>
            <SidebarProvider>
              <AppSidebar />
              <ScrollableMain>{children}</ScrollableMain>
            </SidebarProvider>
            <PaymentNotificationManager />
          </AuthGuard>
        </SessionErrorBoundary>
      </Suspense>
    </>
  );
}
