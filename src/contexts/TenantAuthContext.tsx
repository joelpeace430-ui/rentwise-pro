import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface TenantData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  unit_number: string;
  monthly_rent: number;
  lease_start?: string;
  lease_end?: string;
  property?: {
    name: string;
    address: string;
  };
}

interface TenantAuthContextType {
  user: User | null;
  session: Session | null;
  tenant: TenantData | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

export const useTenantAuth = () => {
  const context = useContext(TenantAuthContext);
  if (!context) {
    throw new Error("useTenantAuth must be used within a TenantAuthProvider");
  }
  return context;
};

export const TenantAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantData = async (userId: string) => {
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        id,
        first_name,
        last_name,
        email,
        unit_number,
        monthly_rent,
        lease_start,
        lease_end,
        properties:property_id (
          name,
          address
        )
      `)
      .eq("tenant_user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setTenant({
        ...data,
        property: data.properties as TenantData["property"],
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            fetchTenantData(session.user.id);
          }, 0);
        } else {
          setTenant(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTenantData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/tenant/portal`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTenant(null);
  };

  return (
    <TenantAuthContext.Provider value={{ user, session, tenant, loading, signInWithMagicLink, signOut }}>
      {children}
    </TenantAuthContext.Provider>
  );
};
