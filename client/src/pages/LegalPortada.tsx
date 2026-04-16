import { useState } from "react";
import { Shield, Lock, FileText, Scale, Eye, Building2, Phone, Mail, Globe, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

const CURRENT_YEAR = new Date().getFullYear();

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 font-semibold text-foreground">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-6 py-5 text-sm text-muted-foreground leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LegalPortada() {
  const { data: company } = trpc.company.getGeneralData.useQuery();

  const companyName = company?.razonSocial || "Gestión de Talento — Plataforma NOM-035 STPS";
  const companyRFC = company?.rfc || "";
  const companyAddress = company?.direccionFiscal || "México";
  const companyEmail = company?.emailContacto || "";
  const companyPhone = company?.telefonoContacto || "";
  const companyWeb = company?.paginaWeb || "";
  const representante = company?.representanteLegal || "";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero / Portada ─────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px"
          }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 text-center">
          {/* Logo / Escudo legal */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
              <Scale className="h-10 w-10 text-white" />
            </div>
          </div>

          <Badge variant="outline" className="border-white/30 text-white/80 mb-4 text-xs tracking-widest uppercase">
            Documento Legal Oficial
          </Badge>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
            Aviso Legal, Privacidad y<br />Términos de Uso
          </h1>
          <p className="text-white/70 text-lg mb-2">{companyName}</p>
          {companyRFC && <p className="text-white/50 text-sm mb-6">RFC: {companyRFC}</p>}

          <div className="flex flex-wrap justify-center gap-3 text-xs text-white/60 mb-8">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> NOM-035-STPS-2018</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> LFPDPPP</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ley Federal del Trabajo</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> IMSS / INFONAVIT</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> ISO 27001</span>
          </div>

          {/* Fecha de vigencia */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2 text-sm text-white/80">
            <FileText className="h-4 w-4" />
            Vigente a partir del 1 de enero de {CURRENT_YEAR} — Última actualización: {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* ── Contenido Legal ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Datos del Responsable */}
        <Card className="p-6 mb-8 border-l-4 border-l-blue-500">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Datos del Responsable del Tratamiento de Datos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Razón Social</p>
              <p className="font-medium">{companyName}</p>
            </div>
            {companyRFC && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">RFC</p>
                <p className="font-medium">{companyRFC}</p>
              </div>
            )}
            {companyAddress && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Domicilio Fiscal</p>
                <p className="font-medium">{companyAddress}</p>
              </div>
            )}
            {representante && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Representante Legal</p>
                <p className="font-medium">{representante}</p>
              </div>
            )}
            {companyEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{companyEmail}</p>
              </div>
            )}
            {companyPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{companyPhone}</p>
              </div>
            )}
            {companyWeb && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{companyWeb}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Secciones colapsables */}

        <CollapsibleSection
          title="1. Derechos Reservados y Propiedad Intelectual"
          icon={<Shield className="h-5 w-5 text-purple-500" />}
          defaultOpen={true}
        >
          <p>
            © {CURRENT_YEAR} {companyName}. Todos los derechos reservados. El presente sistema de gestión de talento y cumplimiento NOM-035, incluyendo su código fuente, diseño, bases de datos, logotipos, marcas, nombres comerciales, documentación técnica y cualquier otro elemento que lo componga, es propiedad exclusiva de sus titulares y se encuentra protegido por las siguientes disposiciones legales:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Ley Federal del Derecho de Autor (LFDA)</strong> — Artículos 13, 14 y 102</li>
            <li><strong>Ley de la Propiedad Industrial (LPI)</strong> — Artículos 87 y siguientes</li>
            <li><strong>Convenio de Berna</strong> para la Protección de las Obras Literarias y Artísticas</li>
            <li><strong>Tratado de la OMPI</strong> sobre Derecho de Autor (WCT)</li>
            <li><strong>T-MEC / USMCA</strong> — Capítulo 20 sobre Propiedad Intelectual</li>
          </ul>
          <p>
            Queda estrictamente prohibida la reproducción total o parcial, distribución, comunicación pública, transformación, ingeniería inversa o cualquier otro uso no autorizado de los contenidos de este sistema sin el consentimiento previo, expreso y por escrito del titular de los derechos.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-700 dark:text-amber-400 text-xs">
              El incumplimiento de estas disposiciones podrá dar lugar a acciones civiles y penales conforme a la legislación mexicana vigente, incluyendo reclamaciones por daños y perjuicios.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="2. Aviso de Privacidad y Protección de Datos Personales"
          icon={<Lock className="h-5 w-5 text-green-500" />}
          defaultOpen={true}
        >
          <p>
            En cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>, publicada en el Diario Oficial de la Federación el 5 de julio de 2010, y su Reglamento publicado el 21 de diciembre de 2011, se informa lo siguiente:
          </p>
          <h4 className="font-semibold text-foreground mt-2">Datos Personales Recabados</h4>
          <p>
            Este sistema recaba y trata datos personales de empleados, incluyendo: nombre completo, CURP, RFC, NSS (Número de Seguridad Social), fecha de nacimiento, sexo, estado civil, domicilio, correo electrónico, teléfono, información laboral (puesto, departamento, fecha de ingreso, tipo de contrato, salario), datos de capacitación y evaluaciones de factores de riesgo psicosocial conforme a la NOM-035-STPS-2018.
          </p>
          <h4 className="font-semibold text-foreground mt-2">Finalidades del Tratamiento</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Gestión de recursos humanos y nómina</li>
            <li>Cumplimiento de la NOM-035-STPS-2018 (identificación y prevención de factores de riesgo psicosocial)</li>
            <li>Administración de capacitación y desarrollo profesional</li>
            <li>Gestión de vacaciones, permisos y ausencias</li>
            <li>Elaboración de reportes para autoridades laborales (STPS, IMSS, INFONAVIT)</li>
            <li>Prevención y atención de casos de violencia laboral, mobbing y acoso</li>
          </ul>
          <h4 className="font-semibold text-foreground mt-2">Derechos ARCO</h4>
          <p>
            Los titulares de los datos personales tienen derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse (ARCO)</strong> al tratamiento de sus datos personales, conforme al Artículo 28 de la LFPDPPP. Para ejercer estos derechos, el titular deberá presentar solicitud por escrito al responsable del tratamiento, incluyendo: nombre completo, domicilio, descripción clara del derecho que desea ejercer, y documentos que acrediten su identidad.
          </p>
          {companyEmail && (
            <p>
              Correo para solicitudes ARCO: <strong>{companyEmail}</strong>
            </p>
          )}
          <h4 className="font-semibold text-foreground mt-2">Transferencias de Datos</h4>
          <p>
            Los datos personales no serán transferidos a terceros sin consentimiento del titular, salvo las excepciones previstas en el Artículo 37 de la LFPDPPP, incluyendo transferencias requeridas por autoridades competentes (STPS, IMSS, INFONAVIT, INAI) en el ejercicio de sus atribuciones.
          </p>
          <h4 className="font-semibold text-foreground mt-2">Seguridad de los Datos</h4>
          <p>
            Se implementan medidas técnicas, administrativas y físicas de seguridad para proteger los datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado, conforme al Artículo 19 de la LFPDPPP y los lineamientos del <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)</strong>.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="3. Marco Legal Aplicable — NOM-035-STPS-2018"
          icon={<FileText className="h-5 w-5 text-red-500" />}
          defaultOpen={false}
        >
          <p>
            Este sistema ha sido desarrollado para apoyar el cumplimiento de la <strong>Norma Oficial Mexicana NOM-035-STPS-2018</strong>, "Factores de riesgo psicosocial en el trabajo — Identificación, análisis y prevención", publicada en el Diario Oficial de la Federación el 23 de octubre de 2018, con entrada en vigor en dos etapas:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Primera etapa:</strong> 23 de octubre de 2019 — Obligaciones de política, difusión y medidas de prevención</li>
            <li><strong>Segunda etapa:</strong> 23 de octubre de 2020 — Identificación y análisis de factores de riesgo psicosocial, evaluación del entorno organizacional</li>
          </ul>
          <h4 className="font-semibold text-foreground mt-2">Obligaciones del Patrón</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Establecer una política de prevención de riesgos psicosociales (Apartado 5.1)</li>
            <li>Identificar y analizar los factores de riesgo psicosocial (Apartado 5.2)</li>
            <li>Evaluar el entorno organizacional (Apartado 5.3)</li>
            <li>Adoptar medidas para prevenir y controlar los factores de riesgo (Apartado 5.4)</li>
            <li>Practicar exámenes médicos a trabajadores expuestos a violencia laboral (Apartado 5.5)</li>
            <li>Difundir y proporcionar información a los trabajadores (Apartado 5.6)</li>
            <li>Llevar registros de los resultados de la identificación y análisis (Apartado 5.7)</li>
          </ul>
          <h4 className="font-semibold text-foreground mt-2">Legislación Complementaria</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Ley Federal del Trabajo (LFT)</strong> — Artículos 3°, 51, 132, 133, 994 y 1004-C (obligaciones del patrón, causas de rescisión, sanciones)</li>
            <li><strong>Reglamento Federal de Seguridad y Salud en el Trabajo (RFSST)</strong> — Artículos 43 y 44</li>
            <li><strong>Ley del Seguro Social (LSS)</strong> — Artículos 41, 42, 43 (riesgos de trabajo)</li>
            <li><strong>Ley del INFONAVIT</strong> — Obligaciones de registro y aportaciones</li>
            <li><strong>Ley General de Salud</strong> — Artículos 168 y 169 (salud mental)</li>
            <li><strong>NOM-019-STPS-2011</strong> — Comisiones de Seguridad e Higiene</li>
            <li><strong>NOM-030-STPS-2009</strong> — Servicios preventivos de seguridad y salud</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection
          title="4. Confidencialidad y Uso de la Información"
          icon={<Eye className="h-5 w-5 text-indigo-500" />}
          defaultOpen={false}
        >
          <p>
            Toda la información contenida en este sistema tiene carácter <strong>estrictamente confidencial</strong>. El acceso a la misma está restringido exclusivamente al personal autorizado de la organización, conforme a los roles y permisos asignados por el administrador del sistema.
          </p>
          <h4 className="font-semibold text-foreground mt-2">Obligaciones de Confidencialidad</h4>
          <p>
            Los usuarios del sistema se obligan a:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Mantener la confidencialidad de las credenciales de acceso (usuario y contraseña)</li>
            <li>No divulgar, compartir ni transferir información del sistema a personas no autorizadas</li>
            <li>Utilizar la información exclusivamente para los fines laborales para los que fue otorgado el acceso</li>
            <li>Reportar de inmediato cualquier acceso no autorizado o brecha de seguridad al administrador del sistema</li>
            <li>No realizar capturas de pantalla, descargas o copias de información sensible sin autorización expresa</li>
          </ul>
          <h4 className="font-semibold text-foreground mt-2">Información Especialmente Sensible</h4>
          <p>
            Los resultados de las evaluaciones de factores de riesgo psicosocial, los casos de violencia laboral, los expedientes de entrevistas de salida y los datos médicos de los trabajadores son considerados <strong>datos personales sensibles</strong> conforme al Artículo 3, fracción VI de la LFPDPPP, y reciben el más alto nivel de protección disponible en el sistema.
          </p>
          <h4 className="font-semibold text-foreground mt-2">Retención y Eliminación de Datos</h4>
          <p>
            Los datos personales serán conservados durante el tiempo necesario para cumplir con las finalidades del tratamiento y las obligaciones legales aplicables. Conforme a la LFT y la normativa de la STPS, los registros relacionados con la NOM-035 deben conservarse por un mínimo de <strong>5 años</strong> contados a partir de su generación.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="5. Términos y Condiciones de Uso del Sistema"
          icon={<Scale className="h-5 w-5 text-orange-500" />}
          defaultOpen={false}
        >
          <h4 className="font-semibold text-foreground">5.1 Acceso y Uso Autorizado</h4>
          <p>
            El acceso a este sistema está restringido a personas físicas que hayan sido expresamente autorizadas por el administrador de la organización. Cada usuario es responsable de todas las acciones realizadas con sus credenciales de acceso. El uso no autorizado del sistema constituye una violación a los términos de uso y puede dar lugar a responsabilidad civil y/o penal.
          </p>
          <h4 className="font-semibold text-foreground mt-2">5.2 Prohibiciones Expresas</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Acceder al sistema con credenciales de terceros o compartir las propias</li>
            <li>Intentar vulnerar, hackear o comprometer la seguridad del sistema</li>
            <li>Introducir virus, malware o código malicioso</li>
            <li>Realizar ingeniería inversa del software</li>
            <li>Usar el sistema para fines distintos a los laborales autorizados</li>
            <li>Extraer, copiar o transferir bases de datos sin autorización</li>
            <li>Modificar, alterar o eliminar registros sin las autorizaciones correspondientes</li>
          </ul>
          <h4 className="font-semibold text-foreground mt-2">5.3 Disponibilidad del Sistema</h4>
          <p>
            El sistema se proporciona "tal como está" (as-is). Si bien se realizan esfuerzos razonables para garantizar su disponibilidad continua, no se garantiza que el servicio esté libre de interrupciones, errores o que sea completamente seguro. El responsable no será liable por daños derivados de interrupciones del servicio fuera de su control.
          </p>
          <h4 className="font-semibold text-foreground mt-2">5.4 Modificaciones</h4>
          <p>
            El responsable se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a los usuarios con al menos 15 días de anticipación. El uso continuado del sistema tras la notificación implica la aceptación de los nuevos términos.
          </p>
          <h4 className="font-semibold text-foreground mt-2">5.5 Jurisdicción y Ley Aplicable</h4>
          <p>
            Para la interpretación y cumplimiento de los presentes términos, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles en razón de sus domicilios presentes o futuros, o por cualquier otra causa. La ley aplicable es la legislación mexicana vigente.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="6. Seguridad de la Información y Cumplimiento Técnico"
          icon={<Shield className="h-5 w-5 text-teal-500" />}
          defaultOpen={false}
        >
          <h4 className="font-semibold text-foreground">Medidas de Seguridad Implementadas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {[
              { label: "Autenticación OAuth 2.0", desc: "Acceso seguro mediante protocolo estándar de autorización" },
              { label: "Cifrado en tránsito (TLS 1.3)", desc: "Todas las comunicaciones están cifradas con TLS" },
              { label: "Control de acceso por roles (RBAC)", desc: "Acceso granular según rol: admin, RH, supervisor, empleado" },
              { label: "Registro de auditoría", desc: "Trazabilidad completa de acciones críticas en el sistema" },
              { label: "Almacenamiento seguro en nube", desc: "Datos almacenados en infraestructura con certificación SOC 2" },
              { label: "Sesiones con expiración automática", desc: "Las sesiones inactivas expiran para prevenir accesos no autorizados" },
            ].map((item) => (
              <div key={item.label} className="flex gap-2 p-3 bg-muted/30 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-xs">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <h4 className="font-semibold text-foreground mt-4">Estándares de Referencia</h4>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>ISO/IEC 27001:2022</strong> — Gestión de Seguridad de la Información</li>
            <li><strong>ISO/IEC 27701:2019</strong> — Gestión de Privacidad de la Información</li>
            <li><strong>NIST Cybersecurity Framework</strong> — Marco de ciberseguridad</li>
            <li><strong>OWASP Top 10</strong> — Mitigación de vulnerabilidades web más comunes</li>
            <li><strong>Lineamientos INAI</strong> — Medidas de seguridad para datos personales</li>
          </ul>
        </CollapsibleSection>

        <CollapsibleSection
          title="7. Responsabilidad y Limitación de Garantías"
          icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
          defaultOpen={false}
        >
          <p>
            El sistema es una herramienta de apoyo para el cumplimiento normativo. La responsabilidad final del cumplimiento de la NOM-035-STPS-2018 y demás disposiciones legales aplicables recae en el patrón (persona física o moral empleadora), conforme a lo establecido en la Ley Federal del Trabajo y el Reglamento Federal de Seguridad y Salud en el Trabajo.
          </p>
          <p>
            Los reportes, dictámenes y documentos generados por este sistema tienen carácter de apoyo administrativo. Para efectos legales ante la STPS, IMSS u otras autoridades, los documentos deberán ser revisados, validados y firmados por el responsable legal de la organización o el profesional certificado correspondiente.
          </p>
          <p>
            En ningún caso el proveedor del sistema será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del sistema, incluyendo pérdida de datos, pérdida de ingresos o sanciones impuestas por autoridades regulatorias.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="8. Contacto del Responsable y Autoridad Supervisora"
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Responsable del Sistema</h4>
              <p className="font-medium">{companyName}</p>
              {representante && <p className="text-xs">Representante Legal: {representante}</p>}
              {companyAddress && <p className="text-xs">{companyAddress}</p>}
              {companyEmail && (
                <p className="flex items-center gap-1 text-xs mt-1">
                  <Mail className="h-3 w-3" /> {companyEmail}
                </p>
              )}
              {companyPhone && (
                <p className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3" /> {companyPhone}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Autoridades Competentes</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium">INAI — Instituto Nacional de Transparencia</p>
                  <p className="text-muted-foreground">Protección de datos personales</p>
                  <p className="text-blue-600">www.inai.org.mx</p>
                </div>
                <div>
                  <p className="font-medium">STPS — Secretaría del Trabajo y Previsión Social</p>
                  <p className="text-muted-foreground">Cumplimiento NOM-035 y normativa laboral</p>
                  <p className="text-blue-600">www.stps.gob.mx</p>
                </div>
                <div>
                  <p className="font-medium">IMSS — Instituto Mexicano del Seguro Social</p>
                  <p className="text-muted-foreground">Riesgos de trabajo y seguridad social</p>
                  <p className="text-blue-600">www.imss.gob.mx</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <Separator className="my-8" />

        {/* Pie de página legal */}
        <div className="text-center space-y-3 pb-8">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Scale className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">
            © {CURRENT_YEAR} {companyName}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Este documento constituye el aviso legal, aviso de privacidad y términos de uso del sistema de gestión de talento y cumplimiento NOM-035-STPS-2018. Su contenido es de carácter informativo y no sustituye el asesoramiento legal profesional. Para dudas o aclaraciones, contacte al responsable del sistema.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mt-4">
            <span>Versión 2.0 — {CURRENT_YEAR}</span>
            <span>•</span>
            <span>NOM-035-STPS-2018 Compliant</span>
            <span>•</span>
            <span>LFPDPPP Compliant</span>
            <span>•</span>
            <span>México</span>
          </div>
        </div>
      </div>
    </div>
  );
}
