/**
 * Zodiac sign calculation utilities
 */

export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

interface ZodiacDateRange {
  sign: ZodiacSign;
  start: { month: number; day: number };
  end: { month: number; day: number };
}

/**
 * Zodiac sign date ranges (inclusive)
 * Note: Capricorn spans year boundary (Dec 22 - Jan 19)
 */
const ZODIAC_SIGNS: ZodiacDateRange[] = [
  { sign: 'Capricorn', start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
  { sign: 'Aquarius', start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
  { sign: 'Pisces', start: { month: 2, day: 19 }, end: { month: 3, day: 20 } },
  { sign: 'Aries', start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
  { sign: 'Taurus', start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
  { sign: 'Gemini', start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
  { sign: 'Cancer', start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
  { sign: 'Leo', start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
  { sign: 'Virgo', start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
  { sign: 'Libra', start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
  { sign: 'Scorpio', start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
  { sign: 'Sagittarius', start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
];

/**
 * Zodiac sign traits
 */
const ZODIAC_TRAITS: Record<ZodiacSign, string[]> = {
  Aries: ['courageous', 'determined', 'confident', 'enthusiastic'],
  Taurus: ['reliable', 'patient', 'practical', 'devoted'],
  Gemini: ['gentle', 'affectionate', 'curious', 'adaptable'],
  Cancer: ['tenacious', 'imaginative', 'loyal', 'emotional'],
  Leo: ['creative', 'passionate', 'generous', 'warm-hearted'],
  Virgo: ['loyal', 'analytical', 'kind', 'hardworking'],
  Libra: ['cooperative', 'diplomatic', 'gracious', 'fair-minded'],
  Scorpio: ['resourceful', 'brave', 'passionate', 'stubborn'],
  Sagittarius: ['generous', 'idealistic', 'great sense of humor'],
  Capricorn: ['responsible', 'disciplined', 'self-control'],
  Aquarius: ['progressive', 'original', 'independent', 'humanitarian'],
  Pisces: ['compassionate', 'artistic', 'intuitive', 'gentle'],
};

/**
 * Calculate sun sign from birth date
 * @param birthDate - Birth date
 * @returns Zodiac sign
 */
export function getSunSign(birthDate: Date): ZodiacSign {
  const month = birthDate.getMonth() + 1; // JavaScript months are 0-indexed
  const day = birthDate.getDate();

  for (const zodiac of ZODIAC_SIGNS) {
    // Handle Capricorn which spans year boundary
    if (zodiac.sign === 'Capricorn') {
      if (
        (month === zodiac.start.month && day >= zodiac.start.day) ||
        (month === zodiac.end.month && day <= zodiac.end.day)
      ) {
        return zodiac.sign;
      }
    } else {
      // Normal case: sign within same year
      if (
        (month === zodiac.start.month && day >= zodiac.start.day) ||
        (month === zodiac.end.month && day <= zodiac.end.day) ||
        (month > zodiac.start.month && month < zodiac.end.month)
      ) {
        return zodiac.sign;
      }
    }
  }

  // Fallback (should never reach here)
  return 'Capricorn';
}

/**
 * Get traits for a sun sign
 * @param sunSign - Zodiac sign
 * @returns Array of traits
 */
export function getSunSignTraits(sunSign: ZodiacSign): string[] {
  return ZODIAC_TRAITS[sunSign] || [];
}

/**
 * Get all zodiac signs
 * @returns Array of all zodiac signs
 */
export function getAllZodiacSigns(): ZodiacSign[] {
  return ZODIAC_SIGNS.map((z) => z.sign);
}
