import type { IconName } from './components/Icon.svelte';

/**
 * Traduzione dei tipi di allenamento di HealthKit.
 *
 * Nell'export XML compaiono come `HKWorkoutActivityTypeRunning`; qui li
 * mappiamo a nome italiano e a un'icona del set disegnato, con un fallback
 * ragionevole per i tipi che Apple aggiunge a ogni versione di watchOS.
 */

export interface WorkoutTypeDef {
	label: string;
	icon: IconName;
	/** Gli allenamenti a distanza mostrano passo e chilometri; gli altri no. */
	distanceBased?: boolean;
	/**
	 * Scavalca il colore della famiglia. Serve alle discipline che condividono
	 * l'icona con un'altra e le stanno accanto nei filtri: due voci con lo stesso
	 * segno e la stessa tinta si distinguono solo rileggendo l'etichetta, che è
	 * esattamente quello che il colore doveva evitare.
	 */
	tone?: string;
}

export const WORKOUT_TYPES: Record<string, WorkoutTypeDef> = {
	Running: { label: 'Corsa', icon: 'run', distanceBased: true },
	Walking: { label: 'Camminata', icon: 'walk', distanceBased: true },
	Hiking: { label: 'Escursionismo', icon: 'hike', distanceBased: true },
	Cycling: { label: 'Bici', icon: 'bike', distanceBased: true },
	Swimming: { label: 'Nuoto', icon: 'swim', distanceBased: true },
	Elliptical: { label: 'Ellittica', icon: 'generic' },
	Rowing: { label: 'Vogatore', icon: 'row', distanceBased: true },
	StairClimbing: { label: 'Scale', icon: 'stairs' },
	Stairs: { label: 'Scale', icon: 'stairs' },
	HighIntensityIntervalTraining: { label: 'HIIT', icon: 'hiit' },
	FunctionalStrengthTraining: { label: 'Forza funzionale', icon: 'strength', tone: 'var(--color-s6)' },
	TraditionalStrengthTraining: { label: 'Pesi', icon: 'strength' },
	CoreTraining: { label: 'Core', icon: 'yoga' },
	Yoga: { label: 'Yoga', icon: 'yoga' },
	Pilates: { label: 'Pilates', icon: 'yoga' },
	Dance: { label: 'Danza', icon: 'hiit' },
	Boxing: { label: 'Boxe', icon: 'hiit' },
	Kickboxing: { label: 'Kickboxing', icon: 'hiit' },
	MartialArts: { label: 'Arti marziali', icon: 'hiit' },
	Soccer: { label: 'Calcio', icon: 'ball' },
	Basketball: { label: 'Basket', icon: 'ball' },
	Tennis: { label: 'Tennis', icon: 'ball' },
	TableTennis: { label: 'Ping pong', icon: 'ball' },
	Golf: { label: 'Golf', icon: 'ball' },
	Volleyball: { label: 'Pallavolo', icon: 'ball' },
	Climbing: { label: 'Arrampicata', icon: 'mountain' },
	Skiing: { label: 'Sci', icon: 'mountain' },
	DownhillSkiing: { label: 'Sci alpino', icon: 'mountain' },
	CrossCountrySkiing: { label: 'Sci di fondo', icon: 'mountain', distanceBased: true },
	Snowboarding: { label: 'Snowboard', icon: 'mountain' },
	Surfing: { label: 'Surf', icon: 'swim' },
	Padel: { label: 'Padel', icon: 'ball' },
	Pickleball: { label: 'Pickleball', icon: 'ball' },
	Cooldown: { label: 'Defaticamento', icon: 'yoga' },
	Flexibility: { label: 'Mobilità', icon: 'yoga' },
	MindAndBody: { label: 'Mente e corpo', icon: 'yoga' },
	PreparationAndRecovery: { label: 'Recupero', icon: 'yoga' },
	Other: { label: 'Altro', icon: 'generic' }
};

/** `HKWorkoutActivityTypeRunning` → `Running`. */
export function shortWorkoutType(hkType: string): string {
	return hkType.replace(/^HKWorkoutActivityType/, '');
}

/**
 * Il colore di una disciplina.
 *
 * È indicizzato sull'icona e non sul tipo, così i cinquanta tipi di HealthKit
 * non vanno tenuti allineati a mano: le famiglie sono già quelle del set di
 * icone, e un tipo nuovo che eredita l'icona eredita anche la tinta.
 *
 * Gli slot sono otto e le famiglie tredici, quindi qualche coppia condivide il
 * colore. Non è un problema: nell'elenco e nei filtri l'identità è portata
 * sempre anche dall'icona e dall'etichetta, mai dal solo colore. Il colore
 * serve a rendere la fila scorribile, non a sostituire il nome.
 */
const TONE_BY_ICON: Partial<Record<IconName, string>> = {
	run: 'var(--color-s1)',
	bike: 'var(--color-s7)',
	swim: 'var(--color-s2)',
	strength: 'var(--color-s3)',
	hiit: 'var(--color-s8)',
	yoga: 'var(--color-s4)',
	walk: 'var(--color-s5)',
	hike: 'var(--color-s6)',
	row: 'var(--color-s5)',
	ball: 'var(--color-s6)',
	mountain: 'var(--color-s4)',
	stairs: 'var(--color-s3)'
};

export function workoutTone(def: WorkoutTypeDef): string {
	return def.tone ?? TONE_BY_ICON[def.icon] ?? 'var(--color-ink-2)';
}

export function workoutType(type: string): WorkoutTypeDef {
	const key = shortWorkoutType(type);
	if (WORKOUT_TYPES[key]) return WORKOUT_TYPES[key];
	// Tipo sconosciuto (watchOS ne aggiunge di nuovi): spezziamo il CamelCase
	// in parole così a schermo si legge comunque qualcosa di sensato.
	const label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
	return { label: label || 'Allenamento', icon: 'generic' };
}
