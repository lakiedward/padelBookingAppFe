# 🎯 State Management cu Signals

## 📖 Introducere

Aplicația folosește **StateService** pentru state management centralizat folosind **Angular Signals** (Angular 20+).

### ✅ Beneficii:
- **Performanță**: Signals oferă fine-grained reactivity (mai rapid decât Observables)
- **Simplicitate**: API mai simplu decât RxJS pentru state management
- **Type-safe**: Full TypeScript support
- **Zoneless compatible**: Funcționează perfect cu zoneless change detection

---

## 🏗️ Arhitectură

```
StateService (centralizat)
    ↓
AuthService (wrapper pentru backward compatibility)
    ↓
Components (folosesc signals pentru reactive UI)
```

---

## 📚 Cum să folosești StateService

### 1️⃣ **În Components - User State**

#### ❌ **ÎNAINTE (cu Observables):**
```typescript
import { AuthService } from '../services/auth.service';

export class MyComponent {
  currentUser$ = this.authService.currentUser$;

  constructor(private authService: AuthService) {}
}
```

```html
<div *ngIf="currentUser$ | async as user">
  Hello, {{ user.username }}!
</div>
```

#### ✅ **ACUM (cu Signals):**
```typescript
import { AuthService } from '../services/auth.service';

export class MyComponent {
  // Access signals directly
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  isAdmin = this.authService.isAdmin;

  constructor(private authService: AuthService) {}
}
```

```html
<!-- No pipe needed! -->
<div *ngIf="currentUser()">
  Hello, {{ currentUser()?.username }}!
</div>

<div *ngIf="isAdmin()">
  Admin controls here
</div>
```

---

### 2️⃣ **Direct StateService Usage**

Pentru features avansate, poți injecta direct StateService:

```typescript
import { StateService } from '../services/state.service';

export class MyComponent {
  constructor(private stateService: StateService) {}

  // User state
  currentUser = this.stateService.currentUser;
  isAuthenticated = this.stateService.isAuthenticated;
  isAdmin = this.stateService.isAdmin;

  // Courts state (pentru admin)
  courts = this.stateService.courts;
  courtsLoading = this.stateService.courtsLoading;
  courtsCount = this.stateService.courtsCount;

  // În template:
  // <div>{{ courts().length }} courts</div>
  // <div *ngIf="courtsLoading()">Loading...</div>
}
```

---

### 3️⃣ **Computed Signals în Components**

Creează valori derivate din state:

```typescript
import { computed } from '@angular/core';
import { StateService } from '../services/state.service';

export class MyComponent {
  constructor(private stateService: StateService) {}

  // Computed value - se recalculează automat
  canEditCourts = computed(() => {
    return this.stateService.isAdmin() && !this.stateService.courtsLoading();
  });

  // În template:
  // <button [disabled]="!canEditCourts()">Edit</button>
}
```

---

### 4️⃣ **Effect pentru Side Effects**

Reacționează la schimbări de state:

```typescript
import { effect } from '@angular/core';
import { StateService } from '../services/state.service';

export class MyComponent {
  constructor(private stateService: StateService) {
    // Se execută automat când currentUser se schimbă
    effect(() => {
      const user = this.stateService.currentUser();
      if (user) {
        console.log('User logged in:', user.username);
        // Load user-specific data
      }
    });
  }
}
```

---

## 🔧 StateService API

### **User State**

| Signal | Tip | Descriere |
|--------|-----|-----------|
| `currentUser()` | `User \| null` | Utilizatorul curent |
| `isAuthenticated()` | `boolean` | Status autentificare |
| `isAdmin()` | `boolean` | Are rol ROLE_ADMIN |
| `isUser()` | `boolean` | Are rol ROLE_USER |

**Actions:**
```typescript
stateService.setUser(user);        // Setează user
stateService.clearUser();          // Logout
stateService.hasRole('ROLE_ADMIN'); // Check specific role
```

---

### **Courts State** (pentru admin)

| Signal | Tip | Descriere |
|--------|-----|-----------|
| `courts()` | `CourtSummaryResponse[]` | Lista de terenuri |
| `courtsLoading()` | `boolean` | Se încarcă terenuri |
| `courtsError()` | `string \| null` | Eroare la încărcare |
| `courtsCount()` | `number` | Număr terenuri |

**Actions:**
```typescript
stateService.setCourts(courts);              // Setează lista
stateService.addCourt(court);                // Adaugă teren
stateService.updateCourt(id, updatedCourt);  // Update teren
stateService.removeCourt(id);                // Șterge teren
stateService.setCourtsLoading(true);         // Loading state
stateService.setCourtsError('Error msg');    // Error state
```

---

### **Global State**

| Signal | Tip | Descriere |
|--------|-----|-----------|
| `globalLoading()` | `boolean` | Loading indicator global |

**Actions:**
```typescript
stateService.setGlobalLoading(true);  // App-wide loading
```

---

## 🎨 Patterns & Best Practices

### ✅ **DO:**

1. **Citește state în template direct:**
   ```html
   <div>{{ currentUser()?.username }}</div>
   ```

2. **Folosește computed pentru valori derivate:**
   ```typescript
   fullName = computed(() => {
     const user = this.stateService.currentUser();
     return user ? `${user.username} (${user.email})` : '';
   });
   ```

3. **Folosește effect pentru side effects:**
   ```typescript
   effect(() => {
     if (this.stateService.isAuthenticated()) {
       this.loadUserData();
     }
   });
   ```

### ❌ **DON'T:**

1. **Nu modifica signals în computed:**
   ```typescript
   // ❌ GREȘIT
   badComputed = computed(() => {
     this.stateService.setUser(null); // Side effect în computed!
     return this.stateService.currentUser();
   });
   ```

2. **Nu folosi async pipe cu signals:**
   ```html
   <!-- ❌ GREȘIT -->
   <div>{{ currentUser | async }}</div>

   <!-- ✅ CORECT -->
   <div>{{ currentUser() }}</div>
   ```

---

## 🔄 Migration Guide

### Migrare de la `currentUser$` Observable la Signal:

1. **În Component:**
   ```typescript
   // ÎNAINTE
   currentUser$ = this.authService.currentUser$;

   // DUPĂ
   currentUser = this.authService.currentUser;
   ```

2. **În Template:**
   ```html
   <!-- ÎNAINTE -->
   <div *ngIf="currentUser$ | async as user">{{ user.username }}</div>

   <!-- DUPĂ -->
   <div *ngIf="currentUser()">{{ currentUser()?.username }}</div>
   ```

3. **Subscribe în Component:**
   ```typescript
   // ÎNAINTE
   this.authService.currentUser$.subscribe(user => {
     console.log(user);
   });

   // DUPĂ
   effect(() => {
     const user = this.authService.currentUser();
     console.log(user);
   });
   ```

---

## 📊 Debugging

Pentru a vedea state-ul complet:

```typescript
console.log(this.stateService.getStateSnapshot());
```

Output:
```json
{
  "user": { "username": "admin", ... },
  "isAuthenticated": true,
  "isAdmin": true,
  "isUser": false,
  "courtsCount": 5,
  "courtsLoading": false,
  "courtsError": null,
  "globalLoading": false
}
```

---

## 🚀 Performance

**Signals vs Observables:**
- ✅ Signals: Fine-grained updates (doar ce e necesar se re-render)
- ✅ Zoneless compatible (mai rapid!)
- ✅ Mai puțin boilerplate code
- ✅ Type-safe by default

---

## 📝 Exemple Concrete

### Exemplu: Admin Dashboard

```typescript
@Component({
  selector: 'app-admin-view',
  template: `
    <div *ngIf="isAdmin()">
      <h1>Welcome, {{ currentUser()?.username }}</h1>

      <div *ngIf="courtsLoading()">Loading courts...</div>

      <div *ngIf="courtsError()">
        Error: {{ courtsError() }}
      </div>

      <div *ngIf="!courtsLoading()">
        You have {{ courtsCount() }} courts

        <div *ngFor="let court of courts()">
          {{ court.name }}
        </div>
      </div>
    </div>
  `
})
export class AdminViewComponent {
  // Inject state service
  constructor(private stateService: StateService) {}

  // Expose signals
  currentUser = this.stateService.currentUser;
  isAdmin = this.stateService.isAdmin;
  courts = this.stateService.courts;
  courtsCount = this.stateService.courtsCount;
  courtsLoading = this.stateService.courtsLoading;
  courtsError = this.stateService.courtsError;

  // Computed
  canManageCourts = computed(() =>
    this.isAdmin() && !this.courtsLoading()
  );
}
```

---

## 🎯 Concluzie

**StateService oferă:**
- ✅ State management modern cu signals
- ✅ Type-safe și performant
- ✅ API simplu și consistent
- ✅ Perfect pentru Angular 20+ cu zoneless

**Backward compatibility:**
- AuthService menține metodele vechi (`isLoggedIn()`, `getCurrentUser()`)
- Componente existente continuă să funcționeze
- Migrarea incrementală la signals se poate face gradual
