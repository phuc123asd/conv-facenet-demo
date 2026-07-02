import { useEffect, useState } from "react";

import { AppHeader } from "./components/layout/AppHeader";
import { LoginView } from "./features/auth/LoginView";
import { AdminView } from "./features/admin/AdminView";
import { KioskView } from "./features/kiosk/KioskView";
import { clearSession, loadSession, saveSession } from "./services/sessionStorage";
import type { AuthSession } from "./types/auth";
import type { MainView } from "./types/navigation";

function App() {
  const [view, setView] = useState<MainView>("kiosk");
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const canOpenAdmin = session?.user.role === "admin";

  useEffect(() => {
    if (!canOpenAdmin && view === "admin") {
      setView("kiosk");
    }
  }, [canOpenAdmin, view]);

  const handleLogin = (nextSession: AuthSession) => {
    saveSession(nextSession);
    setSession(nextSession);
    setView(nextSession.user.role === "admin" ? "admin" : "kiosk");
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setView("kiosk");
  };

  if (!session) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        canOpenAdmin={canOpenAdmin}
        onLogout={handleLogout}
        session={session}
        setView={setView}
        view={view}
      />

      {view === "kiosk" ? <KioskView /> : <AdminView />}
    </div>
  );
}

export default App;
