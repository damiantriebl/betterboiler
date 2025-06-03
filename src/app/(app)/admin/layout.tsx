import AuthGuard from "@/components/custom/AuthGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requiredRole="admin">
      {children}
    </AuthGuard>
  );
}
