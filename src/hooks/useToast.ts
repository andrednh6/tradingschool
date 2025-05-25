import { useState } from "react";

export function useToast(timeout = 2000) {
  const [message, setMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), timeout);
  }

  return { message, showToast };
}
