import { useState } from 'react';
import type { TheoryCard } from '../types/simulation';

interface TheoryGuideProps {
  cards: TheoryCard[];
  onCompleteSeries: () => void; // Se llama cuando se ve la última tarjeta
  // Podríamos pasarle el tema actual (claro/oscuro) para los estilos si no lo toma del contexto global
}

export function TheoryGuide({ cards, onCompleteSeries }: TheoryGuideProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  if (!cards || cards.length === 0) {
    return null;
  }

  const handleNext = async () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      await onCompleteSeries(); // Todas las tarjetas de esta serie han sido vistas
    }
  };

  const card = cards[currentCardIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[100]"> {/* Alto z-index */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl max-w-lg w-full transform transition-all">
        <h3 className="text-2xl font-bold mb-4 text-indigo-600 dark:text-indigo-400">{card.title}</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-line leading-relaxed text-sm md:text-base">
          {card.text}
        </p>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">
          Tarjeta {currentCardIndex + 1} de {cards.length}
        </div>
        <button
          onClick={handleNext}
          className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-150"
        >
          {currentCardIndex < cards.length - 1 ? 'Siguiente Concepto' : '¡Entendido! Finalizar Teoría'}
        </button>
      </div>
    </div>
  );
}