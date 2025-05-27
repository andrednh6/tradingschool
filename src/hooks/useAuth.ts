import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth"; // Values
import type { User as FirebaseUser } from "firebase/auth"; // Type-only import
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export type UserData = {
  uid: string;
  cash: number;
  createdAt: string; // ISO string date
  level: number;
};

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false);
        }
        return;
      }

      const uid = firebaseUser.uid;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newUserFirestoreData = {
          cash: 10000,
          createdAt: serverTimestamp(),
          level: 1,
          portfolio: [],
        };
        try {
          await setDoc(userRef, newUserFirestoreData);
          setUser({
            uid,
            cash: newUserFirestoreData.cash,
            createdAt: new Date().toISOString(),
            level: newUserFirestoreData.level,
          });
        } catch (error) {
          console.error("Error creating new user document:", error);
        }
      } else {
        const data = userSnap.data();
        let isoCreatedAt = "";
        if (data.createdAt instanceof Timestamp) {
          isoCreatedAt = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          isoCreatedAt = data.createdAt;
        }

        setUser({
          uid,
          cash: data.cash,
          createdAt: isoCreatedAt,
          level: data.level || 1,
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}