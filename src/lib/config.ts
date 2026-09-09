const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const Config = {
  get supabaseUrl(): string {
    if (!url) {
      throw new Error(
        'EXPO_PUBLIC_SUPABASE_URL não definida. Copie .env.example para .env e preencha.',
      );
    }
    return url;
  },
  get supabaseAnonKey(): string {
    if (!anonKey) {
      throw new Error(
        'EXPO_PUBLIC_SUPABASE_ANON_KEY não definida. Copie .env.example para .env e preencha.',
      );
    }
    return anonKey;
  },
};
