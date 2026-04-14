import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import { useEffect } from "react";
import { Settings2 } from "lucide-react";

const queryClient = new QueryClient();

function NavBar() {
  const [location] = useLocation();
  return (
    <div className="fixed bottom-5 left-5 z-50">
      <Link href={location === "/settings" ? "/" : "/settings"}>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-colors shadow-lg ${
            location === "/settings"
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/50 bg-background/80 text-muted-foreground hover:text-foreground hover:border-border backdrop-blur-sm"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {location === "/settings" ? "Dashboard" : "Settings"}
        </button>
      </Link>
    </div>
  );
}

function Router() {
  return (
    <>
      <NavBar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
