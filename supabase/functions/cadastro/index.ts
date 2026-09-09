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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Método não permitido.' }, 405, corsHeaders);
    }

    const { nome, celular, enail, email, senha, codigo_pix } = await req.json();

    const nomeNorm = String(nome ?? '').trim();
    const celularNorm = String(celular ?? '').trim();
    // aceita tanto enail quanto email (typo legado)
    const emailRaw = (enail ?? email ?? '').toString().trim().toLowerCase();
    const password = String(senha ?? '');
    const pixNorm = codigo_pix != null ? String(codigo_pix).trim() : null;

    if (!nomeNorm) {
      return json({ error: 'Informe seu nome completo.' }, 400, corsHeaders);
    }
    if (!celularNorm && !emailRaw) {
      return json({ error: 'Informe celular ou e-mail.' }, 400, corsHeaders);
    }
    if (!password || password.length < 6) {
      return json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400, corsHeaders);
    }
    if (emailRaw && !/^\S+@\S+\.\S+$/.test(emailRaw)) {
      return json({ error: 'E-mail inválido.' }, 400, corsHeaders);
    }
    // validação básica de celular: pelo menos 10 dígitos
    if (celularNorm) {
      const digits = celularNorm.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        return json({ error: 'Celular inválido. Use DDD + número.' }, 400, corsHeaders);
      }
    }

    // verifica duplicidade (celular exato ou email case-insensitive)
    // faz duas queries separadas para evitar injeção no .or
    if (celularNorm) {
      const { data: dupCel } = await supabase
        .from('motoboys')
        .select('id')
        .eq('celular', celularNorm)
        .limit(1);
      if (dupCel && dupCel.length > 0) {
        return json({ error: 'Celular já cadastrado.' }, 409, corsHeaders);
      }
      // também verifica variação só dígitos para evitar duplicata (ex: (84) 99171-2945 vs 84991712945)
      const digits = celularNorm.replace(/\D/g, '');
      const { data: allWithCel } = await supabase
        .from('motoboys')
        .select('id,celular')
        .limit(1000);
      if (allWithCel) {
        const exists = allWithCel.some((r: { celular: string | null }) => r.celular && r.celular.replace(/\D/g, '') === digits);
        if (exists) {
          return json({ error: 'Celular já cadastrado.' }, 409, corsHeaders);
        }
      }
    }

    if (emailRaw) {
      const { data: dupEmail } = await supabase
        .from('motoboys')
        .select('id')
        .ilike('enail', emailRaw)
        .limit(1);
      if (dupEmail && dupEmail.length > 0) {
        return json({ error: 'E-mail já cadastrado.' }, 409, corsHeaders);
      }
    }

    const senha_hash = await bcrypt.hash(password, 10);

    const insertPayload: Record<string, unknown> = {
      nome: nomeNorm,
      celular: celularNorm || null,
      enail: emailRaw || null,
      senha_hash,
      // mantém coluna legada senha vazia/nula para não confundir migration
      senha: null,
      ativo: true,
      codigo_pix: pixNorm || null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('motoboys')
      .insert(insertPayload)
      .select('id, nome, celular, enail, ativo, codigo_pix, foto')
      .single();

    if (insertErr) {
      console.error('Erro ao inserir motoboy:', insertErr);
      return json({ error: 'Não foi possível criar a conta. Tente novamente.' }, 500, corsHeaders);
    }

    const m = inserted as {
      id: number;
      nome: string;
      celular: string | null;
      enail: string | null;
      ativo: boolean;
      codigo_pix: string | null;
      foto: string | null;
    };

    // gera token para login automático (mesmo formato do login)
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
      201,
      corsHeaders,
    );
  } catch (e) {
    console.error('Erro no cadastro:', e);
    return json({ error: 'Falha interna. Tente novamente.' }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
