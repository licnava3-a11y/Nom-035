import { Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import SkeletonLoader from "./components/SkeletonLoader";
import SkipLink from "./components/SkipLink";
import { useShortcutsHelp } from "./hooks/useKeyboardShortcuts";

// Lazy load all page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Courses = lazy(() => import("./pages/Courses"));
const Cases = lazy(() => import("./pages/Cases"));
const CasesMetrics = lazy(() => import("./pages/CasesMetrics"));
const CasesManagement = lazy(() => import("./pages/CasesManagement"));
const PredictiveAnalytics = lazy(() => import("./pages/PredictiveAnalytics"));
const RootCauseAnalysis = lazy(() => import("./pages/RootCauseAnalysis"));
const CommitteeTrainingsManagement = lazy(() => import("./pages/CommitteeTrainingsManagement"));
const MyCommitteeTrainings = lazy(() => import("./pages/MyCommitteeTrainings"));
const RecommendationsTracking = lazy(() => import("./pages/RecommendationsTracking"));
const TrainingEvaluationsDashboard = lazy(() => import("./pages/TrainingEvaluationsDashboard"));
const IntelligentAlertsDashboard = lazy(() => import("./pages/IntelligentAlertsDashboard"));
const TrainingROIDashboard = lazy(() => import("./pages/TrainingROIDashboard"));
const BenchmarkingDashboard = lazy(() => import("./pages/BenchmarkingDashboard"));
const CorrectiveActionPlansManagement = lazy(() => import("./pages/CorrectiveActionPlansManagement"));
const InterventionImpactDashboard = lazy(() => import("./pages/InterventionImpactDashboard"));
const SharedReportsHistory = lazy(() => import("./pages/SharedReportsHistory"));
const EvidencesFolder = lazy(() => import("./pages/EvidencesFolder"));
const NMX025EvidencesFolder = lazy(() => import("./pages/NMX025EvidencesFolder"));
const DepartmentalTrends = lazy(() => import("./pages/DepartmentalTrends"));
const PostCaseSurveysDashboard = lazy(() => import("./pages/PostCaseSurveysDashboard"));
const JobMonitoringDashboard = lazy(() => import("./pages/JobMonitoringDashboard"));
const AlertsDashboard = lazy(() => import("./pages/AlertsDashboard"));
const ConsolidatedDashboard = lazy(() => import("./pages/ConsolidatedDashboard"));
const Resources = lazy(() => import("./pages/Resources"));
const Evaluations = lazy(() => import("./pages/Evaluations"));
const TakeEvaluation = lazy(() => import("./pages/TakeEvaluation"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Committee = lazy(() => import("./pages/Committee"));
const CommitteeMemberProfile = lazy(() => import("./pages/CommitteeMemberProfile"));
const CommitteeMemberEdit = lazy(() => import("./pages/CommitteeMemberEdit"));
const CommitteeMemberNew = lazy(() => import('./pages/CommitteeMemberNew'));
const PositionAcceptance = lazy(() => import('./pages/committee/PositionAcceptance'));
const ConstitutiveAct = lazy(() => import('./pages/committee/ConstitutiveAct'));
const OperatingRules = lazy(() => import('./pages/committee/OperatingRules'));
const CommitteeTraining = lazy(() => import('./pages/committee/CommitteeTraining'));
const TrendsCharts = lazy(() => import('./pages/TrendsCharts'));
const SignatureTest = lazy(() => import('./pages/SignatureTest'));
const JobPositions = lazy(() => import("./pages/JobPositions"));
const Reports = lazy(() => import("./pages/Reports"));
const AlertHistory = lazy(() => import("./pages/AlertHistory"));
const AlertReportsConfig = lazy(() => import("./pages/AlertReportsConfig"));
const AlertMetricsDashboard = lazy(() => import("./pages/AlertMetricsDashboard"));
const AlertThresholdsConfig = lazy(() => import("./pages/AlertThresholdsConfig"));
const PredictiveDashboard = lazy(() => import("./pages/alerts/PredictiveDashboard"));
const NotificationHistory = lazy(() => import("./pages/NotificationsHistory"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Mailbox = lazy(() => import("./pages/Mailbox"));
const MailboxForm = lazy(() => import("./pages/MailboxForm"));
const MailboxDetail = lazy(() => import("./pages/MailboxDetail"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeNew = lazy(() => import("./pages/EmployeeNew"));
const EmployeeEdit = lazy(() => import("./pages/EmployeeEdit"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
const EmployeeDocuments = lazy(() => import("./pages/EmployeeDocuments"));
const EmployeeTrainingNeeds = lazy(() => import("./pages/EmployeeTrainingNeeds"));
const EmployeeTermination = lazy(() => import("./pages/EmployeeTermination"));
const TurnoverDashboard = lazy(() => import("./pages/TurnoverDashboard"));
const CompetenciesDashboard = lazy(() => import("./pages/CompetenciesDashboard"));
const SkillsMatrix = lazy(() => import("./pages/SkillsMatrix"));
const SkillsMatrixSnapshots = lazy(() => import("./pages/talent/SkillsMatrixSnapshots"));
const NineBoxGrid = lazy(() => import("./pages/talent/NineBoxGrid"));
const Recognitions = lazy(() => import("./pages/talent/Recognitions"));
const EmployeeCompetencyEvaluation = lazy(() => import("./pages/EmployeeCompetencyEvaluation"));
const DNCDashboard = lazy(() => import("./pages/DNCDashboard"));
const OrganizationalCompetenciesManager = lazy(() => import("./pages/OrganizationalCompetenciesManager"));
const MeetingMinutes = lazy(() => import("./pages/MeetingMinutes"));
const MeetingMinuteForm = lazy(() => import("./pages/MeetingMinuteForm"));
const Documents = lazy(() => import("./pages/Documents"));
const CaseAssignment = lazy(() => import("./pages/CaseAssignment"));
const DocumentActaConstitutiva = lazy(() => import("./pages/DocumentActaConstitutiva"));
const DocumentFuncionesComite = lazy(() => import("./pages/DocumentFuncionesComite"));
const DocumentAceptacionCargo = lazy(() => import("./pages/DocumentAceptacionCargo"));
const DocumentActaRecorridoNOM019 = lazy(() => import("./pages/DocumentActaRecorridoNOM019"));
const DocumentActaFinalResultados = lazy(() => import("./pages/DocumentActaFinalResultados"));
const DocumentsHistory = lazy(() => import("./pages/DocumentsHistory"));
const DocumentGallery = lazy(() => import("./pages/DocumentGallery"));
const GuideI = lazy(() => import("./pages/surveys/GuideI"));
const ComplianceChecklist = lazy(() => import("./pages/ComplianceChecklist"));
const ComplianceDashboard = lazy(() => import("./pages/ComplianceDashboard"));
const NumeralsVerification = lazy(() => import("./pages/NumeralsVerification"));
const GuideII = lazy(() => import("./pages/surveys/GuideII"));
const GuideIII = lazy(() => import("./pages/surveys/GuideIII"));
const SurveysDashboard = lazy(() => import("./pages/surveys/Dashboard"));
const SurveysTracking = lazy(() => import("./pages/surveys/Tracking"));
const CorrectiveActions = lazy(() => import("./pages/surveys/CorrectiveActions"));
const SurveyResults = lazy(() => import("./pages/surveys/SurveyResults"));
const GuideIIResults = lazy(() => import("./pages/surveys/GuideIIResults"));
const SurveyAdmin = lazy(() => import("./pages/surveys/SurveyAdmin"));
const SurveySend = lazy(() => import("./pages/SurveySend"));
const PublicSurvey = lazy(() => import("./pages/surveys/PublicSurvey"));
const ActionPlan = lazy(() => import("./pages/surveys/ActionPlan"));
const SampleSize = lazy(() => import("./pages/surveys/SampleSize"));
const TokensDashboard = lazy(() => import("./pages/surveys/TokensDashboard"));
const AnonymousTokens = lazy(() => import("./pages/surveys/AnonymousTokens"));
const AnonymousSurveyAccess = lazy(() => import("./pages/surveys/AnonymousSurveyAccess"));
const TokenManagement = lazy(() => import("./pages/surveys/TokenManagement"));
const SurveysAdminPanel = lazy(() => import("./pages/SurveysAdminPanel"));
const SurveyPeriodsManager = lazy(() => import("./pages/SurveyPeriodsManager"));
const Nom035AdminPanel = lazy(() => import("./pages/Nom035AdminPanel"));
const Policies = lazy(() => import("./pages/nom035/Policies"));
const EvidenceFolder = lazy(() => import("./pages/nom035/EvidenceFolder"));
const SurveyApply = lazy(() => import("./pages/SurveyApply"));
const Settings = lazy(() => import("./pages/Settings"));
const CompanySettings = lazy(() => import("./pages/company/CompanySettings"));
const NotificationSettings = lazy(() => import("./pages/settings/NotificationSettings"));
const EqualityPolicy = lazy(() => import("./pages/equality/Policy"));
const NOM035Questionnaire = lazy(() => import("./pages/NOM035Questionnaire"));
const NOM035Results = lazy(() => import("./pages/NOM035Results"));
const Departments = lazy(() => import("./pages/Departments"));
const Positions = lazy(() => import("./pages/Positions"));
const OrganizationDashboard = lazy(() => import("./pages/OrganizationDashboard"));
const OrganizationChart = lazy(() => import("./pages/OrganizationChart"));
const OrganizationalChanges = lazy(() => import("./pages/OrganizationalChanges"));
const EqualitySalaryGap = lazy(() => import("./pages/equality/SalaryGap"));
const EqualityAffirmativeActions = lazy(() => import("./pages/equality/AffirmativeActions"));
const MassiveImport = lazy(() => import("./pages/MassiveImport"));
const EqualityComplaints = lazy(() => import("./pages/equality/Complaints"));
const EqualityCommittee = lazy(() => import("./pages/equality/Committee"));
const RegulatoryReports = lazy(() => import("./pages/RegulatoryReports"));
const MassSurveyEmail = lazy(() => import("./pages/surveys/MassSurveyEmail"));
const JobApplication = lazy(() => import("./pages/JobApplication"));
const ApplicationSuccess = lazy(() => import("./pages/ApplicationSuccess"));
const EarlyWarnings = lazy(() => import("./pages/EarlyWarnings"));
const Investigations = lazy(() => import("./pages/cases/Investigations"));
const WorkplaceViolenceProtocol = lazy(() => import("./pages/cases/WorkplaceViolenceProtocol"));
const QuestionnairePublic = lazy(() => import("./pages/public/QuestionnairePublic"));
const VerifyReport = lazy(() => import("./pages/VerifyReport"));
const DocumentFormats = lazy(() => import("./pages/DocumentFormats"));
const ReportsHistory = lazy(() => import("./pages/ReportsHistory"));
const DocumentAudit = lazy(() => import("./pages/DocumentAudit"));
const SecurityAlerts = lazy(() => import("./pages/SecurityAlerts"));
const ReportTemplates = lazy(() => import("./pages/ReportTemplates"));
const RiskAnalysis = lazy(() => import("./pages/RiskAnalysis"));
const CommitteeMinutesManagement = lazy(() => import("./pages/CommitteeMinutesManagement"));
const AgreementsDashboard = lazy(() => import("./pages/AgreementsDashboard"));
const TrainingCertificates = lazy(() => import("./pages/TrainingCertificates"));
const EfirmaSAT = lazy(() => import("./pages/EfirmaSAT"));
const TrainingDashboard = lazy(() => import("./pages/TrainingDashboard"));
const AssessmentsManagement = lazy(() => import("./pages/AssessmentsManagement"));
const QuestionBank = lazy(() => import("./pages/QuestionBank"));
const TakeExam = lazy(() => import("./pages/TakeExam"));
const ExamResults = lazy(() => import("./pages/ExamResults"));
const NotificationsDashboard = lazy(() => import("./pages/NotificationsDashboard"));
const Surveys = lazy(() => import("./pages/Surveys"));
const Prevention = lazy(() => import("./pages/Prevention"));
const Compliance = lazy(() => import("./pages/Compliance"));
const STPSReports = lazy(() => import("./pages/STPSReports"));
const Payments = lazy(() => import("./pages/Payments"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const ExpenseRequests = lazy(() => import("./pages/ExpenseRequests"));
const DashboardAdministrativo = lazy(() => import("./pages/DashboardAdministrativo"));
const RolesPermissions = lazy(() => import("./pages/RolesPermissions"));
const CustomPermissions = lazy(() => import("./pages/CustomPermissions"));
const PermissionAudit = lazy(() => import("./pages/PermissionAudit"));
const SmtpConfig = lazy(() => import("./pages/administrative/SmtpConfig"));

// Loading fallback component - usa SkeletonLoader para mejor UX
const PageLoader = () => (
  <div className="container py-6">
    <SkeletonLoader variant="dashboard" rows={3} />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Cases />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/metrics"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CasesMetrics />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases-management"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CasesManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/predictive-analytics"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PredictiveAnalytics />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/root-cause-analysis"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <RootCauseAnalysis />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee-trainings-management"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeTrainingsManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/my-committee-trainings"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MyCommitteeTrainings />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/recommendations-tracking"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <RecommendationsTracking />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/training-evaluations"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TrainingEvaluationsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/intelligent-alerts"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <IntelligentAlertsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/training-roi"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TrainingROIDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/benchmarking"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <BenchmarkingDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/corrective-action-plans"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CorrectiveActionPlansManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/intervention-impact"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <InterventionImpactDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/shared-reports-history"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SharedReportsHistory />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/evidences-folder"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EvidencesFolder />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nmx025-evidences-folder"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NMX025EvidencesFolder />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/departmental-trends"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DepartmentalTrends />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/post-case-surveys"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PostCaseSurveysDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/job-monitoring"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <JobMonitoringDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alerts-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AlertsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/consolidated-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ConsolidatedDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/assignment"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Cases />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/resources"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Resources />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/evaluations"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Evaluations />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/evaluations/:id/take"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TakeEvaluation />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/investigations"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Investigations />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/workplace-violence"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <WorkplaceViolenceProtocol />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CaseDetail />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Committee />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeMemberProfile />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/:id/edit"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeMemberEdit />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/new"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeMemberNew />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/position-acceptance"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PositionAcceptance />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/constitutive-act"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ConstitutiveAct />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/operating-rules"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <OperatingRules />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee/training"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeTraining />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/trends"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TrendsCharts />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/signature-test"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SignatureTest />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/job-positions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <JobPositions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/reports"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Reports />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alert-history"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AlertHistory />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alerts/predictive"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PredictiveDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alert-reports-config"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AlertReportsConfig />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alert-metrics"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AlertMetricsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/alert-thresholds"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AlertThresholdsConfig />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/notification-history"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NotificationHistory />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/users"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Users />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/profile"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Profile />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/notifications"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Notifications />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/mailbox"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Mailbox />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/mailbox/new"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MailboxForm />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/mailbox/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MailboxDetail />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Employees />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/new"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeNew />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id/edit"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeEdit />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeProfile />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id/documents"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeDocuments />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id/training-needs"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeTrainingNeeds />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id/termination"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeTermination />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/turnover-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TurnoverDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/competencies-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CompetenciesDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/skills-matrix"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SkillsMatrix />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/talent/skills-matrix/snapshots"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SkillsMatrixSnapshots />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/talent/nine-box-grid"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NineBoxGrid />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/talent/recognitions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Recognitions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/employees/:id/competency-evaluation"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EmployeeCompetencyEvaluation />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/dnc-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DNCDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/organizational-competencies"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <OrganizationalCompetenciesManager />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/meeting-minutes"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MeetingMinutes />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/meeting-minutes/new"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MeetingMinuteForm />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/meeting-minutes/:id/edit"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MeetingMinuteForm />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Documents />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/cases/assignment"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CaseAssignment />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents/acta-constitutiva"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentActaConstitutiva />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents/funciones-comite"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentFuncionesComite />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents/aceptacion-cargo"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentAceptacionCargo />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents/acta-recorrido-nom019"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentActaRecorridoNOM019 />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents/acta-final-resultados"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentActaFinalResultados />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/documents-history"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentsHistory />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/document-gallery"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentGallery />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/guide-i"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <GuideI />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/compliance-checklist"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ComplianceChecklist />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/compliance-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ComplianceDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/numerals-verification"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NumeralsVerification />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/guide-ii"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <GuideII />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/guide-iii"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <GuideIII />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveysDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/tracking"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveysTracking />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/corrective-actions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CorrectiveActions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/guide-ii-results/:responseId"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <GuideIIResults />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/results"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveyResults />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/admin"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveyAdmin />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/send"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveySend />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/public/:token"}>
          <Suspense fallback={<PageLoader />}>
            <PublicSurvey />
          </Suspense>
        </Route>
        <Route path={"/survey/anonymous/:token"}>
          <Suspense fallback={<PageLoader />}>
            <AnonymousSurveyAccess />
          </Suspense>
        </Route>
        <Route path={"/surveys/action-plan"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ActionPlan />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/sample-size"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SampleSize />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/tokens"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TokensDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/anonymous-tokens"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AnonymousTokens />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/token-management"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TokenManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys-admin-panel"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveysAdminPanel />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/survey-periods"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SurveyPeriodsManager />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nom035-admin"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Nom035AdminPanel />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nom035/policies"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Policies />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nom035/evidence"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EvidenceFolder />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/survey-apply/:token"}>
          <Suspense fallback={<PageLoader />}>
            <SurveyApply />
          </Suspense>
        </Route>
        <Route path={"/settings"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/company/settings"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CompanySettings />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/settings/notifications"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NotificationSettings />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/equality/policy"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EqualityPolicy />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nom035-questionnaire"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NOM035Questionnaire />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/nom035-results"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NOM035Results />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/departments"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Departments />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/positions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Positions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/organization-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <OrganizationDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/organization-chart"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <OrganizationChart />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/organizational-changes"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <OrganizationalChanges />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/equality/salary-gap"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EqualitySalaryGap />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/equality/affirmative-actions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EqualityAffirmativeActions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/massive-import"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MassiveImport />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/equality/complaints"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EqualityComplaints />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/equality/committee"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EqualityCommittee />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/regulatory-reports"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <RegulatoryReports />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys/mass-email"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <MassSurveyEmail />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/job-application"}>
          <Suspense fallback={<PageLoader />}>
            <JobApplication />
          </Suspense>
        </Route>
        <Route path={"/application-success"}>
          <Suspense fallback={<PageLoader />}>
            <ApplicationSuccess />
          </Suspense>
        </Route>
        <Route path={"/early-warnings"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EarlyWarnings />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/questionnaire/:token"}>
          <Suspense fallback={<PageLoader />}>
            <QuestionnairePublic />
          </Suspense>
        </Route>
        <Route path={"/verify-report/:id"}>
          <Suspense fallback={<PageLoader />}>
            <VerifyReport />
          </Suspense>
        </Route>
        <Route path={"/document-formats"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentFormats />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/reports-history"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ReportsHistory />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/document-audit"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DocumentAudit />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/security-alerts"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SecurityAlerts />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/report-templates"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ReportTemplates />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/risk-analysis"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <RiskAnalysis />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/committee-minutes"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CommitteeMinutesManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/agreements-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AgreementsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/training-certificates"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TrainingCertificates />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/efirma-sat"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <EfirmaSAT />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/training-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TrainingDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/assessments"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <AssessmentsManagement />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/question-bank"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <QuestionBank />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/take-exam/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <TakeExam />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/exam-results/:id"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ExamResults />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/notifications-dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <NotificationsDashboard />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/surveys-list"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Surveys />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/prevention"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Prevention />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/compliance"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Compliance />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/stps-reports"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <STPSReports />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/payments"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <Payments />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/purchase-orders"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PurchaseOrders />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/expense-requests"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <ExpenseRequests />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/dashboard"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <DashboardAdministrativo />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/roles-permissions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <RolesPermissions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/custom-permissions"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <CustomPermissions />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/permission-audit"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <PermissionAudit />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route path={"/administrative/smtp-config"}>
          <DashboardLayout>
            <Suspense fallback={<PageLoader />}>
              <SmtpConfig />
            </Suspense>
          </DashboardLayout>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  // Hook para ayuda de atajos de teclado (Ctrl+/)
  useShortcutsHelp();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SkipLink />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
