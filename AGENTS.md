# AGENTS.md — PLAYORA Frontend / Padel Booking App

Acest fișier oferă instrucțiuni pentru agenți și contribuabili care lucrează pe **frontend-ul** proiectului PLAYORA (Padel Booking App).

## Prezentare generală

- **Repository**: Frontend (Angular 20)
- **Framework**: Angular 20.1.4 cu SSR (Server-Side Rendering) opțional
- **UI Library**: PrimeNG 20.2.0 + PrimeIcons
- **Stilizare**: SCSS
- **Arhitectură**: Componente standalone (fără NgModule)
- **State Management**: RxJS BehaviorSubject în servicii
- **Backend API**: `https://padelbookingappbe-production.up.railway.app` (Railway - production)
  - Repository backend separat: `padelBookingAppBe`
  - **Backend-ul rulează DOAR pe Railway** - nu există setup local pentru backend

## Structură repository

```
padelBookingAppFe/
├── src/
│   ├── app/
│   │   ├── components/          # Toate componentele UI
│   │   │   ├── admin-view/      # Dashboard admin
│   │   │   ├── auth/            # Autentificare
│   │   │   ├── browse-courts-page/
│   │   │   ├── court-card/
│   │   │   ├── court-detail/
│   │   │   ├── create-court/
│   │   │   ├── booking-page/
│   │   │   ├── calendar-page/
│   │   │   ├── club-details/
│   │   │   └── ...
│   │   ├── services/            # Servicii HTTP și state management
│   │   │   ├── auth.service.ts
│   │   │   ├── court.service.ts
│   │   │   ├── club.service.ts
│   │   │   ├── booking.service.ts
│   │   │   ├── event.service.ts
│   │   │   ├── public.service.ts
│   │   │   ├── state.service.ts
│   │   │   └── map.service.ts
│   │   ├── models/              # TypeScript interfaces și DTO-uri
│   │   │   ├── auth.models.ts
│   │   │   ├── court.models.ts
│   │   │   ├── club.models.ts
│   │   │   ├── booking.models.ts
│   │   │   └── event.models.ts
│   │   ├── guards/              # Route guards
│   │   │   ├── auth.guard.ts
│   │   │   ├── admin.guard.ts
│   │   │   └── auth-redirect.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts  # JWT token injection
│   │   ├── pipes/
│   │   │   └── time24.pipe.ts
│   │   ├── features/            # Feature routing
│   │   │   ├── admin/
│   │   │   └── user/
│   │   ├── app.routes.ts        # Routing principal
│   │   └── app.config.ts        # App configuration
│   ├── assets/                  # Iconițe sport și alte resurse
│   ├── environments/
│   │   └── environment.ts       # Config API URL
│   ├── styles.scss              # Stiluri globale
│   ├── main.ts                  # Bootstrap client
│   ├── main.server.ts           # Bootstrap SSR
│   └── server.ts                # Express server pentru SSR
├── angular.json
├── package.json
├── tsconfig.json
└── AGENTS.md                    # Acest fișier
```

## Cerințe de mediu

- **Node.js**: 20+ (recomandat LTS)
- **npm**: 10+
- **Angular CLI**: 20.1.4 (se instalează local via npm)

## Pornire rapidă (dev)

### 1. Instalare dependențe

```bash
npm install
```

### 2. Start development server

```bash
npm start
# sau
ng serve
```

Aplicația va rula la `http://localhost:4200`

### 3. Build production

```bash
npm run build
```

### 4. Build și rulare cu SSR

```bash
npm run build
npm run serve:ssr:PadelBookingFe
```

### 5. Teste unitare

```bash
npm test
```

## Configurare API

API URL este configurat în `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'https://padelbookingappbe-production.up.railway.app'
};
```

**Backend API:**

- **Railway**: `https://padelbookingappbe-production.up.railway.app` (UNIC)
- Backend-ul **nu rulează local** - dezvoltarea frontend se face întotdeauna împotriva instanței Railway

> **Notă**: Dacă backend-ul Railway este down sau în maintenance, dezvoltarea frontend va fi blocată. Asigurați-vă că backend-ul este funcțional înainte de a începe lucrul pe frontend.

## Convenții de cod și arhitectură

### Componente Standalone

**Toate componentele sunt standalone** (fără NgModule). Fiecare componentă își importă propriile dependențe:

```typescript
@Component({
  selector: 'app-court-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './court-card.component.html',
  styleUrl: './court-card.component.scss'
})
export class CourtCardComponent {
  // ...
}
```

### Structură componentă

Fiecare componentă are propriul său folder cu 3 fișiere:

```
component-name/
├── component-name.component.ts
├── component-name.component.html
└── component-name.component.scss
```

### Servicii și Dependency Injection

Serviciile sunt injectate prin DI și folosesc `providedIn: 'root'`:

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/api/auth`;
  // ...
}
```

### State Management

Se folosește **RxJS BehaviorSubject** pentru state management:

- `AuthService.currentUser$` - starea utilizatorului curent
- `StateService` - alte state-uri globale

**Exemplu:**

```typescript
private currentUserSubject = new BehaviorSubject<User | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();
```

### HTTP și Autentificare

- **JWT Token**: stocat în `localStorage` (`token`)
- **Auth Interceptor**: adaugă automat header-ul `Authorization: Bearer {token}`
- **Guards**: protejează rutele (auth.guard.ts, admin.guard.ts)

### PrimeNG

UI folosește **PrimeNG 20.2.0**. Importați componentele individual:

```typescript
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
```

### Stilizare

- **SCSS**: fiecare componentă are propriul său fișier `.scss`
- **Stiluri globale**: `src/styles.scss`
- **PrimeNG Themes**: `@primeng/themes` cu Aura theme
- **Prettier**: configurat pentru HTML cu parser Angular

### Reactive Forms

Preferați **Reactive Forms** în loc de Template-Driven Forms:

```typescript
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

this.form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]]
});
```

## Routing și Features

### Route Guards

- **auth.guard.ts**: verifică dacă utilizatorul e autentificat
- **admin.guard.ts**: verifică dacă utilizatorul are rol `ROLE_ADMIN`
- **auth-redirect.guard.ts**: redirectează utilizatorii autentificați

### Feature Routes

- **Admin routes**: `src/app/features/admin/admin.routes.ts`
- **User routes**: `src/app/features/user/user.routes.ts`

## API Integration

### Endpoint-uri Backend

**Public (fără autentificare):**
- `GET /api/public/clubs` - listă cluburi
- `GET /api/public/clubs/{id}` - detalii club
- `GET /api/public/courts` - terenuri disponibile
- `GET /api/public/events` - evenimente publice

**User (autentificat, ROLE_USER):**
- `GET /api/user/bookings` - rezervările mele
- `POST /api/user/bookings` - creează rezervare

**Admin (autentificat, ROLE_ADMIN):**
- `POST /api/admin/club/create` - creează club
- `PUT /api/admin/club` - actualizează club
- `GET /api/admin/courts` - terenurile mele
- `POST /api/admin/courts` - creează teren
- `PUT /api/admin/courts/{id}` - actualizează teren
- `DELETE /api/admin/courts/{id}` - șterge teren

Toate endpoint-urile sunt documentate în repository-ul backend.

## Modele și DTO-uri

Modelele TypeScript sunt sincronizate cu DTO-urile backend (Kotlin):

**Exemple principale:**

```typescript
// auth.models.ts
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; role?: string; }
export interface AuthResponse { token: string; user: User; }
export interface User { id: number; email: string; role: string; }

// court.models.ts
export interface Court {
  id: number;
  name: string;
  sport: string;
  description?: string;
  tags: string[];
  primaryPhotoUrl?: string;
  photos: CourtPhoto[];
}

// club.models.ts
export interface Club {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  profileImageUrl?: string;
  wallpaperImageUrl?: string;
}
```

## Ghid pentru adăugări/modificări

### Adăugare componentă nouă

```bash
ng generate component components/my-new-component --standalone
```

Apoi adăugați importurile necesare în componenta generată.

### Adăugare serviciu nou

```bash
ng generate service services/my-service
```

Serviciul va fi automat `providedIn: 'root'`.

### Adăugare model/interface

Creați un fișier nou în `src/app/models/` cu suffix `.models.ts`:

```typescript
// src/app/models/my-feature.models.ts
export interface MyFeature {
  id: number;
  name: string;
}
```

### Adăugare rută

Editați `src/app/app.routes.ts` sau feature routes corespunzător:

```typescript
export const routes: Routes = [
  {
    path: 'my-route',
    component: MyComponent,
    canActivate: [authGuard] // opțional
  }
];
```

## Resurse și Assets

### Iconițe sport

Assets disponibile în `src/assets/icons/`:
- `padel.png`, `tennis.png`, `squash.png`, `football.png`
- `basketball.png`, `volleyball.png`, `handball.png`, `badminton.png`
- `pingpong.png`
- `edit.png`, `trash.png`, `photo.png`, `map-pin.png`

### Google Maps Integration

Se folosește `MapService` pentru încărcarea dinamică a Google Maps API.

## Best Practices

### 1. Evitați hard-codarea URL-urilor

❌ **Greșit:**
```typescript
this.http.get('https://padelbookingappbe-production.up.railway.app/api/courts')
```

✅ **Corect:**
```typescript
private apiUrl = `${environment.apiBaseUrl}/api/courts`;
this.http.get(this.apiUrl)
```

### 2. Curățați resursele în ngOnDestroy

```typescript
ngOnDestroy() {
  if (this.imageUrl) {
    URL.revokeObjectURL(this.imageUrl);
  }
  this.subscription?.unsubscribe();
}
```

### 3. Folosiți async pipe în template

❌ **Greșit:**
```typescript
// component.ts
courts: Court[] = [];
ngOnInit() {
  this.courtService.getCourts().subscribe(c => this.courts = c);
}
```

✅ **Corect:**
```typescript
// component.ts
courts$ = this.courtService.getCourts();

// template
<div *ngFor="let court of courts$ | async">
```

### 4. Type safety

Folosiți **strict type checking** și evitați `any`:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

## Debugging și Development Tools

### Angular DevTools

Instalați extensia **Angular DevTools** în Chrome pentru:
- Component tree inspection
- Change detection profiling
- Dependency injection tree

### Console Logging

Pentru debugging, folosiți `console.log`, `console.error`, dar **eliminați-le înainte de commit în production**.

## Testing

### Unit Tests (Karma/Jasmine)

```bash
npm test
```

Fiecare componentă ar trebui să aibă un fișier `.spec.ts` corespunzător.

## SSR (Server-Side Rendering)

SSR este **opțional** și configurat prin:
- `src/main.server.ts` - bootstrap server
- `src/server.ts` - Express server
- `angular.json` - builder `@angular/build:application`

Pentru dev obișnuit, **nu este necesar SSR** - folosiți `ng serve`.

## Integrare cu Backend

Backend-ul este un repository **separat** (`padelBookingAppBe`):

- **Repository**: Spring Boot 3.5.4 (Kotlin)
- **Production URL**: `https://padelbookingappbe-production.up.railway.app`
- **Setup local**: ❌ **Nu există** - backend rulează DOAR pe Railway

> **Important**: Dezvoltarea frontend depinde de instanța Railway. Dacă aveți nevoie de modificări la API, acestea trebuie deployate pe Railway pentru a le putea consuma în frontend.

Pentru modificări la API, consultați `padelBookingAppBe/AGENTS.md`.

## Stil de lucru pentru agenți

1. **Modificați minimal** - păstrați schimbările aliniate cu stilul existent
2. **Componente standalone** - toate componentele noi trebuie să fie standalone
3. **Importuri explicite** - importați doar ce folosiți din PrimeNG și Angular
4. **Type safety** - folosiți TypeScript corespunzător, evitați `any`
5. **Reactive patterns** - preferați Observable și async pipe
6. **Testare** - rulați `npm test` după modificări majore
7. **Prettier** - respectați formatarea (se aplică automat la save în majoritatea IDE-urilor)

## Observații de securitate

- **Token JWT**: stocat în `localStorage` - **nu expuneți token-ul în console.log**
- **Environment files**: `environment.ts` este pentru dev; production folosește variabile de build
- **CORS**: backend-ul permite `http://localhost:4200` - ajustați pentru alte origini

---

**Întrebări sau clarificări?** Consultați și `padelBookingAppBe/AGENTS.md` pentru detalii despre backend sau adăugați instrucțiuni suplimentare aici pe măsură ce proiectul evoluează.

