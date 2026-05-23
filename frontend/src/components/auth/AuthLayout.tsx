import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#4B73F7] dark:bg-[#1a2240] relative overflow-hidden">
      <div className="animate-blob animation-delay-2000 absolute top-[-10vh] left-[-5vw] w-[35vw] h-[35vw] min-w-[400px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob animation-delay-4000 absolute bottom-[-20vh] right-[-10vw] w-[40vw] h-[40vw] min-w-[500px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/20 dark:bg-[#2a3870]/60" />
      <div className="animate-blob absolute top-[50%] left-[20%] w-[25vw] h-[25vw] min-w-[300px] rounded-[40%_60%_60%_40%/60%_40%_60%_40%] bg-white/10 dark:bg-[#2a3870]/40" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs sm:max-w-md mx-4 px-6 sm:px-10 py-8 sm:py-12 z-10">
        {children}
      </div>
    </div>
  );
}
