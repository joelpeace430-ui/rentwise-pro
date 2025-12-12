import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InviteTenantButtonProps {
  tenantId: string;
  tenantEmail: string;
  tenantName: string;
}

const InviteTenantButton = ({ tenantId, tenantEmail, tenantName }: InviteTenantButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const portalUrl = `${window.location.origin}/tenant/login`;

  const handleInvite = async () => {
    setLoading(true);

    // Create an invitation record
    const { error } = await supabase.from("tenant_invitations").insert({
      tenant_id: tenantId,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create invitation. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setDialogOpen(true);
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Share this link with your tenant.",
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInvite}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Invite to Portal
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {tenantName} to Portal</DialogTitle>
            <DialogDescription>
              Share the portal link with your tenant. They can sign in using their email ({tenantEmail}) to receive a magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Portal Login Link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
                  {portalUrl}
                </code>
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Instructions for tenant:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to the portal link above</li>
                <li>Enter their email address: {tenantEmail}</li>
                <li>Click the magic link sent to their email</li>
                <li>Access their invoices and payment history</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InviteTenantButton;
