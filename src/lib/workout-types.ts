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
	FunctionalStrengthTraining: { label: 'Forza funzionale', icon: 'strength' },
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

export function workoutType(type: string): WorkoutTypeDef {
	const key = shortWorkoutType(type);
	if (WORKOUT_TYPES[key]) return WORKOUT_TYPES[key];
	// Tipo sconosciuto (watchOS ne aggiunge di nuovi): spezziamo il CamelCase
	// in parole così a schermo si legge comunque qualcosa di sensato.
	const label = key.replace(/([a-z])([A-Z])/g, '$1 $2');
	return { label: label || 'Allenamento', icon: 'generic' };
}
