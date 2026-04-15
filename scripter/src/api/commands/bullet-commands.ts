import type { TruthBullet } from '../../domain/types.js';
import { generateId } from '../../domain/ids.js';

export interface BulletState {
  truthBullets: TruthBullet[];
}

export function addTruthBullet(state: BulletState, bullet: Omit<TruthBullet, 'bulletId'>): TruthBullet {
  const newBullet: TruthBullet = {
    ...bullet,
    bulletId: generateId('tb'),
  };
  state.truthBullets.push(newBullet);
  return newBullet;
}

export function updateTruthBullet(state: BulletState, id: string, updates: Partial<TruthBullet>): TruthBullet {
  const index = state.truthBullets.findIndex(b => b.bulletId === id);
  if (index === -1) {
    throw new Error(`Truth bullet not found: ${id}`);
  }
  const updated = { ...state.truthBullets[index], ...updates, bulletId: id };
  state.truthBullets[index] = updated;
  return updated;
}

export function deleteTruthBullet(state: BulletState, id: string): void {
  const index = state.truthBullets.findIndex(b => b.bulletId === id);
  if (index === -1) {
    throw new Error(`Truth bullet not found: ${id}`);
  }
  state.truthBullets.splice(index, 1);
}
