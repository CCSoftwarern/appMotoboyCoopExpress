export function formatCurrency(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatHora(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDataHoraCard(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const hoje = new Date();
  const isHoje =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();
  if (isHoje) return formatHora(value);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusEntrega(status: string | null | undefined): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'S':
      return { label: 'Solicitado', color: '#2563EB' };
    case 'P':
      return { label: 'Pendente', color: '#F59E0B' };
    case 'F':
      return { label: 'Finalizada', color: '#16A34A' };
    case 'C':
      return { label: 'Cancelada', color: '#DC2626' };
    default:
      return { label: status ?? '—', color: '#9CA3AF' };
  }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}
