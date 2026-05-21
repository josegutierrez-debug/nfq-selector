/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";

export class RandomEngine {
  /**
   * Shuffles an array of strings (e.g., participant IDs) using an improved,
   * cryptographically secure Fisher-Yates algorithm with high-entropy source.
   * This returns a new array, retaining immutability.
   */
  public static shuffle(items: string[]): string[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      // Use crypto.randomInt to fetch an unbiased and cryptographically safe index
      const j = crypto.randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
