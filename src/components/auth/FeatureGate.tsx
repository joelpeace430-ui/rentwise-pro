import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureToggles, FeatureKey } from "@/hooks/useFeatureToggles";
import { useUserRoles } from "@/hooks/useUserRoles";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Blocks access to a route if the feature is disabled for the user's roles.
 * Admins always pass through.
 */
const FeatureGate = ({ feature, children, redirectTo = "/" }: FeatureGateProps) => {
  const { loading: rolesLoading } = useUserRoles();
  const { isFeatureEnabled, loading: togglesLoading } = useFeatureToggles();

  if (rolesLoading || togglesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isFeatureEnabled(feature)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default FeatureGate;
