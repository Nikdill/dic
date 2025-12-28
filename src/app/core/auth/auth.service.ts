import { inject, Injectable } from '@angular/core'
import { GoogleAuthProvider, signInWithPopup, UserCredential, onAuthStateChanged, User } from 'firebase/auth'
import { FIREBASE_AUTH } from '../firebase/firebase-app'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly firebaseAuth = inject(FIREBASE_AUTH);

  readonly auth$ = new Observable<User | null>(subscriber => {
    onAuthStateChanged(this.firebaseAuth, auth => {
      subscriber.next(auth);
    })
  });

  async googleSignIn(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.firebaseAuth, provider);
      // Вы можете получить информацию о пользователе из result.user
      console.log('User signed in with Google:', result.user);
      return result;
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    await this.firebaseAuth.signOut();
  }
}
