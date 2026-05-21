/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ADJECTIVES = [
  "Rapido",
  "Astuto",
  "Feroz",
  "Silencioso",
  "Valiente",
  "Noble",
  "Sagaz",
  "Luminoso",
  "Sombrio",
  "Audaz",
  "Alegre",
  "Sereno",
  "Tendido",
  "Agil",
  "Veloz"
];

const ANIMALS = [
  "Lobo",
  "Zorro",
  "Oso",
  "Leon",
  "Tigre",
  "Aguila",
  "Halcon",
  "Delfin",
  "Gato",
  "Perro",
  "Panda",
  "Buho",
  "Coyote",
  "Pantera",
  "Jaguar"
];

/**
 * Generates a random base alias from the dictionary (e.g. "Lobo_Astuto")
 */
export function generateBaseAlias(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${animal}_${adjective}`;
}
