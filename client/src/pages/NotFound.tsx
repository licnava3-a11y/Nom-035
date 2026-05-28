import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="text-center px-6 max-w-lg">
        {/* Icono principal */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <FileQuestion className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Número 404 */}
        <h1 className="text-8xl font-black text-blue-600 mb-2 leading-none tracking-tight">
          404
        </h1>

        {/* Título */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Página no encontrada
        </h2>

        {/* Descripción */}
        <p className="text-slate-500 mb-2 leading-relaxed">
          La página que buscas no existe o fue movida.
        </p>
        <p className="text-slate-400 text-sm mb-8 font-mono bg-slate-100 rounded px-3 py-1 inline-block">
          {location}
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="px-6 py-2.5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar
          </Button>
          <Button
            onClick={() => setLocation("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5"
          >
            <Home className="w-4 h-4 mr-2" />
            Ir al Dashboard
          </Button>
        </div>

        {/* Branding */}
        <p className="mt-10 text-xs text-slate-400">
          Plataforma de Capacitación NOM-035 STPS 2018
        </p>
      </div>
    </div>
  );
}
