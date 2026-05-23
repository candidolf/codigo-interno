export function translateAuthError(message?: string | null): string {
  if (!message) return "Erro desconhecido. Tente novamente.";
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("password should be at least")) return "Senha muito curta (mínimo 6 caracteres).";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes.";
  if (m.includes("unauthorized")) return "Sessão expirada. Faça login novamente.";
  return message;
}