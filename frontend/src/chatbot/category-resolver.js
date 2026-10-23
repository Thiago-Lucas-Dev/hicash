import { normalize } from "./normalizer.js";

const hints = {
  Alimentação: [
    "lanche",
    "comida",
    "mercado",
    "restaurante",
    "almoco",
    "jantar",
    "cafe",
  ],
  Transporte: ["gasolina", "uber", "onibus", "combustivel", "estacionamento"],
  Moradia: ["aluguel", "condominio", "luz", "agua", "internet"],
  Saúde: ["farmacia", "medico", "consulta", "remedio"],
  Educação: ["curso", "livro", "faculdade", "escola"],
  Lazer: ["cinema", "show", "viagem", "passeio"],
  Pets: ["racao", "veterinario", "pet"],
  Salário: ["salario", "pagamento", "holerite"],
  Freelance: ["freela", "freelance"],
};
export function resolveCategory(description, type, categories, aliases = []) {
  const text = normalize(description);
  const available = categories.filter((c) => c.type === type);
  for (const alias of aliases)
    if (text.includes(normalize(alias.keyword))) {
      const category = available.find((c) => c.id === alias.category_id);
      if (category) return category;
    }
  for (const category of available)
    if (text.includes(normalize(category.name))) return category;
  for (const [name, words] of Object.entries(hints))
    if (words.some((word) => text.includes(word))) {
      const category = available.find(
        (c) => normalize(c.name) === normalize(name),
      );
      if (category) return category;
    }
  return (
    available.find((c) => normalize(c.name) === "outros") ||
    available[0] ||
    null
  );
}
