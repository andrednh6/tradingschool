import { useEffect, useState } from "react";

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_seen");
    if (!seen) setShow(true);
  }, []);

  function finish() {
    setShow(false);
    localStorage.setItem("onboarding_seen", "1");
  }
  function reopen() {
    setShow(true);
  }
  return { show, finish, reopen };
}
