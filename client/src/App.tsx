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
import PositionAcceptance from './pages/committee/PositionAcceptance';
import ConstitutiveAct from './pages/committee/ConstitutiveAct';
import OperatingRules from './pages/committee/OperatingRules';
import CommitteeTraining from './pages/committee/CommitteeTraining';
import TrendsCharts from './pages/TrendsCharts';
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
import EmployeeCompetencyEvaluation from "./pages/EmployeeCompetencyEvaluation";
import DNCDashboard from "./pages/DNCDashboard";
import OrganizationalCompetenciesManager from "./pages/OrganizationalCompetenciesManager";
import MeetingMinutes from "./pages/MeetingMinutes";
import MeetingMinuteForm from "./pages/MeetingMinuteForm";
import Documents from "./pages/Documents";
import CaseAssignment from "./pages/CaseAssignment";
import DocumentActaConstitutiva from "./pages/DocumentActaConstitutiva";
import DocumentFuncionesComite from "./pages/DocumentFuncionesComite";
import DocumentAceptacionCargo from "./pages/DocumentAceptacionCargo";
import DocumentActaRecorridoNOM019 from "./pages/DocumentActaRecorridoNOM019";
import DocumentActaFinalResultados from "./pages/DocumentActaFinalResultados";
import DocumentsHistory from "./pages/DocumentsHistory";
import DocumentGallery from "./pages/DocumentGallery";
import GuideI from "./pages/surveys/GuideI";
import ComplianceChecklist from "./pages/ComplianceChecklist";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import GuideII from "./pages/surveys/GuideII";
import GuideIII from "./pages/surveys/GuideIII";
import SurveysDashboard from "./pages/surveys/Dashboard";
import SurveysTracking from "./pages/surveys/Tracking";
import CorrectiveActions from "./pages/surveys/CorrectiveActions";
import SurveyResults from "./pages/surveys/SurveyResults";
import SurveyAdmin from "./pages/surveys/SurveyAdmin";
import SurveySend from "./pages/SurveySend";
import PublicSurvey from "./pages/surveys/PublicSurvey";
import ActionPlan from "./pages/surveys/ActionPlan";
import SampleSize from "./pages/surveys/SampleSize";
import TokensDashboard from "./pages/surveys/TokensDashboard";
import SurveysAdminPanel from "./pages/SurveysAdminPanel";
import SurveyPeriodsManager from "./pages/SurveyPeriodsManager";
import Nom035AdminPanel from "./pages/Nom035AdminPanel";
import Policies from "./pages/nom035/Policies";
import EvidenceFolder from "./pages/nom035/EvidenceFolder";
import SurveyApply from "./pages/SurveyApply";
import Settings from "./pages/Settings";
import CompanySettings from "./pages/company/CompanySettings";
import EqualityPolicy from "./pages/equality/Policy";
import EqualitySalaryGap from "./pages/equality/SalaryGap";
import EqualityAffirmativeActions from "./pages/equality/AffirmativeActions";
import EqualityComplaints from "./pages/equality/Complaints";
import EqualityCommittee from "./pages/equality/Committee";

import RegulatoryReports from "./pages/RegulatoryReports";
import MassSurveyEmail from "./pages/surveys/MassSurveyEmail";
import EarlyWarnings from "./pages/EarlyWarnings";
import Investigations from "./pages/cases/Investigations";
import WorkplaceViolenceProtocol from "./pages/cases/WorkplaceViolenceProtocol";
import QuestionnairePublic from "./pages/public/QuestionnairePublic";
import RolesPage from "./pages/admin/Roles";
import Autodiagnostico from "./pages/nom035/Autodiagnostico";

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
      <Route path={"/cases/investigations"}>
        <DashboardLayout>
          <Investigations />
        </DashboardLayout>
      </Route>
      <Route path={"/cases/workplace-violence"}>
        <DashboardLayout>
          <WorkplaceViolenceProtocol />
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
       <Route path="/committee/new">
        <DashboardLayout>
          <CommitteeMemberNew />
        </DashboardLayout>
      </Route>
      <Route path="/committee/position-acceptance">
        <DashboardLayout>
          <PositionAcceptance />
        </DashboardLayout>
      </Route>
      <Route path="/committee/constitutive-act">
        <DashboardLayout>
          <ConstitutiveAct />
        </DashboardLayout>
      </Route>
      <Route path="/committee/operating-rules">
        <DashboardLayout>
          <OperatingRules />
        </DashboardLayout>
      </Route>
      <Route path="/committee/training">
        <DashboardLayout>
          <CommitteeTraining />
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
      <Route path={"/reports/regulatory"}>
        <DashboardLayout>
          <RegulatoryReports />
        </DashboardLayout>
      </Route>
      <Route path={"/competencies-dashboard"}>
        <DashboardLayout>
          <CompetenciesDashboard />
        </DashboardLayout>
      </Route>      <Route path={"/skills-matrix"}>
        <DashboardLayout>
          <SkillsMatrix />
        </DashboardLayout>
      </Route>
      <Route path={"/competency-evaluation"}>
        <DashboardLayout>
          <EmployeeCompetencyEvaluation />
        </DashboardLayout>
      </Route>
      <Route path="/dnc-dashboard">
        <DashboardLayout>
          <DNCDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/competencies-manager">
        <DashboardLayout>
          <OrganizationalCompetenciesManager />
        </DashboardLayout>
      </Route>
      <Route path={"/meeting-minutes"}>
        <DashboardLayout>
          <MeetingMinutes />
        </DashboardLayout>
      </Route>
      <Route path={"/meeting-minutes/new"}>
        <DashboardLayout>
          <MeetingMinuteForm />
        </DashboardLayout>
      </Route>
      <Route path={"/trends"}>
        <DashboardLayout>
          <TrendsCharts />
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
      <Route path={"/admin/roles"}>
        <DashboardLayout>
          <RolesPage />
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
      <Route path={"/documents/gallery"}>
        <DashboardLayout>
          <DocumentGallery />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/dashboard"}>
        <DashboardLayout>
          <SurveysDashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/send"}>
        <DashboardLayout>
          <SurveySend />
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
      {/* Ruta pública para responder encuestas sin autenticación */}
      <Route path={"/survey/public/:token"}>
        <PublicSurvey />
      </Route>
      {/* Ruta pública para responder cuestionarios de investigación (mobbing/burnout) */}
      <Route path={"/questionnaire/:token"}>
        <QuestionnairePublic />
      </Route>
      <Route path={"/surveys/action-plan/:surveyId"}>
        <DashboardLayout>
          <ActionPlan />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/sample-size"}>
        <DashboardLayout>
          <SampleSize />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/tokens-dashboard"}>
        <DashboardLayout>
          <TokensDashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/mass-email"}>
        <DashboardLayout>
          <MassSurveyEmail />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/admin-panel"}>
        <DashboardLayout>
          <SurveysAdminPanel />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/periods"}>
        <DashboardLayout>
          <SurveyPeriodsManager />
        </DashboardLayout>
      </Route>
      <Route path={"/surveys/nom035-admin"}>
        <DashboardLayout>
          <Nom035AdminPanel />
        </DashboardLayout>
      </Route>
      <Route path={"/nom035/policies"}>
        <DashboardLayout>
          <Policies />
        </DashboardLayout>
      </Route>
        <Route path={"/nom035/evidences"}>
        <DashboardLayout>
          <EvidenceFolder />
        </DashboardLayout>
      </Route>
      <Route path={"/nom035/autodiagnostico"}>
        <DashboardLayout>
          <Autodiagnostico />
        </DashboardLayout>
      </Route>
      <Route path={"/alerts"}>
        <DashboardLayout>
          <EarlyWarnings />
        </DashboardLayout>
      </Route>
      <Route path={"/compliance"}>
        <DashboardLayout>
          <ComplianceDashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/compliance/checklist"}>
        <DashboardLayout>
          <ComplianceChecklist />
        </DashboardLayout>
      </Route>
      {/* Ruta pública de aplicación de encuestas */}
      <Route path="/survey/apply" component={SurveyApply} />
      
      {/* Ruta de Empresa (Consolidada) */}
      <Route path={"/company"}>
        <DashboardLayout>
          <CompanySettings />
        </DashboardLayout>
      </Route>

      {/* Rutas de Igualdad Laboral NMX-025 */}
      <Route path={"/equality/policy"}>
        <DashboardLayout>
          <EqualityPolicy />
        </DashboardLayout>
      </Route>
      <Route path={"/equality/salary-gap"}>
        <DashboardLayout>
          <EqualitySalaryGap />
        </DashboardLayout>
      </Route>
      <Route path={"/equality/affirmative-actions"}>
        <DashboardLayout>
          <EqualityAffirmativeActions />
        </DashboardLayout>
      </Route>
      <Route path={"/equality/complaints"}>
        <DashboardLayout>
          <EqualityComplaints />
        </DashboardLayout>
      </Route>
      <Route path={"/equality/committee"}>
        <DashboardLayout>
          <EqualityCommittee />
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
