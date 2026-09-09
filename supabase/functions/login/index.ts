import { createClient } from 'npm:@supabase/supabase-js@^2.45.4';
import bcrypt from 'npm:bcryptjs@^2.4.3';
import { SignJWT } from 'npm:jose@^5.9.6';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const jwtSecret = new TextEncoder().encode(Deno.env.get('JWT_SECRET')!);

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MotoboyRow {
  id: number;
  nome: string;
  celular: string | null;
  enail: string | null;
  senha: string | null;
  senha_hash: string | null;
  ativo: boolean | null;
  codigo_pix: string | null;
  foto: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Método não permitido.' }, 405, corsHeaders);
    }

    const { login, senha } = await req.json();

    if (!login || !senha) {
      return json({ error: 'Informe celular/e-mail e senha.' }, 400, corsHeaders);
    }

    const identRaw = String(login).trim();
    const identLower = identRaw.toLowerCase();
    const identDigits = identRaw.replace(/\D/g, '');
    const password = String(senha);

    // Busca por e-mail (case-insensitive) ou celular (exato + dígitos normalizados)
    // Primeiro tenta busca direta (rápida)
    let rows: MotoboyRow[] | null = null;
    let error: unknown = null;

    // Monta filtro OR: enail ilike + celular eq raw
    const orFilters: string[] = [`enail.ilike.${identLower}`];
    if (identRaw) orFilters.push(`celular.eq.${identRaw}`);
    // Se o identificador parece e-mail, não busca por dígitos; se parece telefone, adiciona ilike nos dígitos
    if (identDigits.length >= 10) {
      orFilters.push(`celular.ilike.%${identDigits}%`);
    }

    const { data: rows1, error: err1 } = await supabase
      .from('motoboys')
      .select('id, nome, celular, enail, senha, senha_hash, ativo, codigo_pix, foto')
      .or(orFilters.join(','))
      .limit(10);

    if (err1) {
      console.error('Erro ao buscar motoboy (or):', err1);
      return json({ error: 'Falha interna. Tente novamente.' }, 500, corsHeaders);
    }
    rows = rows1 as MotoboyRow[] | null;

    // Filtragem precisa em JS: e-mail exato (lower) ou celular com mesmos dígitos
    let m: MotoboyRow | null = null;
    if (rows && rows.length > 0) {
      m = rows.find((r) => {
        if (r.enail && r.enail.toLowerCase() === identLower) return true;
        if (r.celular && identDigits.length >= 10) {
          const celDigits = r.celular.replace(/\D/g, '');
          if (celDigits === identDigits) return true;
        }
        if (r.celular && r.celular.trim() === identRaw) return true;
        return false;
      }) ?? (rows[0] as MotoboyRow);
      // Se encontrou múltiplos mas nenhum bateu exatamente nos dígitos, ainda tenta o primeiro (caso formato sem DDD)
      // Se ident é e-mail puro, o find acima já garante match exato
      if (identLower.includes('@') && m.enail?.toLowerCase() !== identLower) {
        m = null;
      }
    }

    // Fallback: se não achou e tem dígitos, busca mais amplo (scan limitado) — evita falso negativo por formatação antiga
    if (!m && identDigits.length >= 10) {
      const { data: rows2 } = await supabase
        .from('motoboys')
        .select('id, nome, celular, enail, senha, senha_hash, ativo, codigo_pix, foto')
        .limit(100);
      if (rows2) {
        m = (rows2 as MotoboyRow[]).find((r) => r.celular && r.celular.replace(/\D/g, '') === identDigits) ?? null;
      }
    }

    if (!m) {
      return json({ error: 'Celular/e-mail ou senha inválidos.' }, 401, corsHeaders);
    }

    // ativo null = trata como ativo (retrocompatibilidade com inserts antigos que deixaram null)
    if (m.ativo === false) {
      return json({ error: 'Cadastro inativo. Fale com o despacho.' }, 401, corsHeaders);
    }

    // Validação de senha: tenta bcrypt, fallback para senha legada em texto puro
    let valid = false;
    if (m.senha_hash && m.senha_hash.startsWith('$2')) {
      valid = await bcrypt.compare(password, m.senha_hash);
      if (!valid && m.senha && m.senha === password) {
        // Senha legada coincidiu: migra automaticamente para hash
        const newHash = await bcrypt.hash(password, 10);
        await supabase.from('motoboys').update({ senha_hash: newHash, senha: null }).eq('id', m.id);
        valid = true;
      }
    } else if (m.senha) {
      // Sem hash, compara texto puro (migração 0001_base ainda não rodou para este registro)
      valid = m.senha === password;
      if (valid) {
        const newHash = await bcrypt.hash(password, 10);
        await supabase.from('motoboys').update({ senha_hash: newHash, senha: null }).eq('id', m.id);
      }
    } else {
      return json({ error: 'Celular/e-mail ou senha inválidos.' }, 401, corsHeaders);
    }

    if (!valid) {
      return json({ error: 'Celular/e-mail ou senha inválidos.' }, 401, corsHeaders);
    }

    const token = await new SignJWT({ role: 'authenticated', aud: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(m.id))
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(jwtSecret);

    return json(
      {
        access_token: token,
        motoboy: {
          id: m.id,
          nome: m.nome,
          celular: m.celular,
          email: m.enail,
          codigo_pix: m.codigo_pix,
          foto: m.foto,
          ativo: m.ativo,
        },
      },
      200,
      corsHeaders,
    );
  } catch (e) {
    console.error('Erro no login:', e);
    return json({ error: 'Falha interna. Tente novamente.' }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
