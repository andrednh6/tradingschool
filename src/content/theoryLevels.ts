import type { TheoryCard } from '../types/simulation'; // Ajusta la ruta si es necesario

export const theoryContentByLevel: Record<number, TheoryCard[]> = {
  1: [
    {
      title: "¿Qué es Invertir en una Empresa?",
      text: "Cuando compras una acción (o 'ticker'), estás comprando una pequeña parte de una empresa. ¡Te conviertes en uno de sus dueños! Si a la empresa le va bien y crece, el valor de tu acción puede aumentar."
    },
    {
      title: "Empresas y Sectores",
      text: "Cada empresa pertenece a un 'sector' (como Tecnología, Salud, Energía). Conocer el sector te da pistas sobre el tipo de negocio que es y qué podría afectar su rendimiento. Verás esta info al explorar los tickers."
    },
    {
      title: "Dos Formas de Analizar: Fundamental vs. Técnico",
      text: "Hay dos grandes enfoques para analizar acciones:\n1) **Análisis Fundamental:** Se enfoca en la 'salud' y el valor de la empresa (sus ganancias, deudas, etc.).\n2) **Análisis Técnico:** Se enfoca en estudiar los gráficos de precios para predecir movimientos futuros.\n¡Empezaremos con lo básico de ambos!"
    }
  ],
  2: [
    { title: "N2: Concepto Fundamental Clave", text: "Aquí aprenderás sobre [Concepto A del Nivel 2]..." },
    { title: "N2: Aplicando el Concepto", text: "Veremos cómo [Concepto A] se relaciona con [Concepto B]..." }
  ],
  3: [{ title: "N3: Placeholder", text: "Contenido Nivel 3..."}],
  4: [{ title: "N4: Placeholder", text: "Contenido Nivel 4..."}],
  5: [{ title: "N5: Placeholder", text: "Contenido Nivel 5..."}],
  // ... Futuros niveles y su contenido
};