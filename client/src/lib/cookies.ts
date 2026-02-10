/**
 * Obtiene el valor de una cookie por su nombre
 * @param name - Nombre de la cookie
 * @returns Valor de la cookie o null si no existe
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue || null;
  }
  
  return null;
}

/**
 * Obtiene el token JWT de autenticación de las cookies
 * @returns Token JWT o null si no existe
 */
export function getAuthToken(): string | null {
  // El nombre de la cookie puede variar según la configuración del servidor
  // Intentar con nombres comunes
  const possibleNames = ["session", "auth_token", "jwt", "token"];
  
  for (const name of possibleNames) {
    const token = getCookie(name);
    if (token) {
      return token;
    }
  }
  
  return null;
}
