export const ZODIAC_EMOJIS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓'
};

export const getZodiacEmoji = (sign: string): string => {
  return ZODIAC_EMOJIS[sign] || '✨';
};

export default ZODIAC_EMOJIS;
