import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
];

const defaultState = createEmptyState(new Date().getFullYear());
const elements = {
  totalValue: document.getElementById('totalValue'),
  statsTitle: document.getElementById('statsTitle'),
  statsGrid: document.getElementById('statsGrid'),
  btnLogin: document.getElementById('btnLogin'),
  btnLogout: document.getElementById('btnLogout'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail')
};

let currentState = { ...defaultState };
let persistence = createMemoryPersistence();
let isBusy = false;
let auth = null;
let provider = null;
let currentUser = null;

bootstrap();

async function bootstrap() {
  bindActions();
  render(currentState);
  setAuthenticatedUser(null);

  const appConfig = window.VELO_APP_CONFIG;
  const firebaseReady = hasFirebaseConfig(appConfig?.firebase);

  if (!firebaseReady) {
    setActionAvailability();
    return;
  }

  try {
    const app = initializeApp(appConfig.firebase);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    const db = getFirestore(app);
    const collectionName = appConfig.firestore?.collection || 'veloStats';
    const sharedDocumentId = appConfig.firestore?.documentId || 'default';

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      setAuthenticatedUser(user);
      setActionAvailability();

      if (!user) {
        currentState = { ...defaultState };
        render(currentState);
        return;
      }

      try {
        const docRef = doc(
          db,
          collectionName,
          appConfig.firestore?.perUser === false ? sharedDocumentId : user.uid
        );

        persistence = createFirestorePersistence(docRef);
        currentState = await persistence.load();
        render(currentState);
      } catch (error) {
        console.error(error);
        currentState = { ...defaultState };
        render(currentState);
        persistence = createMemoryPersistence();
      }
    });
  } catch (error) {
    console.error(error);
    persistence = createMemoryPersistence();
    setActionAvailability();
  }
}

function bindActions() {
  elements.btnLogin.addEventListener('click', () => loginWithGoogle());
  elements.btnLogout.addEventListener('click', () => logout());
  elements.statsGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-month]');
    if (!button) {
      return;
    }

    const monthIndex = Number(button.dataset.month);
    const delta = Number(button.dataset.action);
    updateMonth(monthIndex, delta);
  });
}

async function loginWithGoogle() {
  if (!auth || !provider || isBusy) {
    return;
  }

  setBusy(true);

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
  } finally {
    setBusy(false);
    setActionAvailability();
  }
}

async function logout() {
  if (!auth || isBusy || !currentUser) {
    return;
  }

  setBusy(true);

  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  } finally {
    setBusy(false);
    setActionAvailability();
  }
}

async function updateMonth(monthIndex, delta) {
  if (isBusy || !canEdit() || Number.isNaN(monthIndex) || Number.isNaN(delta)) {
    return;
  }

  const nextMonths = [...currentState.months];
  nextMonths[monthIndex] = Math.max(0, nextMonths[monthIndex] + delta);

  await saveState({
    ...currentState,
    months: nextMonths,
    updatedAt: new Date().toISOString()
  });
}

async function saveState(nextState) {
  setBusy(true);

  try {
    currentState = await persistence.save(normalizeState(nextState));
    render(currentState);
  } catch (error) {
    console.error(error);
  } finally {
    setBusy(false);
    setActionAvailability();
  }
}

function render(state) {
  const today = new Date();
  const currentMonthIndex = today.getMonth();
  const total = state.months.reduce((sum, days) => sum + days, 0);

  elements.statsTitle.textContent = `Répartition ${state.year}`;
  elements.totalValue.textContent = String(total);

  elements.statsGrid.innerHTML = state.months
    .map((days, index) => {
      const disabled = !canEdit() || isBusy;
      return `
        <article class="month-card ${index === currentMonthIndex ? 'current' : ''}">
          <div class="month-card-top">
            <p class="month-name">${MONTHS_FR[index]}</p>
            <p class="month-caption">${index === currentMonthIndex ? 'Mois en cours' : 'Mois terminé'}</p>
          </div>
          <p class="month-days">${days}</p>
          <div class="month-actions">
            <button class="month-btn" type="button" data-month="${index}" data-action="-1" ${disabled ? 'disabled' : ''}>−</button>
            <button class="month-btn month-btn--plus" type="button" data-month="${index}" data-action="1" ${disabled ? 'disabled' : ''}>+</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  setActionAvailability();
}

function setActionAvailability() {
  elements.btnLogin.disabled = !auth || Boolean(currentUser) || isBusy;
  elements.btnLogout.disabled = !auth || !currentUser || isBusy;
  render(currentState);
}

function canEdit() {
  return Boolean(currentUser) || !auth;
}

function setAuthenticatedUser(user) {
  if (!user) {
    elements.userAvatar.textContent = '?';
    elements.userName.textContent = 'Non connecté';
    elements.userEmail.textContent = 'Connectez-vous pour synchroniser vos données.';
    return;
  }

  elements.userAvatar.textContent = getInitials(user.displayName || user.email || 'G');
  elements.userName.textContent = user.displayName || 'Compte Google';
  elements.userEmail.textContent = user.email || 'Adresse e-mail indisponible';
}

function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function hasFirebaseConfig(firebaseConfig) {
  if (!firebaseConfig) {
    return false;
  }

  return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
    const value = firebaseConfig[key];
    return value && value !== 'À_REMPLIR';
  });
}

function normalizeState(state) {
  const normalized = createEmptyState(state.year || new Date().getFullYear());
  normalized.months = Array.isArray(state.months)
    ? normalized.months.map((_, index) => Math.max(0, Number(state.months[index] || 0)))
    : normalized.months;
  normalized.updatedAt = state.updatedAt || null;
  return normalized;
}

function createEmptyState(year) {
  return {
    year,
    months: Array.from({ length: 12 }, () => 0),
    updatedAt: null
  };
}

function createMemoryPersistence() {
  return {
    async load() {
      return currentState;
    },
    async save(nextState) {
      currentState = normalizeState(nextState);
      return currentState;
    }
  };
}

function createFirestorePersistence(docRef) {
  return {
    async load() {
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        const initial = normalizeState(defaultState);
        await setDoc(docRef, {
          ...initial,
          updatedAt: serverTimestamp()
        });
        return initial;
      }

      return normalizeState(snapshot.data());
    },
    async save(nextState) {
      const normalized = normalizeState(nextState);
      await updateDoc(docRef, {
        year: normalized.year,
        months: normalized.months,
        updatedAt: serverTimestamp()
      });
      return normalized;
    }
  };
}
