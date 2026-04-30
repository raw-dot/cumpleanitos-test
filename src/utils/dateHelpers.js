/**
 * Funciones utilitarias para manejo de fechas
 */

/**
 * Calcula cuántos días faltan para el próximo cumpleaños
 * @param {string} birthdayStr - Fecha de cumpleaños en formato YYYY-MM-DD
 * @returns {number|string} Número de días o "¡Hoy!"
 */
export function daysUntilBirthday(birthdayStr) {
  const today = new Date();
  // Usar T12:00:00 para evitar el desfase de zona horaria (UTC-3 Argentina)
  const bday = new Date(birthdayStr + "T12:00:00");
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
  const diff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
  return diff === 0 ? "¡Hoy!" : diff;
}

/**
 * Formatea una fecha de cumpleaños a formato legible
 * @param {string} birthdayStr - Fecha de cumpleaños en formato YYYY-MM-DD
 * @returns {string} Fecha formateada como "3 de enero"
 */
export function formatBirthday(birthdayStr) {
  const d = new Date(birthdayStr + "T12:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Calcula la edad actual del usuario
 * @param {string} birthdayStr - Fecha de nacimiento en formato YYYY-MM-DD
 * @returns {number} Edad en años
 */
export function getAge(birthdayStr) {
  const today = new Date();
  const bday = new Date(birthdayStr + "T12:00:00");
  let age = today.getFullYear() - bday.getFullYear();
  const month = today.getMonth() - bday.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < bday.getDate())) age--;
  return age;
}

/**
 * Calcula cuántos días faltan para el próximo cumpleaños (versión numérica)
 * @param {string} birthdayStr - Fecha de cumpleaños en formato YYYY-MM-DD
 * @returns {number} Número de días (0 si es hoy)
 */
export function getDaysToBirthday(birthdayStr) {
  const today = new Date();
  const bday = new Date(birthdayStr + "T12:00:00");
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
  const diff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
  return diff === 0 ? 0 : diff;
}

/**
 * Formatea un tiempo pasado de forma relativa
 * @param {string} dateStr - Fecha en formato ISO
 * @returns {string} Texto como "Hace un momento", "Hace 5 min", etc
 */
export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

/**
 * Valida si una fecha es válida
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {boolean} True si la fecha es válida
 */
export function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} Fecha actual
 */
export function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Formatea una fecha a formato ISO (YYYY-MM-DD)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function formatDateToISO(date) {
  if (typeof date === "string") return date;
  return date.toISOString().split("T")[0];
}
