import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import FindPwForm from "@/components/auth/FindPwForm";

type Step = "login" | "register" | "findpw";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("login");

  return (
    <AuthLayout>
      {step === "login" && (
        <LoginForm
          onRegister={() => setStep("register")}
          onFindPw={() => setStep("findpw")}
        />
      )}
      {step === "register" && <RegisterForm onLogin={() => setStep("login")} />}
      {step === "findpw" && <FindPwForm onLogin={() => setStep("login")} />}
    </AuthLayout>
  );
}
