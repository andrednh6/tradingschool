import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export type UserData = {
  uid: string;
  cash: number;
  createdAt: string; // ISO string date
  level: number;
  // Nuevo campo para rastrear el progreso de la teoría
  // Podríamos usar un número para indicar el último nivel de teoría completado.
  // Ejemplo: 0 = ninguno, 1 = teoría del Nivel 1 completada, etc.
  theoryProgress: number;
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
          level: 1, // Los usuarios empiezan en Nivel 1
          portfolio: [],
          theoryProgress: 0, // Aún no ha completado ninguna teoría de nivel
        };
        try {
          await setDoc(userRef, newUserFirestoreData);
          setUser({
            uid,
            cash: newUserFirestoreData.cash,
            createdAt: new Date().toISOString(),
            level: newUserFirestoreData.level,
            theoryProgress: newUserFirestoreData.theoryProgress,
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
          theoryProgress: data.theoryProgress || 0, // Default a 0 si no existe
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}