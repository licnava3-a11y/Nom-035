-- Índices de optimización de rendimiento para Plataforma NOM-035
-- Creados: 2026-02-19
-- Propósito: Mejorar performance de queries frecuentes

-- Tabla: employees (búsquedas frecuentes por departamento, email, CURP)
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(departmentId);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_curp ON employees(curp);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(createdAt);

-- Tabla: cases (filtros por status, prioridad, departamento, fecha)
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_department_id ON cases(departmentId);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(createdAt);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assignedTo);
CREATE INDEX IF NOT EXISTS idx_cases_reporter_id ON cases(reporterId);

-- Tabla: survey_responses (queries por surveyId, employeeId, periodo)
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(surveyId);
CREATE INDEX IF NOT EXISTS idx_survey_responses_employee_id ON survey_responses(employeeId);
CREATE INDEX IF NOT EXISTS idx_survey_responses_period_id ON survey_responses(periodId);
CREATE INDEX IF NOT EXISTS idx_survey_responses_completed ON survey_responses(completedAt);

-- Tabla: survey_employee_tokens (búsquedas por token, employeeId, expiración)
CREATE INDEX IF NOT EXISTS idx_survey_tokens_token ON survey_employee_tokens(token);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_employee_id ON survey_employee_tokens(employeeId);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_survey_period_id ON survey_employee_tokens(surveyPeriodId);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_expires_at ON survey_employee_tokens(expiresAt);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_used ON survey_employee_tokens(used);

-- Tabla: users (búsquedas por email, employeeId, role)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employeeId);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(openId);

-- Tabla: training_assignments (filtros por status, miembro, fecha)
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_committee_member_id ON training_assignments(committeeMemberId);
CREATE INDEX IF NOT EXISTS idx_training_assignments_training_id ON training_assignments(trainingId);
CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_date ON training_assignments(assignedDate);

-- Tabla: training_certificates (búsquedas por assignmentId, expiración)
CREATE INDEX IF NOT EXISTS idx_training_certificates_assignment_id ON training_certificates(assignmentId);
CREATE INDEX IF NOT EXISTS idx_training_certificates_expiry_date ON training_certificates(expiryDate);

-- Tabla: committee_members (búsquedas por employeeId, position)
CREATE INDEX IF NOT EXISTS idx_committee_members_employee_id ON committee_members(employeeId);
CREATE INDEX IF NOT EXISTS idx_committee_members_position ON committee_members(position);

-- Tabla: notifications (queries por userId, tipo, leído, fecha)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(createdAt);

-- Índices compuestos para queries complejas frecuentes
CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_cases_department_status ON cases(departmentId, status);
CREATE INDEX IF NOT EXISTS idx_employees_department_status ON employees(departmentId, status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_period_employee ON survey_responses(periodId, employeeId);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, read);

-- Índices para ordenamiento frecuente
CREATE INDEX IF NOT EXISTS idx_cases_created_at_desc ON cases(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON notifications(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_employees_created_at_desc ON employees(createdAt DESC);

