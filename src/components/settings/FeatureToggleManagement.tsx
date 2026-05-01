import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ToggleRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFeatureToggles, ALL_FEATURES, ALL_ROLES, FEATURE_LABELS, FeatureKey } from "@/hooks/useFeatureToggles";
import { useUserRoles, AppRole } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  landlord: "Landlord",
  finance: "Finance",
  agent: "Agent",
  caretaker: "Caretaker",
};

const FeatureToggleManagement = () => {
  const { toggles, loading, setToggle } = useFeatureToggles();
  const { isAdmin } = useUserRoles();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ToggleRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-sm">Only administrators can manage feature toggles.</p>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = (role: AppRole, feature: FeatureKey) =>
    toggles.find((t) => t.role === role && t.feature_key === feature)?.enabled ?? false;

  const handleToggle = async (role: AppRole, feature: FeatureKey, enabled: boolean) => {
    const key = `${role}-${feature}`;
    setPending(key);
    const { error } = await setToggle(role, feature, enabled);
    setPending(null);
    if (error) {
      toast({ title: "Error", description: "Failed to update toggle", variant: "destructive" });
    } else {
      toast({
        title: enabled ? "Feature Enabled" : "Feature Disabled",
        description: `${FEATURE_LABELS[feature].label} ${enabled ? "enabled" : "disabled"} for ${ROLE_LABELS[role]}`,
      });
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ToggleRight className="h-5 w-5 text-primary" />
          Feature Access Control
        </CardTitle>
        <CardDescription>
          Enable or disable features per role. Admins always have access to all features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  {ALL_ROLES.map((role) => (
                    <TableHead key={role} className="text-center capitalize">
                      {ROLE_LABELS[role]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_FEATURES.map((feature) => (
                  <TableRow key={feature}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{FEATURE_LABELS[feature].label}</p>
                        <p className="text-xs text-muted-foreground">{FEATURE_LABELS[feature].description}</p>
                      </div>
                    </TableCell>
                    {ALL_ROLES.map((role) => {
                      const key = `${role}-${feature}`;
                      const checked = role === "admin" ? true : isEnabled(role, feature);
                      const disabled = role === "admin" || pending === key;
                      return (
                        <TableCell key={role} className="text-center">
                          <div className="flex items-center justify-center">
                            {pending === key ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={(val) => handleToggle(role, feature, val)}
                              />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Note:</strong> Admins always have full access — their toggles are locked on.
              Disabled features are hidden from the sidebar and routes are blocked.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureToggleManagement;
