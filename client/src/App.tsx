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
import CommitteeMemberProfile from "./pages/CommitteeMemberProfile";
import CommitteeMemberEdit from "./pages/CommitteeMemberEdit";
import CommitteeMemberNew from "./pages/CommitteeMemberNew";
import JobPositions from "./pages/JobPositions";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Mailbox from "./pages/Mailbox";
import MailboxForm from "./pages/MailboxForm";
import Employees from "./pages/Employees";
import EmployeeNew from "./pages/EmployeeNew";
import EmployeeEdit from "./pages/EmployeeEdit";
import EmployeeProfile from "./pages/EmployeeProfile";

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
      <Route path={"/committee/:id"}>
        <DashboardLayout>
          <CommitteeMemberProfile />
        </DashboardLayout>
      </Route>
      <Route path={"/committee/:id/edit"}>
        <DashboardLayout>
          <CommitteeMemberEdit />
        </DashboardLayout>
      </Route>
      <Route path={"/committee/new"}>
        <DashboardLayout>
          <CommitteeMemberNew />
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
      <Route path={"/mailbox"}>
        <DashboardLayout>
          <Mailbox />
        </DashboardLayout>
      </Route>
      <Route path={"/mailbox/form"}>
        <DashboardLayout>
          <MailboxForm />
        </DashboardLayout>
      </Route>
      <Route path={"/employees"}>
        <DashboardLayout>
          <Employees />
        </DashboardLayout>
      </Route>
      <Route path={"/employees/new"}>
        <DashboardLayout>
          <EmployeeNew />
        </DashboardLayout>
      </Route>
      <Route path={"/employees/:id/edit"}>
        <DashboardLayout>
          <EmployeeEdit />
        </DashboardLayout>
      </Route>
      <Route path={"/employees/:id"}>
        <DashboardLayout>
          <EmployeeProfile />
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
