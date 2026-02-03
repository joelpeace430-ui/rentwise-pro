import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, CreditCard, Shield, Building2, Loader2, Mail, Phone, MapPin, FileText, CheckCircle2 } from "lucide-react";
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
      <Tabs defaultValue="profile" className="max-w-5xl">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Card */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src="/placeholder.svg" alt="Profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-1">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {firstName || lastName ? `${firstName} ${lastName}` : "Welcome!"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                    {email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Badge variant="secondary">Property Manager</Badge>
                    <Badge variant="outline" className="border-success text-success">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">
                  Change Photo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11"
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11"
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 pl-10"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={saving} className="min-w-[140px]">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Business Information
              </CardTitle>
              <CardDescription>
                Configure your property management business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-sm font-medium">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your Property Management Co."
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="text-sm font-medium">Tax ID / KRA PIN</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="taxId"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="A123456789X"
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="businessAddress" className="text-sm font-medium">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="123 Business Ave, Nairobi, Kenya"
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveBusinessInfo} disabled={saving} className="min-w-[140px]">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Business Info"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure payment collection preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Due Date</Label>
                  <Select defaultValue="5">
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st of the month</SelectItem>
                      <SelectItem value="5">5th of the month</SelectItem>
                      <SelectItem value="10">10th of the month</SelectItem>
                      <SelectItem value="15">15th of the month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Late Fee Grace Period</Label>
                  <Select defaultValue="5">
                    <SelectTrigger className="h-11">
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
                  <Label htmlFor="lateFee">Late Fee Amount (KSH)</Label>
                  <Input id="lateFee" type="text" defaultValue="500" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select defaultValue="kes">
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kes">KES (KSH)</SelectItem>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button className="min-w-[140px]">Save Payment Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                {
                  title: "Payment Received",
                  description: "Get notified when a tenant makes a payment",
                  defaultChecked: true,
                },
                {
                  title: "Overdue Payments",
                  description: "Receive alerts for overdue rent payments",
                  defaultChecked: true,
                },
                {
                  title: "Automatic Rent Reminders",
                  description: "System sends reminders to tenants with unpaid rent",
                  defaultChecked: true,
                },
                {
                  title: "Lease Expiration",
                  description: "Get reminded when leases are about to expire",
                  defaultChecked: true,
                },
                {
                  title: "Monthly Reports",
                  description: "Receive monthly financial summaries",
                  defaultChecked: true,
                },
                {
                  title: "New Tenant Messages",
                  description: "Get notified when tenants send you messages",
                  defaultChecked: true,
                },
              ].map((item, index) => (
                <div key={item.title}>
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                  {index < 5 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
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
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <Button variant="outline">Change</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Manage devices logged into your account
                  </p>
                </div>
                <Button variant="outline">View All</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;
