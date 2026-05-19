"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionGuardProps {
  children: React.ReactNode;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("apex_session");
    if (!session) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F5F4F1" }}
      >
        <div className="text-sm" style={{ color: "#888780" }}>
          Cargando...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
