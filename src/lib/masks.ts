export function maskCPF(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
    );
  }
  return v.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export function isValidCPF(cpf: string): boolean {
  const v = cpf.replace(/\D/g, "");
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(v[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(v[9]) && calc(10) === parseInt(v[10]);
}