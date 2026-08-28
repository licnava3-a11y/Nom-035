export interface EmployeeAutofillSource {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeNumber?: string | null;
  departmentId?: number | null;
  department?: string | null;
  departmentName?: string | null;
  positionId?: number | null;
  position?: string | null;
  positionName?: string | null;
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  gender?: string | null;
  hireDate?: string | null;
  companyId?: number | null;
  company?: string | null;
  companyName?: string | null;
  branchId?: number | null;
  branch: string | null;
  branchName?: string | null;
  managerId?: number | null;
  manager?: string | null;
  managerName?: string | null;
}

export interface EmployeeAutofillData {
  employeeId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  departmentId: number | null;
  departmentName: string;
  positionId: number | null;
  positionName: string;
  curp: string;
  rfc: string;
  nss: string;
  gender: string;
  hireDate: string;
  companyId: number | null;
  companyName: string;
  branchId: number | null;
  branchName: string;
  managerId: number | null;
  managerName: string;
}

export function toEmployeeAutofillData(employee: EmployeeAutofillSource): EmployeeAutofillData {
  const firstName = employee.firstName ?? "";
  const lastName = employee.lastName ?? "";

  return {
    employeeId: employee.id,
    fullName: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    employeeNumber: employee.employeeNumber ?? "",
    departmentId: employee.departmentId ?? null,
    departmentName: employee.departmentName ?? employee.department ?? "",
    positionId: employee.positionId ?? null,
    positionName: employee.positionName ?? employee.position ?? "",
    curp: employee.curp ?? "",
    rfc: employee.rfc ?? "",
    nss: employee.nss ?? "",
    gender: employee.gender ?? "",
    hireDate: employee.hireDate ?? "",
    companyId: employee.companyId ?? null,
    companyName: employee.companyName ?? employee.company ?? "",
    branchId: employee.branchId ?? null,
    branchName: employee.branchName ?? employee.branch ?? "",
    managerId: employee.managerId ?? null,
    managerName: employee.managerName ?? employee.manager ?? "",
  };
}

export function toEmployeeAutofillOption(employee: EmployeeAutofillSource) {
  const data = toEmployeeAutofillData(employee);
  return {
    value: data.employeeId.toString(),
    label: `${data.fullName} — ${data.email}`,
    sublabel: data.departmentName,
  };
}
