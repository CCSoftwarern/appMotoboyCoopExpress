import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  entregasHoje: '@coop:entregas:hoje',
  entregasHistoricoAll: '@coop:entregas:historico:all',
  entregasHistorico: '@coop:entregas:historico',
  historicoFilters: '@coop:entregas:historico:filters',
  updatedAt: '@coop:entregas:updated_at',
} as const;

function safeParse<T>(v: string | null): T | null {
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export async function saveEntregasHoje(data: any[]) {
  await AsyncStorage.setItem(KEYS.entregasHoje, JSON.stringify(data));
  await AsyncStorage.setItem(KEYS.updatedAt, String(Date.now()));
}

export async function getEntregasHoje<T = any[]>(): Promise<T | null> {
  const v = await AsyncStorage.getItem(KEYS.entregasHoje);
  return safeParse<T>(v);
}

export async function saveEntregasHistorico(data: any[], dt1: string, dt2: string) {
  const key = `${KEYS.entregasHistorico}:${dt1}:${dt2}`;
  await AsyncStorage.setItem(key, JSON.stringify(data));
  await AsyncStorage.setItem(KEYS.updatedAt, String(Date.now()));
  await AsyncStorage.setItem(KEYS.historicoFilters, JSON.stringify({ dt1, dt2 }));
  // merge em mapa unico por id (para achar entrega offline de qualquer periodo)
  const rawAll = await AsyncStorage.getItem(KEYS.entregasHistoricoAll);
  const all: Record<string, any> = safeParse<Record<string, any>>(rawAll) ?? {};
  for (const e of data) {
    if (e && e.id != null) all[String(e.id)] = e;
  }
  await AsyncStorage.setItem(KEYS.entregasHistoricoAll, JSON.stringify(all));
}

export async function getEntregasHistorico<T = any[]>(dt1: string, dt2: string): Promise<T | null> {
  const key = `${KEYS.entregasHistorico}:${dt1}:${dt2}`;
  const v = await AsyncStorage.getItem(key);
  return safeParse<T>(v);
}

export async function getUltimoFiltro() {
  const v = await AsyncStorage.getItem(KEYS.historicoFilters);
  return safeParse<{ dt1: string; dt2: string }>(v);
}

export async function getEntregaOffline(id: number): Promise<any | null> {
  try {
    const rawHoje = await AsyncStorage.getItem(KEYS.entregasHoje);
    const hoje = safeParse<any[]>(rawHoje) ?? [];
    const inHoje = hoje.find((e) => e && e.id === id);
    if (inHoje) return inHoje;
    const rawAll = await AsyncStorage.getItem(KEYS.entregasHistoricoAll);
    const all = safeParse<Record<string, any>>(rawAll) ?? {};
    return all[String(id)] ?? null;
  } catch {
    return null;
  }
}
