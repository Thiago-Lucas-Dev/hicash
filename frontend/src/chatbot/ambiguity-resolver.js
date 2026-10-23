export function ambiguity(result) {
  if (result.ambiguousDate) return "Qual é a data de cada lançamento?";
  if (result.items.some((item) => !item?.amount))
    return "Qual valor você quer registrar?";
  if (result.items.some((item) => !item.description))
    return "Qual é a descrição do lançamento?";
  if (result.items.some((item) => !item.reference_date))
    return "Não entendi a data. Pode informar dia e mês?";
  return null;
}
