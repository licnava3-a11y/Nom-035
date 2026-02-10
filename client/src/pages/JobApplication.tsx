import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type WorkHistoryEntry = {
  companyName: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  responsibilities: string;
  reasonForLeaving: string;
};

type ReferenceEntry = {
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
};

export default function JobApplication() {
  const params = useParams();
  const jobId = parseInt(params.jobId || "0");
  const [, setLocation] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Paso 1: Datos personales
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [curp, setCurp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"Masculino" | "Femenino">("Masculino");
  const [birthState, setBirthState] = useState("");
  const [age, setAge] = useState<number | undefined>();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [education, setEducation] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");

  // Validación de CURP
  const [curpValidated, setCurpValidated] = useState(false);
  const [curpError, setCurpError] = useState("");
  const [curpToValidate, setCurpToValidate] = useState("");
  
  const { data: curpData, isLoading: validatingCurp } = trpc.employees.validateCURP.useQuery(
    { curp: curpToValidate },
    { enabled: curpToValidate.length === 18 }
  );

  // Paso 2: Cláusulas ARCO
  const [arcoAccepted, setArcoAccepted] = useState(false);
  const [verificationAuthorized, setVerificationAuthorized] = useState(false);

  // Paso 3: Historial laboral
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([
    {
      companyName: "",
      position: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      responsibilities: "",
      reasonForLeaving: "",
    },
  ]);

  // Paso 4: Referencias
  const [references, setReferences] = useState<ReferenceEntry[]>([
    {
      name: "",
      position: "",
      company: "",
      phone: "",
      email: "",
      relationship: "",
    },
  ]);

  const { data: jobOpening, isLoading: loadingJob } = trpc.recruitment.getJobOpenings.useQuery(
    { status: "open" },
    {
      select: (data) => data.find((job) => job.id === jobId),
    }
  );

  const createCandidateMutation = trpc.recruitment.createCandidate.useMutation({
    onSuccess: () => {
      toast.success("¡Postulación enviada exitosamente!");
      setLocation("/application-success");
    },
    onError: (error) => {
      toast.error(`Error al enviar postulación: ${error.message}`);
    },
  });

  const handleValidateCurp = () => {
    if (curp.length !== 18) {
      setCurpError("El CURP debe tener 18 caracteres");
      setCurpValidated(false);
      return;
    }
    setCurpToValidate(curp);
  };

  // Efecto para procesar resultado de validación
  if (curpData && curpToValidate === curp) {
    if (curpData.valid && !curpValidated) {
      setCurpValidated(true);
      setCurpError("");
      setBirthDate(curpData.fechaNacimiento || "");
      setGender(curpData.genero || "Masculino");
      setBirthState(curpData.estado || "");
      setAge(curpData.edad);
      toast.success("CURP validado correctamente");
    } else if (!curpData.valid && curpValidated) {
      setCurpError("CURP inválido");
      setCurpValidated(false);
    }
  }

  const addWorkHistoryEntry = () => {
    setWorkHistory([
      ...workHistory,
      {
        companyName: "",
        position: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        responsibilities: "",
        reasonForLeaving: "",
      },
    ]);
  };

  const removeWorkHistoryEntry = (index: number) => {
    setWorkHistory(workHistory.filter((_, i) => i !== index));
  };

  const updateWorkHistory = (index: number, field: keyof WorkHistoryEntry, value: any) => {
    const updated = [...workHistory];
    updated[index] = { ...updated[index], [field]: value };
    setWorkHistory(updated);
  };

  const addReference = () => {
    setReferences([
      ...references,
      {
        name: "",
        position: "",
        company: "",
        phone: "",
        email: "",
        relationship: "",
      },
    ]);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const updateReference = (index: number, field: keyof ReferenceEntry, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const validateStep1 = () => {
    if (!firstName || !lastName || !email || !phone || !curp) {
      toast.error("Por favor completa todos los campos obligatorios");
      return false;
    }
    if (!curpValidated) {
      toast.error("Por favor valida tu CURP antes de continuar");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!arcoAccepted || !verificationAuthorized) {
      toast.error("Debes aceptar las cláusulas para continuar");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const hasValidEntry = workHistory.some(
      (entry) => entry.companyName && entry.position && entry.startDate
    );
    if (!hasValidEntry) {
      toast.error("Agrega al menos una experiencia laboral válida");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    const hasValidReference = references.some(
      (ref) => ref.name && ref.phone && ref.relationship
    );
    if (!hasValidReference) {
      toast.error("Agrega al menos una referencia válida");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    try {
      await createCandidateMutation.mutateAsync({
        jobOpeningId: jobId,
        firstName,
        lastName,
        email,
        phone,
        curp,
        birthDate,
        gender,
        birthState,
        age,
        address,
        city,
        state,
        postalCode,
        education,
        fieldOfStudy,
        arcoAccepted,
        verificationAuthorized,
        workHistory: workHistory.filter((wh) => wh.companyName && wh.position),
        references: references.filter((ref) => ref.name && ref.phone),
      });
    } catch (error) {
      console.error("Error submitting application:", error);
    }
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!jobOpening) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Vacante no encontrada</h1>
        <p className="text-muted-foreground">La vacante que buscas no existe o ha sido cerrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Postulación: {jobOpening.title}</CardTitle>
            <CardDescription>{jobOpening.description}</CardDescription>
            <div className="flex items-center gap-2 mt-4">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index + 1 <= currentStep ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Paso {currentStep} de {totalSteps}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Paso 1: Datos Personales */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Datos Personales</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nombre(s) *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellidos *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Pérez García"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Correo Electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="juan.perez@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="5512345678"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="curp">CURP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="curp"
                      value={curp}
                      onChange={(e) => {
                        setCurp(e.target.value.toUpperCase());
                        setCurpValidated(false);
                      }}
                      placeholder="PEGG900101HDFRRL09"
                      maxLength={18}
                    />
                    <Button
                      type="button"
                      onClick={handleValidateCurp}
                      disabled={curp.length !== 18 || validatingCurp}
                    >
                      {validatingCurp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : curpValidated ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        "Validar"
                      )}
                    </Button>
                  </div>
                  {curpError && <p className="text-sm text-red-600 mt-1">{curpError}</p>}
                  {curpValidated && (
                    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> CURP validado correctamente
                    </p>
                  )}
                </div>

                {curpValidated && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                    <div>
                      <Label className="text-xs">Fecha de Nacimiento</Label>
                      <p className="text-sm font-medium">{birthDate}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Género</Label>
                      <p className="text-sm font-medium">{gender}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Estado de Nacimiento</Label>
                      <p className="text-sm font-medium">{birthState}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="education">Nivel de Estudios</Label>
                    <Input
                      id="education"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Licenciatura"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fieldOfStudy">Área de Estudio</Label>
                    <Input
                      id="fieldOfStudy"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      placeholder="Ingeniería en Sistemas"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Número, Colonia"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ciudad de México"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="01000"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Paso 2: Cláusulas ARCO */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Aviso de Privacidad y Autorización</h3>
                
                <div className="p-6 bg-blue-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-lg">Aviso de Privacidad ARCO</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares,
                    le informamos que los datos personales que nos proporcione serán utilizados exclusivamente para fines
                    de reclutamiento y selección de personal. Sus datos serán tratados de manera confidencial y no serán
                    compartidos con terceros sin su consentimiento expreso.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (Derechos ARCO) al tratamiento de sus
                    datos personales en cualquier momento, contactando a nuestro departamento de Recursos Humanos.
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="arco"
                    checked={arcoAccepted}
                    onCheckedChange={(checked) => setArcoAccepted(checked as boolean)}
                  />
                  <label
                    htmlFor="arco"
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    He leído y acepto el Aviso de Privacidad. Autorizo el tratamiento de mis datos personales
                    para fines de reclutamiento y selección de personal. *
                  </label>
                </div>

                <div className="p-6 bg-amber-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-lg">Declaración de Veracidad</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Declaro bajo protesta de decir verdad que la información proporcionada en esta solicitud es
                    verídica y completa. Comprendo que cualquier falsedad u omisión puede ser causa de rechazo
                    de mi solicitud o, en su caso, de rescisión de mi contrato de trabajo.
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="verification"
                    checked={verificationAuthorized}
                    onCheckedChange={(checked) => setVerificationAuthorized(checked as boolean)}
                  />
                  <label
                    htmlFor="verification"
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    Declaro que la información proporcionada es verdadera y autorizo la verificación de
                    referencias laborales, académicas y personales. *
                  </label>
                </div>
              </div>
            )}

            {/* Paso 3: Historial Laboral */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Historial Laboral</h3>
                  <Button type="button" onClick={addWorkHistoryEntry} variant="outline" size="sm">
                    Agregar Empleo
                  </Button>
                </div>

                {workHistory.map((entry, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold">Empleo #{index + 1}</h4>
                      {workHistory.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkHistoryEntry(index)}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Empresa *</Label>
                        <Input
                          value={entry.companyName}
                          onChange={(e) => updateWorkHistory(index, "companyName", e.target.value)}
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                      <div>
                        <Label>Puesto *</Label>
                        <Input
                          value={entry.position}
                          onChange={(e) => updateWorkHistory(index, "position", e.target.value)}
                          placeholder="Título del puesto"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Fecha de Inicio *</Label>
                        <Input
                          type="date"
                          value={entry.startDate}
                          onChange={(e) => updateWorkHistory(index, "startDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Fecha de Fin</Label>
                        <Input
                          type="date"
                          value={entry.endDate}
                          onChange={(e) => updateWorkHistory(index, "endDate", e.target.value)}
                          disabled={entry.isCurrent}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox
                        id={`current-${index}`}
                        checked={entry.isCurrent}
                        onCheckedChange={(checked) =>
                          updateWorkHistory(index, "isCurrent", checked as boolean)
                        }
                      />
                      <label htmlFor={`current-${index}`} className="text-sm cursor-pointer">
                        Trabajo actual
                      </label>
                    </div>

                    <div className="mt-4">
                      <Label>Responsabilidades</Label>
                      <Textarea
                        value={entry.responsibilities}
                        onChange={(e) => updateWorkHistory(index, "responsibilities", e.target.value)}
                        placeholder="Describe tus principales responsabilidades..."
                        rows={3}
                      />
                    </div>

                    {!entry.isCurrent && (
                      <div className="mt-4">
                        <Label>Motivo de Salida</Label>
                        <Input
                          value={entry.reasonForLeaving}
                          onChange={(e) => updateWorkHistory(index, "reasonForLeaving", e.target.value)}
                          placeholder="Motivo por el que dejaste este empleo"
                        />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Paso 4: Referencias */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Referencias Laborales</h3>
                  <Button type="button" onClick={addReference} variant="outline" size="sm">
                    Agregar Referencia
                  </Button>
                </div>

                {references.map((ref, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold">Referencia #{index + 1}</h4>
                      {references.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReference(index)}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre Completo *</Label>
                        <Input
                          value={ref.name}
                          onChange={(e) => updateReference(index, "name", e.target.value)}
                          placeholder="Nombre de la referencia"
                        />
                      </div>
                      <div>
                        <Label>Puesto</Label>
                        <Input
                          value={ref.position}
                          onChange={(e) => updateReference(index, "position", e.target.value)}
                          placeholder="Puesto que ocupa"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Empresa</Label>
                        <Input
                          value={ref.company}
                          onChange={(e) => updateReference(index, "company", e.target.value)}
                          placeholder="Nombre de la empresa"
                        />
                      </div>
                      <div>
                        <Label>Relación *</Label>
                        <Input
                          value={ref.relationship}
                          onChange={(e) => updateReference(index, "relationship", e.target.value)}
                          placeholder="Ej: Jefe directo, Colega, etc."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>Teléfono *</Label>
                        <Input
                          value={ref.phone}
                          onChange={(e) => updateReference(index, "phone", e.target.value)}
                          placeholder="Número de contacto"
                        />
                      </div>
                      <div>
                        <Label>Correo Electrónico</Label>
                        <Input
                          type="email"
                          value={ref.email}
                          onChange={(e) => updateReference(index, "email", e.target.value)}
                          placeholder="correo@example.com"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Botones de Navegación */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNext}>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createCandidateMutation.isPending}
                >
                  {createCandidateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Postulación"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
