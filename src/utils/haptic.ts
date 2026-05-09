let Haptic: { trigger: (type: string) => void } | null = null;
try {
  const m = require('react-native-haptic-feedback');
  Haptic = m.default || m;
} catch {}

export function hapticLight(): void {
  try { Haptic?.trigger('impactLight'); } catch {}
}

export function hapticSuccess(): void {
  try { Haptic?.trigger('notificationSuccess'); } catch {}
}

export function hapticError(): void {
  try { Haptic?.trigger('notificationError'); } catch {}
}
