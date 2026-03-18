import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
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
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Aviso de Privacidad</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Última actualización: 1 de enero de {currentYear}
          </p>
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Responsable del Tratamiento de Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              La <strong>Plataforma NOM-035 STPS 2018</strong> (en adelante "la Plataforma") es responsable del
              tratamiento de sus datos personales conforme a lo establecido en la{" "}
              <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>{" "}
              y su Reglamento, así como en los{" "}
              <strong>Lineamientos del Aviso de Privacidad del INAI</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Datos Personales Recabados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              La Plataforma recaba los siguientes datos personales para el cumplimiento de sus finalidades:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Nombre completo y datos de identificación</li>
              <li>Correo electrónico corporativo</li>
              <li>Departamento, puesto y área de adscripción</li>
              <li>Antigüedad laboral y tipo de contratación</li>
              <li>Respuestas a cuestionarios NOM-035 (datos sensibles de salud laboral)</li>
              <li>Registros de capacitación y evaluaciones de desempeño</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidades del Tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Sus datos personales serán utilizados para las siguientes finalidades <strong>primarias</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                Cumplimiento de la <strong>NOM-035-STPS-2018</strong> — Identificación, análisis y prevención de
                factores de riesgo psicosocial en el trabajo
              </li>
              <li>Gestión de programas de capacitación y desarrollo organizacional</li>
              <li>Seguimiento de casos de riesgo psicosocial por el Comité de Atención</li>
              <li>Generación de reportes estadísticos y análisis de clima laboral</li>
              <li>Cumplimiento de obligaciones legales ante la STPS</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Datos Sensibles</h2>
            <p className="text-muted-foreground leading-relaxed">
              Los datos relacionados con la salud mental y el bienestar laboral recopilados a través de los
              cuestionarios NOM-035 son considerados <strong>datos sensibles</strong> conforme al artículo 3,
              fracción VI de la LFPDPPP. Su tratamiento se realiza con las medidas de seguridad reforzadas
              establecidas en la normativa vigente y únicamente para las finalidades descritas en este aviso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Transferencia de Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sus datos personales <strong>no serán transferidos</strong> a terceros sin su consentimiento expreso,
              salvo en los casos previstos en el artículo 37 de la LFPDPPP, incluyendo autoridades competentes
              cuando sea requerido por ley o cuando sea necesario para la defensa de derechos en procesos judiciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Derechos ARCO</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> (derechos ARCO) al
              tratamiento de sus datos personales. Para ejercer estos derechos, puede:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Contactar al área de Recursos Humanos de su organización</li>
              <li>Presentar solicitud por escrito al responsable del tratamiento</li>
              <li>Acudir ante el INAI si considera que sus derechos han sido vulnerados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Medidas de Seguridad</h2>
            <p className="text-muted-foreground leading-relaxed">
              La Plataforma implementa medidas de seguridad técnicas, administrativas y físicas para proteger
              sus datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado, conforme
              a los estándares establecidos en el Reglamento de la LFPDPPP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cambios al Aviso de Privacidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cualquier modificación a este Aviso de Privacidad será notificada a través de la Plataforma con
              al menos 30 días de anticipación. El uso continuado de la Plataforma implica la aceptación de
              las modificaciones realizadas.
            </p>
          </section>

        </div>

        <Separator className="my-8" />

        <div className="text-center text-xs text-muted-foreground">
          <p>© {currentYear} Plataforma NOM-035 STPS 2018. Todos los derechos reservados.</p>
          <p className="mt-1">
            Cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares
          </p>
        </div>
      </div>
    </div>
  );
}
