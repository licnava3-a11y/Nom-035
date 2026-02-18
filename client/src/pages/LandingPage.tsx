export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-6 max-w-4xl mx-auto p-8">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Plataforma NOM-035 STPS 2018
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-400">
          Gestión Integral de Riesgos Psicosociales
        </p>
        
        <div className="pt-8">
          <a 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            Acceder a la Plataforma
          </a>
        </div>
      </div>
    </div>
  );
}
