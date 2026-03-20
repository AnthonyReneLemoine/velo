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
  signInAnonymously,
  onAuthStateChanged
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
  syncStatus: document.getElementById('syncStatus'),
  yearLabel: document.getElementById('yearLabel'),
  docLabel: document.getElementById('docLabel'),
  currentMonthLabel: document.getElementById('currentMonthLabel'),
  countDisplay: document.getElementById('countDisplay'),
  totalValue: document.getElementById('totalValue'),
  statsTitle: document.getElementById('statsTitle'),
  statsGrid: document.getElementById('statsGrid'),
  btnPlus: document.getElementById('btnPlus'),
  btnMinus: document.getElementById('btnMinus'),
  btnReset: document.getElementById('btnReset')
};

let currentState = { ...defaultState };
let persistence = createMemoryPersistence();
let isBusy = false;

bootstrap();

async function bootstrap() {
  bindActions();
  render(currentState);

  const appConfig = window.VELO_APP_CONFIG;
  const firebaseReady = hasFirebaseConfig(appConfig?.firebase);

  if (!firebaseReady) {
    elements.syncStatus.textContent = 'Mode démo local';
    elements.docLabel.textContent = 'config.js incomplet';
    return;
  }

  try {
    const app = initializeApp(appConfig.firebase);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const docRef = doc(
      db,
      appConfig.firestore?.collection || 'veloStats',
      appConfig.firestore?.documentId || 'default'
    );

    elements.docLabel.textContent = `${docRef.path}`;
    persistence = createFirestorePersistence(docRef);
    elements.syncStatus.textContent = 'Connexion Firebase…';

    await signInAnonymously(auth);

    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsubscribe();
          resolve();
        }
      });
    });

    currentState = await persistence.load();
    render(currentState);
    elements.syncStatus.textContent = 'Synchronisé avec Firebase';
  } catch (error) {
    console.error(error);
    elements.syncStatus.textContent = 'Erreur Firebase, bascule locale';
    elements.docLabel.textContent = error.message;
    persistence = createMemoryPersistence();
  }
}

function bindActions() {
  elements.btnPlus.addEventListener('click', () => updateCurrentMonth(1));
  elements.btnMinus.addEventListener('click', () => updateCurrentMonth(-1));
  elements.btnReset.addEventListener('click', () => resetCurrentMonth());
}

async function updateCurrentMonth(delta) {
  if (isBusy) {
    return;
  }

  const monthIndex = new Date().getMonth();
  const nextMonths = [...currentState.months];
  nextMonths[monthIndex] = Math.max(0, nextMonths[monthIndex] + delta);

  await saveState({
    ...currentState,
    months: nextMonths,
    updatedAt: new Date().toISOString()
  });
}

async function resetCurrentMonth() {
  if (isBusy) {
    return;
  }

  const monthIndex = new Date().getMonth();
  const nextMonths = [...currentState.months];
  nextMonths[monthIndex] = 0;

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
    if (!elements.syncStatus.textContent.includes('local')) {
      elements.syncStatus.textContent = 'Synchronisé avec Firebase';
    }
  } catch (error) {
    console.error(error);
    elements.syncStatus.textContent = 'Échec de sauvegarde';
  } finally {
    setBusy(false);
  }
}

function render(state) {
  const today = new Date();
  const monthIndex = today.getMonth();
  const total = state.months.reduce((sum, days) => sum + days, 0);

  elements.yearLabel.textContent = String(state.year);
  elements.statsTitle.textContent = `Répartition ${state.year}`;
  elements.currentMonthLabel.textContent = MONTHS_FR[monthIndex];
  elements.countDisplay.textContent = String(state.months[monthIndex]);
  elements.totalValue.textContent = String(total);

  elements.statsGrid.innerHTML = state.months
    .map((days, index) => `
      <article class="month-card ${index === monthIndex ? 'current' : ''}">
        <p class="month-name">${MONTHS_FR[index]}</p>
        <p class="month-days">${days}</p>
        <p class="month-caption">${days > 1 ? 'jours enregistrés' : 'jour enregistré'}</p>
      </article>
    `)
    .join('');
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  elements.btnPlus.disabled = nextBusy;
  elements.btnMinus.disabled = nextBusy;
  elements.btnReset.disabled = nextBusy;
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
