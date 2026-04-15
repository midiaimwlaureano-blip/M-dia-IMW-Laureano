import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isCoordinator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try to find user by UID first
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: userDoc.id, ...userDoc.data() } as User);
          } else {
            // Check if user was pre-registered by email
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const existingData = existingDoc.data();
              
              const newUser: User = {
                ...existingData,
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || existingData.displayName || 'Usuário',
                email: firebaseUser.email || existingData.email || '',
              } as User;

              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              if (existingDoc.id !== firebaseUser.uid) {
                await deleteDoc(existingDoc.ref);
              }
              setUser(newUser);
            } else {
              // New user registration
              const isAdminEmail = ['midiaimwlaureano@gmail.com', 'melolucas78@gmail.com', 'thatianebusiness@gmail.com'].includes(firebaseUser.email || '');
              const newUser: User = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Usuário',
                email: firebaseUser.email || '',
                role: isAdminEmail ? 'LIDER_I' : 'VOLUNTARIO',
                status: isAdminEmail ? 'approved' : 'pending',
                createdAt: new Date().toISOString(),
                color: '#4F46E5', // Default indigo
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              setUser(newUser);
            }
          }
        } catch (error) {
          console.error("Error fetching or creating user:", error);
          // If there's an error (like permission denied), we should sign out to prevent a broken state
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.role === 'LIDER_I' || user?.role === 'LIDER_II' || ['midiaimwlaureano@gmail.com', 'melholucas78@gmail.com', 'thatianebusiness@gmail.com'].includes(user?.email || '');
  const isCoordinator = isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isCoordinator }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
