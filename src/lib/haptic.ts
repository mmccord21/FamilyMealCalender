type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select';

const PATTERNS: Record<HapticPattern, number[]> = {
  light:   [8],
  medium:  [18],
  heavy:   [35],
  select:  [6],
  success: [8, 60, 12],
  error:   [40, 30, 40],
};

export function haptic(type: HapticPattern = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[type]);
}
