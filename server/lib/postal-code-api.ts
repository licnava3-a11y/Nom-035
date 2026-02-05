/**
 * Integración con API de Códigos Postales Mexicanos
 * 
 * Utiliza Bluewire API (gratuita) como proveedor principal
 * Fallback a COPOMEX API si Bluewire falla
 */

export interface PostalCodeData {
  postalCode: string;
  state: string;
  municipality: string;
  colonies: string[];
}

/**
 * Obtiene información de dirección desde código postal
 * Intenta primero con Bluewire API, luego con COPOMEX como fallback
 */
export async function getAddressByPostalCode(postalCode: string): Promise<PostalCodeData | null> {
  // Validar formato de código postal (5 dígitos)
  if (!/^\d{5}$/.test(postalCode)) {
    throw new Error('Código postal debe tener 5 dígitos');
  }

  // Intentar con Bluewire API (gratuita, sin API key)
  try {
    const bluewireData = await fetchFromBluewire(postalCode);
    if (bluewireData) {
      return bluewireData;
    }
  } catch (error) {
    console.warn('Bluewire API failed, trying COPOMEX:', error);
  }

  // Fallback a COPOMEX API (gratuita, sin API key)
  try {
    const copomexData = await fetchFromCopomex(postalCode);
    if (copomexData) {
      return copomexData;
    }
  } catch (error) {
    console.warn('COPOMEX API failed:', error);
  }

  return null;
}

/**
 * Obtiene datos desde Bluewire API
 * Endpoint: https://codigospostalesmx.bluewire.com.mx/api/codigos_postales/{cp}
 */
async function fetchFromBluewire(postalCode: string): Promise<PostalCodeData | null> {
  const url = `https://codigospostalesmx.bluewire.com.mx/api/codigos_postales/${postalCode}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Bluewire API error: ${response.status}`);
  }

  const data = await response.json();

  // Validar que tenga datos
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Extraer información (Bluewire retorna array de objetos)
  const firstResult = data[0];
  const state = firstResult.estado || firstResult.state || '';
  const municipality = firstResult.municipio || firstResult.municipality || '';
  
  // Extraer todas las colonias únicas
  const coloniesSet = new Set(data.map((item: any) => 
    item.colonia || item.colony || item.asentamiento || ''
  ).filter(Boolean));
  const colonies = Array.from(coloniesSet);

  return {
    postalCode,
    state,
    municipality,
    colonies,
  };
}

/**
 * Obtiene datos desde COPOMEX API (fallback)
 * Endpoint: https://api.copomex.com/query/info_cp/{cp}
 */
async function fetchFromCopomex(postalCode: string): Promise<PostalCodeData | null> {
  const url = `https://api.copomex.com/query/info_cp/${postalCode}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`COPOMEX API error: ${response.status}`);
  }

  const data = await response.json();

  // Validar estructura de respuesta
  if (!data || !data.response || !Array.isArray(data.response.asentamiento)) {
    return null;
  }

  const responseData = data.response;
  const state = responseData.estado || '';
  const municipality = responseData.municipio || '';
  const colonies = responseData.asentamiento || [];

  return {
    postalCode,
    state,
    municipality,
    colonies,
  };
}

/**
 * Busca códigos postales por coincidencia (útil para autocompletado)
 * Solo disponible en COPOMEX API
 */
export async function searchPostalCodes(query: string): Promise<string[]> {
  if (query.length < 2) {
    return [];
  }

  try {
    const url = `https://api.copomex.com/query/get_cp_por_asentamiento/${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.response)) {
      return [];
    }

    // Extraer códigos postales únicos
    const postalCodesSet = new Set(data.response.map((item: any) => item.cp).filter(Boolean));
    const postalCodes = Array.from(postalCodesSet) as string[];

    return postalCodes.slice(0, 10); // Limitar a 10 resultados
  } catch (error) {
    console.warn('Search postal codes failed:', error);
    return [];
  }
}
