import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos del documento PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  logo: {
    width: 100,
    height: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 10,
    backgroundColor: '#eff6ff',
    padding: 8,
  },
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    color: 'white',
    fontWeight: 'bold',
    paddingVertical: 8,
  },
  tableCol1: {
    width: '50%',
    paddingHorizontal: 8,
  },
  tableCol2: {
    width: '25%',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  tableCol3: {
    width: '25%',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 20,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 5,
  },
  progressFill: {
    height: '100%',
  },
  evidenceItem: {
    marginBottom: 8,
    paddingLeft: 10,
  },
  evidenceText: {
    fontSize: 9,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  semaforo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  semaforoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  semaforoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  semaforoLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 5,
    textAlign: 'center',
  },
});

interface AutodiagnosticoPDFProps {
  autodiagnostico: {
    id: number;
    fecha: string;
    porcentajeTotal: number;
    status: string;
  };
  categorias: Array<{
    categoria: string;
    porcentaje: number;
    cumplidos: number;
    total: number;
  }>;
  evidencias: Array<{
    requirementId: number;
    codigo: string;
    descripcion: string;
    cumple: boolean;
    evidenciaUrl: string | null;
    observaciones: string | null;
  }>;
  companyLogo?: string;
  companyName?: string;
}

export const AutodiagnosticoPDFDocument = ({
  autodiagnostico,
  categorias,
  evidencias,
  companyLogo,
  companyName = 'Empresa',
}: AutodiagnosticoPDFProps) => {
  const getSemaforoColor = (porcentaje: number) => {
    if (porcentaje >= 85) return '#22c55e'; // Verde
    if (porcentaje >= 60) return '#eab308'; // Amarillo
    return '#ef4444'; // Rojo
  };

  const getSemaforoLabel = (porcentaje: number) => {
    if (porcentaje >= 85) return 'Cumplimiento Alto';
    if (porcentaje >= 60) return 'Cumplimiento Medio';
    return 'Cumplimiento Bajo';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {companyLogo && <Image src={companyLogo} style={styles.logo} />}
          <Text style={styles.title}>
            Reporte de Autodiagnóstico NOM-035-STPS-2018
          </Text>
          <Text style={styles.subtitle}>
            {companyName} • Fecha: {new Date(autodiagnostico.fecha).toLocaleDateString('es-MX')}
          </Text>
        </View>

        {/* Semáforo de Cumplimiento Global */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cumplimiento Global</Text>
          <View style={styles.semaforo}>
            <View>
              <View
                style={[
                  styles.semaforoCircle,
                  { backgroundColor: getSemaforoColor(autodiagnostico.porcentajeTotal) },
                ]}
              >
                <Text style={styles.semaforoText}>
                  {autodiagnostico.porcentajeTotal}%
                </Text>
              </View>
              <Text style={styles.semaforoLabel}>
                {getSemaforoLabel(autodiagnostico.porcentajeTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabla de Cumplimiento por Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cumplimiento por Categoría</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>Categoría</Text>
              <Text style={styles.tableCol2}>Cumplidos</Text>
              <Text style={styles.tableCol3}>Porcentaje</Text>
            </View>
            {categorias.map((cat, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{cat.categoria}</Text>
                <Text style={styles.tableCol2}>
                  {cat.cumplidos}/{cat.total}
                </Text>
                <Text style={styles.tableCol3}>{cat.porcentaje}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Evidencias Documentales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidencias Documentales</Text>
          {evidencias
            .filter((ev) => ev.cumple && ev.evidenciaUrl)
            .map((ev, index) => (
              <View key={index} style={styles.evidenceItem}>
                <Text style={styles.evidenceText}>
                  • {ev.codigo}: {ev.descripcion}
                </Text>
                <Text style={[styles.evidenceText, { paddingLeft: 10, color: '#2563eb' }]}>
                  URL: {ev.evidenciaUrl}
                </Text>
                {ev.observaciones && (
                  <Text style={[styles.evidenceText, { paddingLeft: 10, fontStyle: 'italic' }]}>
                    Obs: {ev.observaciones}
                  </Text>
                )}
              </View>
            ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Reporte generado el {new Date().toLocaleString('es-MX')} • Folio: AUTO-
            {autodiagnostico.id.toString().padStart(4, '0')}/{new Date().getFullYear()}
          </Text>
          <Text style={{ marginTop: 5 }}>
            Este documento es un autodiagnóstico de cumplimiento de la NOM-035-STPS-2018
          </Text>
        </View>
      </Page>
    </Document>
  );
};
