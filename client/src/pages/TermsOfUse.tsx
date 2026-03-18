import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function TermsOfUse() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Regresar al inicio
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Términos de Uso</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Última actualización: 1 de enero de {currentYear}
          </p>
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al acceder y utilizar la <strong>Plataforma NOM-035 STPS 2018</strong> (en adelante "la Plataforma"),
              usted acepta quedar vinculado por los presentes Términos de Uso. Si no está de acuerdo con alguno
              de estos términos, le pedimos que se abstenga de utilizar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma es un sistema de gestión integral para el cumplimiento de la{" "}
              <strong>NOM-035-STPS-2018</strong> — Factores de riesgo psicosocial en el trabajo —, que incluye
              módulos de identificación y análisis de riesgos, gestión de casos, capacitación de implementadores,
              seguimiento de acciones correctivas y generación de reportes de cumplimiento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Uso Autorizado</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              El acceso a la Plataforma está restringido a:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Personal autorizado de la organización con credenciales válidas</li>
              <li>Implementadores certificados de la NOM-035-STPS-2018</li>
              <li>Miembros del Comité de Atención a Trabajadores</li>
              <li>Mandos medios y directivos con rol asignado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Obligaciones del Usuario</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Al utilizar la Plataforma, el usuario se compromete a:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>No compartir información sensible de trabajadores con terceros no autorizados</li>
              <li>Utilizar la Plataforma exclusivamente para los fines establecidos en la NOM-035</li>
              <li>Reportar cualquier uso no autorizado o brecha de seguridad</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Confidencialidad de la Información</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toda la información generada en la Plataforma, especialmente los resultados de cuestionarios
              NOM-035 y los casos de riesgo psicosocial, es estrictamente confidencial. Su divulgación no
              autorizada puede constituir una violación a la{" "}
              <strong>Ley Federal del Trabajo</strong> y a la{" "}
              <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Propiedad Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              El contenido, diseño, código fuente, metodologías y materiales de capacitación disponibles en
              la Plataforma están protegidos por las leyes de propiedad intelectual aplicables en México.
              Queda prohibida su reproducción, distribución o modificación sin autorización expresa por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma proporciona herramientas de apoyo para el cumplimiento de la NOM-035-STPS-2018,
              pero <strong>no sustituye el criterio profesional</strong> de médicos del trabajo, psicólogos
              organizacionales ni asesores legales especializados. La organización es responsable de las
              decisiones tomadas con base en la información generada por la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Marco Legal Aplicable</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              El uso de la Plataforma se rige por la legislación mexicana vigente, incluyendo:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>NOM-035-STPS-2018 — Factores de riesgo psicosocial en el trabajo</li>
              <li>Ley Federal del Trabajo (LFT)</li>
              <li>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</li>
              <li>Reglamento Federal de Seguridad y Salud en el Trabajo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de modificar estos Términos de Uso en cualquier momento. Las
              modificaciones entrarán en vigor a partir de su publicación en la Plataforma. El uso
              continuado de la Plataforma implica la aceptación de los términos modificados.
            </p>
          </section>

        </div>

        <Separator className="my-8" />

        <div className="text-center text-xs text-muted-foreground">
          <p>© {currentYear} Plataforma NOM-035 STPS 2018. Todos los derechos reservados.</p>
          <p className="mt-1">
            Plataforma desarrollada para el cumplimiento de la normativa STPS en México
          </p>
        </div>
      </div>
    </div>
  );
}
