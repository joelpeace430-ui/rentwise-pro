import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Bell, CreditCard, Shield, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  business_address: string | null;
  tax_id: string | null;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } else if (data) {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || user.email || "");
        setPhone(data.phone || "");
        setBusinessName(data.business_name || "");
        setBusinessAddress(data.business_address || "");
        setTaxId(data.tax_id || "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, toast]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName,
        business_address: businessAddress,
        tax_id: taxId,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      console.error("Error updating business info:", error);
      toast({
        title: "Error",
        description: "Failed to update business information",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Business Info Updated",
        description: "Your business information has been saved successfully.",
      });
    }
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage your account and preferences">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your account and preferences"
    >
      <div className="max-w-4xl space-y-6">
        {/* Profile Section */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Profile</CardTitle>
            </div>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg" alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Business Information</CardTitle>
            </div>
            <CardDescription>
              Configure your property management business details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Property Management LLC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / EIN</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Business Ave, Suite 100, City, State ZIP"
                />
              </div>
            </div>
            <Button onClick={handleSaveBusinessInfo} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Business Info"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Payment Received</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when a tenant makes a payment
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Overdue Payments</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for overdue rent payments
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Lease Expiration</p>
                <p className="text-sm text-muted-foreground">
                  Get reminded when leases are about to expire
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Monthly Reports</p>
                <p className="text-sm text-muted-foreground">
                  Receive monthly financial summaries
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Payment Settings</CardTitle>
            </div>
            <CardDescription>
              Configure payment collection preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Due Date</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st of the month</SelectItem>
                    <SelectItem value="5">5th of the month</SelectItem>
                    <SelectItem value="15">15th of the month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Late Fee Grace Period</Label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="10">10 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee Amount</Label>
                <Input id="lateFee" type="text" defaultValue="$50.00" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gbp">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button>Save Payment Settings</Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Security</CardTitle>
            </div>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline">Enable</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Change Password</p>
                <p className="text-sm text-muted-foreground">
                  Update your account password
                </p>
              </div>
              <Button variant="outline">Change</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
