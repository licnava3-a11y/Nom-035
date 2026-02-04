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
import CommitteeMemberNew from './pages/CommitteeMemberNew';
import SignatureTest from './pages/SignatureTest';
import JobPositions from "./pages/JobPositions";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Mailbox from "./pages/Mailbox";
import MailboxForm from "./pages/MailboxForm";
import MailboxDetail from "./pages/MailboxDetail";
import Employees from "./pages/Employees";
import EmployeeNew from "./pages/EmployeeNew";
import EmployeeEdit from "./pages/EmployeeEdit";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeDocuments from "./pages/EmployeeDocuments";
import EmployeeTrainingNeeds from "./pages/EmployeeTrainingNeeds";
import CompetenciesDashboard from "./pages/CompetenciesDashboard";
import SkillsMatrix from "./pages/SkillsMatrix";
import Documents from "./pages/Documents";
import CaseAssignment from "./pages/CaseAssignment";
import DocumentActaConstitutiva from "./pages/DocumentActaConstitutiva";
import DocumentFuncionesComite from "./pages/DocumentFuncionesComite";
import DocumentAceptacionCargo from "./pages/DocumentAceptacionCargo";
import DocumentActaRecorridoNOM019 from "./pages/DocumentActaRecorridoNOM019";
import DocumentActaFinalResultados from "./pages/DocumentActaFinalResultados";
import DocumentsHistory from "./pages/DocumentsHistory";
import GuideI from "./pages/surveys/GuideI";
import GuideII from "./pages/surveys/GuideII";
import GuideIII from "./pages/surveys/GuideIII";
import SurveysDashboard from "./pages/surveys/Dashboard";
import SurveysTracking from "./pages/surveys/Tracking";
import CorrectiveActions from "./pages/surveys/CorrectiveActions";
import SurveyResults from "./pages/surveys/SurveyResults";
import SurveyAdmin from "./pages/surveys/SurveyAdmin";
import Settings from "./pages/Settings";

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
      <Route path={"/signature-test"}>
        <DashboardLayout>
          <SignatureTest />
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
      <Route path={"/competencies-dashboard"}>
        <DashboardLayout>
          <CompetenciesDashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/skills-matrix"}>
        <DashboardLayout>
          <SkillsMatrix />
        </DashboardLayout>
      </Route>
      <Route path={"/users"}>
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
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
      <Route path={"/mailbox/:id"}>
        <DashboardLayout>
          <MailboxDetail />
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
      <Route path={"/employees/:id/documents"}>
        <DashboardLayout>
          <EmployeeDocuments />
        </DashboardLayout>
      </Route>
      <Route path={"/employees/:id/training-needs"}>
        <DashboardLayout>
          <EmployeeTrainingNeeds />
        </DashboardLayout>
      </Route>
      <Route path={"/documents"}>
        <DashboardLayout>
          <Documents />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/assign"}>
        <DashboardLayout>
          <CaseAssignment />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/acta-constitutiva"}>
        <DashboardLayout>
          <DocumentActaConstitutiva />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/funciones-comite"}>
        <DashboardLayout>
          <DocumentFuncionesComite />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/aceptacion-cargo"}>
        <DashboardLayout>
          <DocumentAceptacionCargo />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/acta-recorrido-nom019"}>
        <DashboardLayout>
          <DocumentActaRecorridoNOM019 />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/acta-final-resultados"}>
        <DashboardLayout>
          <DocumentActaFinalResultados />
        </DashboardLayout>
      </Route>
      <Route path={"/documents/history"}>
        <DashboardLayout>
          <DocumentsHistory />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/dashboard"}>
        <DashboardLayout>
          <SurveysDashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/guide-i"}>
        <DashboardLayout>
          <GuideI />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/guide-ii"}>
        <DashboardLayout>
          <GuideII />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/guide-iii"}>
        <DashboardLayout>
          <GuideIII />
        </DashboardLayout>
      </Route>

      <Route path={"/surveys/tracking"}>
        <DashboardLayout>
          <SurveysTracking />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/corrective-actions"}>
        <DashboardLayout>
          <CorrectiveActions />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/results/:responseId"}>
        <DashboardLayout>
          <SurveyResults />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/admin"}>
        <DashboardLayout>
          <SurveyAdmin />
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
