import { Navbar } from "@/components/Navbar";
import { LoginCard } from "@/modules/auth/components/LoginCard";

function LoginPage() {
  return (
    <main className="min-h-screen bg-neutral-100 overflow-hidden">
      <div className="m-auto max-w-screen-2xl p-4">
        <Navbar />
        <div className="flex flex-col justify-center items-center pt-4 md:pt-14">
          <LoginCard />
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
