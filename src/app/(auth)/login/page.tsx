import { LoginForm } from "@/components/login-form";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm />;
}
