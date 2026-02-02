import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Cases from "./pages/Cases";
import Resources from "./pages/Resources";
import Evaluations from "./pages/Evaluations";
import TakeEvaluation from "./pages/TakeEvaluation";
import CaseDetail from "./pages/CaseDetail";
import Committee from "./pages/Committee";
import JobPositions from "./pages/JobPositions";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/courses"}>
        <DashboardLayout>
          <Courses />
        </DashboardLayout>
      </Route>
      <Route path={"/cases"}>
        <DashboardLayout>
          <Cases />
        </DashboardLayout>
      </Route>
      <Route path={"/resources"}>
        <DashboardLayout>
          <Resources />
        </DashboardLayout>
      </Route>
      <Route path={"/evaluations"}>
        <DashboardLayout>
          <Evaluations />
        </DashboardLayout>
      </Route>
      <Route path={"/evaluations/:id/take"}>
        <DashboardLayout>
          <TakeEvaluation />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/:id"}>
        <DashboardLayout>
          <CaseDetail />
        </DashboardLayout>
      </Route>
      <Route path={"/committee"}>
        <DashboardLayout>
          <Committee />
        </DashboardLayout>
      </Route>
      <Route path={"/job-positions"}>
        <DashboardLayout>
          <JobPositions />
        </DashboardLayout>
      </Route>
      <Route path={"/reports"}>
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      <Route path={"/users"}>
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      <Route path={"/profile"}>
        <DashboardLayout>
          <Profile />
        </DashboardLayout>
      </Route>
      <Route path={"/notifications"}>
        <DashboardLayout>
          <Notifications />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
