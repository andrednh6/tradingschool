import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to TradingSchool!",
    icon: "🎉",
    content: (
      <>
        <p className="mb-2">Here you'll learn the basics of investing by simulating trading in a risk-free environment.</p>
        <p>Let’s get started!</p>
      </>
    ),
  },
  {
    title: "What is a Stock?",
    icon: "🏢",
    content: (
      <>
        <p>
          A <b>stock</b> is a small piece of a company. Its price goes up or down depending on how the company and the market perform.
        </p>
      </>
    ),
  },
  {
    title: "How to Trade",
    icon: "💡",
    content: (
      <>
        <p>
          Buy stocks when you think their price will go up. Sell them when you think it’s time to take profit or avoid a loss.
        </p>
        <p>Your goal: grow your virtual portfolio!</p>
      </>
    ),
  },
  {
    title: "Track Your Progress",
    icon: "📈",
    content: (
      <>
        <p>Check your portfolio's value over time and see how your decisions affect your performance.</p>
        <p>Ready to make your first trade?</p>
      </>
    ),
  },
];

type OnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  if (!open) return null;

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out">
      {/* Modal Card */}
      <div className="relative bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-2xl shadow-2xl p-6 max-w-[90vw] w-full sm:max-w-md mx-2 animate-fadeIn">
        {/* Close Button */}
        <button
          className="absolute top-2 right-3 text-xl font-bold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <span className="text-5xl mb-3">{STEPS[step].icon}</span>
          <h2 className="text-2xl font-bold mb-1 text-center">{STEPS[step].title}</h2>
        </div>
        {/* Content */}
        <div className="mb-6 text-center text-sm ">{STEPS[step].content}</div>
        {/* Buttons */}
        <div className="flex justify-between items-center">
          <button
            className="px-4 py-2 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
            onClick={onClose}
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                className="px-4 py-2 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {!isLast ? (
              <button
                className="px-4 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
                onClick={onClose}
              >
                Start trading!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}