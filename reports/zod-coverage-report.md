# 📊 Reporte de Cobertura de Validaciones Zod

## 📈 Resumen Global

- **Total de Routers Analizados**: 124
- **Total de Procedures**: 785
- **Procedures con Validación**: 656 (84%)
- **Procedures sin Validación**: 129 (16%)

## 🎯 Routers Prioritarios (Cobertura <50%)

*No hay routers con cobertura crítica (<50%).*

## 📋 Detalle por Router

### ❌ compensationReports.ts

- **Cobertura**: 0%
- **Procedures Totales**: 2
- **Con Validación**: 0
- **Sin Validación**: 2

**Procedures sin validación:**

- `generateCompensationPDF` (mutation, línea 14)
- `getReportHistory` (query, línea 217)

### ❌ dashboard.ts

- **Cobertura**: 0%
- **Procedures Totales**: 3
- **Con Validación**: 0
- **Sin Validación**: 3

**Procedures sin validación:**

- `getManagerStats` (query, línea 14)
- `getTeamPerformance` (query, línea 75)
- `getNOM035Compliance` (query, línea 96)

### ❌ menuCounters.ts

- **Cobertura**: 0%
- **Procedures Totales**: 1
- **Con Validación**: 0
- **Sin Validación**: 1

**Procedures sin validación:**

- `getAll` (query, línea 15)

### ❌ training.ts

- **Cobertura**: 0%
- **Procedures Totales**: 3
- **Con Validación**: 0
- **Sin Validación**: 3

**Procedures sin validación:**

- `getInstructorStats` (query, línea 15)
- `getInstructorUpcomingCourses` (query, línea 56)
- `getInstructorPendingConfirmations` (query, línea 91)

### ❌ trainingNeeds.test.ts

- **Cobertura**: 0%
- **Procedures Totales**: 0
- **Con Validación**: 0
- **Sin Validación**: 0

### ❌ earlyWarnings.ts

- **Cobertura**: 20%
- **Procedures Totales**: 5
- **Con Validación**: 1
- **Sin Validación**: 4

**Procedures sin validación:**

- `getPendingSurveys` (query, línea 85)
- `getActionsWithoutFollowUp` (query, línea 136)
- `getSummary` (query, línea 185)
- `getSurveyCoverageAlerts` (query, línea 238)

### ❌ jobMonitoring.ts

- **Cobertura**: 20%
- **Procedures Totales**: 5
- **Con Validación**: 1
- **Sin Validación**: 4

**Procedures sin validación:**

- `getJobStats` (query, línea 64)
- `runPostCaseSurveysJob` (mutation, línea 101)
- `runDepartmentalAlertsJob` (mutation, línea 152)
- `runSurveyRemindersJob` (mutation, línea 199)

### ❌ salaryTrends.ts

- **Cobertura**: 20%
- **Procedures Totales**: 5
- **Con Validación**: 1
- **Sin Validación**: 4

**Procedures sin validación:**

- `getTrendsByDepartment` (query, línea 12)
- `getTrendsByPosition` (query, línea 31)
- `getMarketProjections` (query, línea 50)
- `getDepartmentSummary` (query, línea 133)

### ❌ predictiveCorrelation.ts

- **Cobertura**: 25%
- **Procedures Totales**: 4
- **Con Validación**: 1
- **Sin Validación**: 3

**Procedures sin validación:**

- `getTruePositives` (query, línea 143)
- `getFalsePositives` (query, línea 178)
- `getFalseNegatives` (query, línea 234)

### ❌ salaryEquity.ts

- **Cobertura**: 25%
- **Procedures Totales**: 4
- **Con Validación**: 1
- **Sin Validación**: 3

**Procedures sin validación:**

- `generateAnalysis` (mutation, línea 12)
- `getLatestAnalysis` (query, línea 209)
- `getAnalysisHistory` (query, línea 229)

### ❌ modelRetraining.ts

- **Cobertura**: 33%
- **Procedures Totales**: 3
- **Con Validación**: 1
- **Sin Validación**: 2

**Procedures sin validación:**

- `getLastRetraining` (query, línea 73)
- `getRetrainingStats` (query, línea 120)

### ❌ modelThresholds.ts

- **Cobertura**: 40%
- **Procedures Totales**: 5
- **Con Validación**: 2
- **Sin Validación**: 3

**Procedures sin validación:**

- `getActiveThresholds` (query, línea 12)
- `getThresholdsHistory` (query, línea 58)
- `resetToDefaults` (mutation, línea 163)

### ⚠️ administrative.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getFinancialStats` (query, línea 18)
- `getPendingPayments` (query, línea 46)

### ⚠️ complianceNOM035.ts

- **Cobertura**: 50%
- **Procedures Totales**: 6
- **Con Validación**: 3
- **Sin Validación**: 3

**Procedures sin validación:**

- `getComplianceByNumeral` (query, línea 18)
- `getGlobalStats` (query, línea 102)
- `generateComplianceReport` (mutation, línea 319)

### ⚠️ executiveDashboard.ts

- **Cobertura**: 50%
- **Procedures Totales**: 6
- **Con Validación**: 3
- **Sin Validación**: 3

**Procedures sin validación:**

- `getConsolidatedKPIs` (query, línea 571)
- `getComplianceTrends` (query, línea 622)
- `getConsolidatedAlerts` (query, línea 655)

### ⚠️ modelPerformanceAlerts.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getActiveAlerts` (query, línea 17)
- `getAlertStats` (query, línea 129)

### ⚠️ nineBoxGrid.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `calculateAll` (mutation, línea 156)
- `getStats` (query, línea 345)

### ⚠️ notificationPreferences.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getPreferences` (query, línea 15)
- `resetToDefaults` (mutation, línea 115)

### ⚠️ payrollIntegration.ts

- **Cobertura**: 50%
- **Procedures Totales**: 6
- **Con Validación**: 3
- **Sin Validación**: 3

**Procedures sin validación:**

- `getAllPayrollData` (query, línea 18)
- `getCriticalSalaryGaps` (query, línea 219)
- `getCompensationRiskCorrelation` (query, línea 247)

### ⚠️ rolesPermissions.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getAllRoles` (query, línea 19)
- `getRoleDistribution` (query, línea 360)

### ⚠️ sentimentCasesCorrelation.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getInterventionMetrics` (query, línea 120)
- `getCasesByDepartment` (query, línea 195)

### ⚠️ smtpConfig.ts

- **Cobertura**: 50%
- **Procedures Totales**: 4
- **Con Validación**: 2
- **Sin Validación**: 2

**Procedures sin validación:**

- `getConfig` (query, línea 35)
- `getDecryptedConfig` (query, línea 194)

### ⚠️ massiveImport.ts

- **Cobertura**: 60%
- **Procedures Totales**: 5
- **Con Validación**: 3
- **Sin Validación**: 2

**Procedures sin validación:**

- `getDepartmentsForImport` (query, línea 166)
- `getPositionsForImport` (query, línea 180)

### ⚠️ reports.ts

- **Cobertura**: 60%
- **Procedures Totales**: 5
- **Con Validación**: 3
- **Sin Validación**: 2

**Procedures sin validación:**

- `getAvailablePeriods` (query, línea 210)
- `getAvailableSigners` (query, línea 232)

### ⚠️ committeePositionAcceptance.ts

- **Cobertura**: 67%
- **Procedures Totales**: 6
- **Con Validación**: 4
- **Sin Validación**: 2

**Procedures sin validación:**

- `list` (query, línea 143)
- `listMembers` (query, línea 230)

### ⚠️ digitalCertificates.ts

- **Cobertura**: 67%
- **Procedures Totales**: 6
- **Con Validación**: 4
- **Sin Validación**: 2

**Procedures sin validación:**

- `list` (query, línea 11)
- `getActiveCertificate` (query, línea 123)

### ⚠️ externalOfferAlerts.ts

- **Cobertura**: 67%
- **Procedures Totales**: 6
- **Con Validación**: 4
- **Sin Validación**: 2

**Procedures sin validación:**

- `getAlertStats` (query, línea 87)
- `getAlertsByDepartment` (query, línea 105)

### ⚠️ import.ts

- **Cobertura**: 67%
- **Procedures Totales**: 3
- **Con Validación**: 2
- **Sin Validación**: 1

**Procedures sin validación:**

- `downloadTemplate` (query, línea 117)

### ⚠️ notificationLogs.ts

- **Cobertura**: 67%
- **Procedures Totales**: 3
- **Con Validación**: 2
- **Sin Validación**: 1

**Procedures sin validación:**

- `getRecipients` (query, línea 182)

### ⚠️ notifications.ts

- **Cobertura**: 67%
- **Procedures Totales**: 6
- **Con Validación**: 4
- **Sin Validación**: 2

**Procedures sin validación:**

- `getUnreadCount` (query, línea 42)
- `markAllAsRead` (mutation, línea 85)

### ⚠️ alerts.ts

- **Cobertura**: 71%
- **Procedures Totales**: 7
- **Con Validación**: 5
- **Sin Validación**: 2

**Procedures sin validación:**

- `getStats` (query, línea 128)
- `getResolutionMetrics` (query, línea 189)

### ⚠️ correctiveActions.ts

- **Cobertura**: 71%
- **Procedures Totales**: 14
- **Con Validación**: 10
- **Sin Validación**: 4

**Procedures sin validación:**

- `getStatistics` (query, línea 273)
- `getDueSoon` (query, línea 340)
- `sendDueReminders` (mutation, línea 377)
- `sendOverdueAlerts` (mutation, línea 446)

### ⚠️ intelligentAlerts.ts

- **Cobertura**: 71%
- **Procedures Totales**: 7
- **Con Validación**: 5
- **Sin Validación**: 2

**Procedures sin validación:**

- `runPredictiveAnalysis` (mutation, línea 13)
- `getDashboard` (query, línea 180)

### ⚠️ postCaseSurveys.ts

- **Cobertura**: 71%
- **Procedures Totales**: 7
- **Con Validación**: 5
- **Sin Validación**: 2

**Procedures sin validación:**

- `sendPendingSurveys` (mutation, línea 306)
- `expireSurveys` (mutation, línea 342)

### ⚠️ departments.ts

- **Cobertura**: 72%
- **Procedures Totales**: 18
- **Con Validación**: 13
- **Sin Validación**: 5

**Procedures sin validación:**

- `getHierarchy` (query, línea 379)
- `getActiveAlerts` (query, línea 755)
- `exportAll` (mutation, línea 863)
- `generatePredictiveAlertsPDF` (mutation, línea 1029)
- `getAlgorithmConfig` (query, línea 1170)

### ⚠️ compliance.ts

- **Cobertura**: 74%
- **Procedures Totales**: 19
- **Con Validación**: 14
- **Sin Validación**: 5

**Procedures sin validación:**

- `getChecklist` (query, línea 11)
- `getComplianceStats` (query, línea 40)
- `getTraceabilityMatrix` (query, línea 129)
- `getPendingItems` (query, línea 153)
- `getDashboard` (query, línea 342)

### ⚠️ customPermissions.ts

- **Cobertura**: 75%
- **Procedures Totales**: 4
- **Con Validación**: 3
- **Sin Validación**: 1

**Procedures sin validación:**

- `getUsersWithCustomPermissions` (query, línea 197)

### ⚠️ retentionInterventions.ts

- **Cobertura**: 75%
- **Procedures Totales**: 4
- **Con Validación**: 3
- **Sin Validación**: 1

**Procedures sin validación:**

- `getEffectivenessStats` (query, línea 179)

### ⚠️ rootCauseAnalysis.ts

- **Cobertura**: 75%
- **Procedures Totales**: 4
- **Con Validación**: 3
- **Sin Validación**: 1

**Procedures sin validación:**

- `getLatestAnalysis` (query, línea 295)

### ⚠️ sharedReports.ts

- **Cobertura**: 75%
- **Procedures Totales**: 4
- **Con Validación**: 3
- **Sin Validación**: 1

**Procedures sin validación:**

- `getStats` (query, línea 99)

### ⚠️ thresholdExperiments.ts

- **Cobertura**: 75%
- **Procedures Totales**: 4
- **Con Validación**: 3
- **Sin Validación**: 1

**Procedures sin validación:**

- `getAvailableConfigs` (query, línea 155)

### ⚠️ financial.ts

- **Cobertura**: 76%
- **Procedures Totales**: 17
- **Con Validación**: 13
- **Sin Validación**: 4

**Procedures sin validación:**

- `getDashboardSummary` (query, línea 21)
- `getAllInvoices` (query, línea 41)
- `getAllPurchaseOrders` (query, línea 153)
- `getAllExpenseRequests` (query, línea 265)

### ✅ departmentMetrics.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDistributionMetrics` (query, línea 211)

### ✅ departmentalTrends.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDepartmentalAlerts` (query, línea 201)

### ✅ evidenceFolder.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getStats` (query, línea 92)

### ✅ sentimentAnalysis.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `runManualAnalysis` (mutation, línea 242)

### ✅ skillsMatrix.ts

- **Cobertura**: 80%
- **Procedures Totales**: 10
- **Con Validación**: 8
- **Sin Validación**: 2

**Procedures sin validación:**

- `getImportHistory` (query, línea 471)
- `getActiveDepartments` (query, línea 484)

### ✅ surveyDistribution.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getRequiredSurveys` (query, línea 14)

### ✅ surveysAdmin.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDepartments` (query, línea 233)

### ✅ trainingCertificates.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `getMyCertificates` (query, línea 443)

### ✅ trainingROI.ts

- **Cobertura**: 80%
- **Procedures Totales**: 5
- **Con Validación**: 4
- **Sin Validación**: 1

**Procedures sin validación:**

- `listWithCosts` (query, línea 270)

### ✅ correctiveActionPlans.ts

- **Cobertura**: 82%
- **Procedures Totales**: 11
- **Con Validación**: 9
- **Sin Validación**: 2

**Procedures sin validación:**

- `getDashboard` (query, línea 399)
- `getExpiringSoon` (query, línea 457)

### ✅ casesManagement.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getCasesStats` (query, línea 250)

### ✅ committeeTrainings.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getStats` (query, línea 158)

### ✅ jobProfiles.ts

- **Cobertura**: 83%
- **Procedures Totales**: 12
- **Con Validación**: 10
- **Sin Validación**: 2

**Procedures sin validación:**

- `getAllTrainingNeeds` (query, línea 374)
- `getAllPositionsWithProfiles` (query, línea 503)

### ✅ leads.ts

- **Cobertura**: 83%
- **Procedures Totales**: 12
- **Con Validación**: 10
- **Sin Validación**: 2

**Procedures sin validación:**

- `getUpcomingReminders` (query, línea 414)
- `getPipelineStats` (query, línea 439)

### ✅ reportConfigurations.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getAll` (query, línea 17)

### ✅ surveyAnonymousTokens.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getStats` (query, línea 265)

### ✅ trainingAssignments.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDashboard` (query, línea 259)

### ✅ trainingEvaluations.ts

- **Cobertura**: 83%
- **Procedures Totales**: 6
- **Con Validación**: 5
- **Sin Validación**: 1

**Procedures sin validación:**

- `getGlobalDashboard` (query, línea 235)

### ✅ careerPlanning.ts

- **Cobertura**: 86%
- **Procedures Totales**: 7
- **Con Validación**: 6
- **Sin Validación**: 1

**Procedures sin validación:**

- `getVacancyProjections` (query, línea 271)

### ✅ surveyPeriods.ts

- **Cobertura**: 86%
- **Procedures Totales**: 7
- **Con Validación**: 6
- **Sin Validación**: 1

**Procedures sin validación:**

- `getActiveEmployees` (query, línea 408)

### ✅ nom035.ts

- **Cobertura**: 88%
- **Procedures Totales**: 8
- **Con Validación**: 7
- **Sin Validación**: 1

**Procedures sin validación:**

- `getActivePeriod` (query, línea 109)

### ✅ recommendationsTracking.ts

- **Cobertura**: 88%
- **Procedures Totales**: 8
- **Con Validación**: 7
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDashboard` (query, línea 213)

### ✅ trainingNeeds.ts

- **Cobertura**: 88%
- **Procedures Totales**: 8
- **Con Validación**: 7
- **Sin Validación**: 1

**Procedures sin validación:**

- `getCriticalGaps` (query, línea 311)

### ✅ interventionImpact.ts

- **Cobertura**: 89%
- **Procedures Totales**: 9
- **Con Validación**: 8
- **Sin Validación**: 1

**Procedures sin validación:**

- `getDashboard` (query, línea 777)

### ✅ meetingMinutes.ts

- **Cobertura**: 90%
- **Procedures Totales**: 10
- **Con Validación**: 9
- **Sin Validación**: 1

**Procedures sin validación:**

- `getMeetingTypes` (query, línea 337)

### ✅ recognitions.ts

- **Cobertura**: 90%
- **Procedures Totales**: 10
- **Con Validación**: 9
- **Sin Validación**: 1

**Procedures sin validación:**

- `getUnreadCount` (query, línea 440)

### ✅ employees.ts

- **Cobertura**: 95%
- **Procedures Totales**: 22
- **Con Validación**: 21
- **Sin Validación**: 1

**Procedures sin validación:**

- `generateImportTemplate` (mutation, línea 666)

### ✅ actionPlan.ts

- **Cobertura**: 100%
- **Procedures Totales**: 10
- **Con Validación**: 10
- **Sin Validación**: 0

### ✅ alertThresholds.ts

- **Cobertura**: 100%
- **Procedures Totales**: 2
- **Con Validación**: 2
- **Sin Validación**: 0

### ✅ alertsDashboard.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ algorithmEffectiveness.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ assessments.ts

- **Cobertura**: 100%
- **Procedures Totales**: 12
- **Con Validación**: 12
- **Sin Validación**: 0

### ✅ benchmarking.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ budgetPlanner.ts

- **Cobertura**: 100%
- **Procedures Totales**: 7
- **Con Validación**: 7
- **Sin Validación**: 0

### ✅ climateAnalysis.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ committeeDocuments.ts

- **Cobertura**: 100%
- **Procedures Totales**: 2
- **Con Validación**: 2
- **Sin Validación**: 0

### ✅ committeeMinutes.ts

- **Cobertura**: 100%
- **Procedures Totales**: 10
- **Con Validación**: 10
- **Sin Validación**: 0

### ✅ committeeTraining.ts

- **Cobertura**: 100%
- **Procedures Totales**: 9
- **Con Validación**: 9
- **Sin Validación**: 0

### ✅ company.ts

- **Cobertura**: 100%
- **Procedures Totales**: 19
- **Con Validación**: 19
- **Sin Validación**: 0

### ✅ competenciesStats.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ csrfViolations.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ documentAudit.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ documentFormats.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ documents.ts

- **Cobertura**: 100%
- **Procedures Totales**: 9
- **Con Validación**: 9
- **Sin Validación**: 0

### ✅ employeeDocuments.ts

- **Cobertura**: 100%
- **Procedures Totales**: 5
- **Con Validación**: 5
- **Sin Validación**: 0

### ✅ equality.ts

- **Cobertura**: 100%
- **Procedures Totales**: 21
- **Con Validación**: 21
- **Sin Validación**: 0

### ✅ evidencesFolder.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ executiveReports.ts

- **Cobertura**: 100%
- **Procedures Totales**: 2
- **Con Validación**: 2
- **Sin Validación**: 0

### ✅ hiring.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ interventionPrediction.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ interventionRecommendations.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ investigations.ts

- **Cobertura**: 100%
- **Procedures Totales**: 7
- **Con Validación**: 7
- **Sin Validación**: 0

### ✅ modelEvolution.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ nmx025EvidencesFolder.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ nom035Admin.ts

- **Cobertura**: 100%
- **Procedures Totales**: 7
- **Con Validación**: 7
- **Sin Validación**: 0

### ✅ nom035Policies.ts

- **Cobertura**: 100%
- **Procedures Totales**: 9
- **Con Validación**: 9
- **Sin Validación**: 0

### ✅ notificationHistory.ts

- **Cobertura**: 100%
- **Procedures Totales**: 2
- **Con Validación**: 2
- **Sin Validación**: 0

### ✅ organizationalCompetencies.ts

- **Cobertura**: 100%
- **Procedures Totales**: 5
- **Con Validación**: 5
- **Sin Validación**: 0

### ✅ permissionAudit.ts

- **Cobertura**: 100%
- **Procedures Totales**: 8
- **Con Validación**: 8
- **Sin Validación**: 0

### ✅ positions.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ predictiveAlerts.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ predictiveAnalytics.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ predictiveReports.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ predictiveTurnoverDashboard.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ recruitment.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ reportTemplates.ts

- **Cobertura**: 100%
- **Procedures Totales**: 7
- **Con Validación**: 7
- **Sin Validación**: 0

### ✅ reportsExport.ts

- **Cobertura**: 100%
- **Procedures Totales**: 2
- **Con Validación**: 2
- **Sin Validación**: 0

### ✅ salaryImpactSimulator.ts

- **Cobertura**: 100%
- **Procedures Totales**: 1
- **Con Validación**: 1
- **Sin Validación**: 0

### ✅ salespeople.ts

- **Cobertura**: 100%
- **Procedures Totales**: 9
- **Con Validación**: 9
- **Sin Validación**: 0

### ✅ securityAlerts.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ signatures.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ skillsMatrixSnapshots.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ stpsReports.ts

- **Cobertura**: 100%
- **Procedures Totales**: 5
- **Con Validación**: 5
- **Sin Validación**: 0

### ✅ surveyAlerts.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ surveyTokensAdvanced.ts

- **Cobertura**: 100%
- **Procedures Totales**: 8
- **Con Validación**: 8
- **Sin Validación**: 0

### ✅ surveys.ts

- **Cobertura**: 100%
- **Procedures Totales**: 43
- **Con Validación**: 43
- **Sin Validación**: 0

### ✅ systemSettings.ts

- **Cobertura**: 100%
- **Procedures Totales**: 5
- **Con Validación**: 5
- **Sin Validación**: 0

### ✅ trainingDashboard.ts

- **Cobertura**: 100%
- **Procedures Totales**: 6
- **Con Validación**: 6
- **Sin Validación**: 0

### ✅ trends.ts

- **Cobertura**: 100%
- **Procedures Totales**: 3
- **Con Validación**: 3
- **Sin Validación**: 0

### ✅ turnoverManagement.ts

- **Cobertura**: 100%
- **Procedures Totales**: 4
- **Con Validación**: 4
- **Sin Validación**: 0

### ✅ whatsappTracking.ts

- **Cobertura**: 100%
- **Procedures Totales**: 8
- **Con Validación**: 8
- **Sin Validación**: 0

### ✅ workplaceViolence.ts

- **Cobertura**: 100%
- **Procedures Totales**: 7
- **Con Validación**: 7
- **Sin Validación**: 0

## 🔧 Recomendaciones

1. Priorizar validaciones en routers con cobertura <50%
2. Enfocarse en mutations críticas (auth, payments, data modifications)
3. Usar esquemas reutilizables de `server/validators/common.ts`
4. Validar todos los inputs de usuario, incluso en queries
5. Agregar mensajes de error descriptivos en español

