import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Logo } from "@/components/elevare/Logo";
import { Loader2 } from "lucide-react";


export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: (search.error as string) || undefined,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [step, setStep] = useState<"selection" | "credentials">("selection");
  const [userType, setUserType] = useState<"consultor" | "cliente" | null>(null);

  useEffect(() => {
    if (searchError) {
      let msg = "";
      if (searchError === "account_disabled") msg = "Sua conta está desativada. Entre em contato com o suporte.";
      if (searchError === "profile_not_found") msg = "Perfil não encontrado. Verifique se seu cadastro foi concluído.";
      if (searchError === "insufficient_permissions") msg = "Você não tem permissão para acessar esta área.";
      
      if (msg) toast.error(msg);
      
      // Limpa a URL removendo o erro após mostrar o toast
      navigate({ to: "/login", replace: true });
    }
  }, [searchError, navigate]);

  const handleCnpjChange = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, "");
    
    // Aplica a máscara: XX.XXX.XXX/XXXX-XX
    let formatted = digits;
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 5) {
      formatted = digits.replace(/^(\d{2})(\d)/, "$1.$2");
    } else if (digits.length <= 8) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d)/, "$1.$2.$3");
    } else if (digits.length <= 12) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, "$1.$2.$3/$4");
    } else {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, "$1.$2.$3/$4-$5");
    }
    setCnpj(formatted.substring(0, 18));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) throw new Error("Usuário não encontrado");

      // Fetch profile to redirect correctly
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("perfil, ativo, force_password_change, cnpj")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        // Fallback for new users where trigger might be slow
        toast.info("Perfil sendo configurado, tentando novamente...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("perfil, ativo, force_password_change, cnpj")
          .eq("id", data.user.id)
          .single();
        
        if (retryProfile) {
          validateAndRedirect(retryProfile);
          return;
        }
        throw new Error("Perfil não encontrado. Entre em contato com o suporte.");
      }

      if (!profile.ativo) {
        await supabase.auth.signOut();
        throw new Error("Sua conta está desativada.");
      }

      await validateAndRedirect(profile);
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      let errorMessage = "Erro ao fazer login";
      
      if (error.message?.includes("Invalid login credentials") || error.status === 400) {
        errorMessage = "E-mail ou senha incorretos. Verifique suas credenciais.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "E-mail não confirmado. Verifique sua caixa de entrada.";
      } else if (error.message === "Sua conta está desativada.") {
        errorMessage = "Sua conta está desativada. Entre em contato com o administrador.";
      } else if (error.message === "Perfil não encontrado. Entre em contato com o suporte.") {
        errorMessage = "Perfil não encontrado. Verifique se seu cadastro foi concluído.";
      } else if (error.message === "CNPJ não corresponde ao seu cadastro.") {
        errorMessage = "CNPJ não corresponde ao seu cadastro.";
      } else if (error.status === 429) {
        errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
      } else if (error.message?.includes("Database error") || error.code === "PGRST301") {
        errorMessage = "Erro de permissão no banco de dados. Contate o suporte técnico.";
      } else {
        errorMessage = error.message || "Ocorreu um erro inesperado ao tentar acessar o sistema.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateAndRedirect = async (profile: any) => {
    // Validar perfil selecionado vs perfil do banco
    if (userType === "cliente" && profile.perfil !== "cliente") {
      await supabase.auth.signOut();
      toast.error("Este acesso é restrito para Clientes.");
      return;
    }
    
    if (userType === "consultor" && profile.perfil === "cliente") {
      await supabase.auth.signOut();
      toast.error("Este acesso é restrito para Consultores e Administradores.");
      return;
    }

    // Validar CNPJ para clientes
    if (userType === "cliente") {
      const cleanInputCnpj = cnpj.replace(/\D/g, "");
      const cleanProfileCnpj = (profile.cnpj || "").replace(/\D/g, "");
      
      if (cleanInputCnpj !== cleanProfileCnpj) {
        await supabase.auth.signOut();
        throw new Error("CNPJ não corresponde ao seu cadastro.");
      }
    }

    if (profile?.force_password_change) {
      navigate({ to: "/perfil" });
      toast.info("Por favor, altere sua senha para continuar.");
    } else if (profile?.perfil === "admin") {
      navigate({ to: "/admin" });
    } else if (profile?.perfil === "cliente" || profile?.perfil === "consultor") {
      navigate({ to: profile?.perfil === "cliente" ? "/meu-resultado" : "/" });
    } else {
      navigate({ to: "/login", search: { error: "insufficient_permissions" } });
    }
    toast.success("Login realizado com sucesso!");
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Informe seu e-mail primeiro");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail");
    } finally {
      setResetLoading(false);
    }
  };

  const selectUserType = (type: "consultor" | "cliente") => {
    setUserType(type);
    setStep("credentials");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-slate-200 overflow-hidden">
        <CardHeader className="space-y-4 flex flex-col items-center pb-6">
          <div className="mb-2">
            <Logo />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-800">
              {step === "selection" ? "Selecione seu Perfil" : "Acesso ao Sistema"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {step === "selection" 
                ? "Escolha como deseja acessar a plataforma" 
                : "Entre com suas credenciais para continuar"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === "selection" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 animate-in fade-in duration-500">
              <button
                onClick={() => selectUserType("consultor")}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-slate-100 bg-white hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5 transition-all group text-center space-y-3"
              >
                <div className="p-4 rounded-full bg-slate-50 group-hover:bg-[#1a4d2e]/10 transition-colors">
                  <span className="text-3xl" role="img" aria-label="Search">🔍</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Consultor / Admin</h3>
                  <p className="text-xs text-slate-500">Acesso para equipe Elevare</p>
                </div>
              </button>

              <button
                onClick={() => selectUserType("cliente")}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-slate-100 bg-white hover:border-[#1a4d2e] hover:bg-[#1a4d2e]/5 transition-all group text-center space-y-3"
              >
                <div className="p-4 rounded-full bg-slate-50 group-hover:bg-[#1a4d2e]/10 transition-colors">
                  <span className="text-3xl" role="img" aria-label="Shop">🏪</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Cliente</h3>
                  <p className="text-xs text-slate-500">Acesso para estabelecimentos</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5 py-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <button
                type="button"
                onClick={() => setStep("selection")}
                className="flex items-center text-sm font-medium text-slate-500 hover:text-[#1a4d2e] transition-colors mb-2"
              >
                <span className="mr-1">←</span> Voltar para seleção
              </button>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-[#1a4d2e]"
                  required
                />
              </div>

              {userType === "cliente" && (
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-slate-700">CNPJ do estabelecimento</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    className="focus-visible:ring-[#1a4d2e]"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" title="Senha" className="text-slate-700">Senha</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-visible:ring-[#1a4d2e]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-[#1a4d2e] hover:bg-[#1a4d2e]/90 text-white font-semibold py-6 h-auto transition-colors" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-sm text-[#1a4d2e] hover:underline font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
