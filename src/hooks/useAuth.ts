import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

type UserData = {
  uid: string;
  cash: number;
  createdAt: string;
};

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        await signInAnonymously(auth);
        return;
      }

      const uid = firebaseUser.uid;
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const newUser = {
          cash: 10000,
          createdAt: serverTimestamp(),
        };
        await setDoc(ref, newUser);
        setUser({ uid, cash: 10000, createdAt: "" });
      } else {
        const data = snap.data();
        setUser({ uid, cash: data.cash, createdAt: data.createdAt.toDate().toISOString() });
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}
