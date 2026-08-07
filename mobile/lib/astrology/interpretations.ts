/**
 * Static interpretation lookup tables for birth chart readings.
 * Planet-in-sign, aspect, and life theme interpretations.
 */

const PLANET_IN_SIGN: Record<string, Record<string, string>> = {
  sun: {
    Aries: "Your Sun in Aries gives you a pioneering spirit and natural leadership. You approach life with courage and directness, always ready to blaze new trails.",
    Taurus: "Your Sun in Taurus grounds you with steadfast determination and an appreciation for beauty. You build things that last and find strength in consistency.",
    Gemini: "Your Sun in Gemini makes you endlessly curious and versatile. You're a natural communicator who thrives on intellectual stimulation and variety.",
    Cancer: "Your Sun in Cancer gives you deep emotional intelligence and nurturing instincts. You create safety for others while drawing strength from your roots.",
    Leo: "Your Sun in Leo fills you with creative fire and magnetic warmth. You're meant to shine and inspire others through your generous spirit.",
    Virgo: "Your Sun in Virgo gives you an analytical mind and desire for perfection. You serve others through precision and practical wisdom.",
    Libra: "Your Sun in Libra makes you a natural diplomat and aesthete. You seek harmony in all things and bring beauty to your surroundings.",
    Scorpio: "Your Sun in Scorpio gives you extraordinary depth and transformative power. You see through surfaces to the truth beneath.",
    Sagittarius: "Your Sun in Sagittarius fills you with optimism and philosophical curiosity. You're an eternal explorer seeking meaning and adventure.",
    Capricorn: "Your Sun in Capricorn drives you toward achievement and mastery. You understand that lasting success requires patience and discipline.",
    Aquarius: "Your Sun in Aquarius makes you a visionary and humanitarian. You think beyond convention and champion progress for all.",
    Pisces: "Your Sun in Pisces gives you profound intuition and creative sensitivity. You feel the world deeply and express universal truths through imagination.",
  },
  moon: {
    Aries: "Your Moon in Aries means your emotions are quick and fiery. You process feelings through action and need independence to feel emotionally secure.",
    Taurus: "Your Moon in Taurus gives you deep emotional stability. You need comfort, beauty, and sensory pleasures to feel nurtured and at peace.",
    Gemini: "Your Moon in Gemini processes emotions through conversation and analysis. You feel most secure when you can talk through what's on your mind.",
    Cancer: "Your Moon in Cancer (its home sign) makes your emotional life exceptionally rich. You nurture instinctively and feel most secure with loved ones.",
    Leo: "Your Moon in Leo needs warmth, recognition, and creative expression to feel emotionally fulfilled. Your heart is generous and dramatic.",
    Virgo: "Your Moon in Virgo processes emotions methodically. You feel most secure when your environment is organized and you're being of practical service.",
    Libra: "Your Moon in Libra craves harmony in relationships. You process emotions through partnership and feel most secure in balanced, beautiful environments.",
    Scorpio: "Your Moon in Scorpio gives you intensely deep emotions. You feel everything profoundly and have powerful instincts about others' hidden truths.",
    Sagittarius: "Your Moon in Sagittarius needs freedom and adventure to feel emotionally alive. You process feelings through philosophy, travel, and big-picture thinking.",
    Capricorn: "Your Moon in Capricorn handles emotions with maturity and reserve. You feel most secure when you have structure, goals, and accomplishments.",
    Aquarius: "Your Moon in Aquarius processes emotions intellectually. You need mental freedom and feel most secure when connected to community and ideals.",
    Pisces: "Your Moon in Pisces gives you boundless empathy and intuition. You absorb others' emotions easily and need creative or spiritual outlets.",
  },
  mercury: {
    Aries: "Mercury in Aries gives you a quick, decisive communication style. You think fast, speak directly, and are excellent at initiating ideas.",
    Taurus: "Mercury in Taurus means you think carefully and deliberately. Your ideas are practical and well-grounded, and your voice is calming to others.",
    Gemini: "Mercury in Gemini (its home sign) makes you exceptionally articulate and mentally agile. You excel at learning, teaching, and connecting ideas.",
    Cancer: "Mercury in Cancer means you think with your heart. Your communication is empathetic and intuitive, and memory is tied to emotion.",
    Leo: "Mercury in Leo gives your thoughts creative flair and dramatic expression. You communicate with confidence and captivate audiences naturally.",
    Virgo: "Mercury in Virgo (its home sign) gives you exceptional analytical ability. Your thinking is precise, detail-oriented, and highly practical.",
    Libra: "Mercury in Libra makes you a natural mediator. You see all sides of every issue and communicate with diplomacy and grace.",
    Scorpio: "Mercury in Scorpio gives you penetrating mental focus. You think deeply, research obsessively, and communicate with powerful conviction.",
    Sagittarius: "Mercury in Sagittarius thinks in big concepts and grand visions. You communicate with enthusiasm and often inspire others with your ideas.",
    Capricorn: "Mercury in Capricorn gives you structured, strategic thinking. You communicate with authority and focus on practical outcomes.",
    Aquarius: "Mercury in Aquarius produces original, innovative thinking. Your ideas are ahead of their time and you communicate with intellectual independence.",
    Pisces: "Mercury in Pisces thinks in images and feelings rather than logic. You communicate poetically and have a gift for understanding unspoken truths.",
  },
  venus: {
    Aries: "Venus in Aries loves with passion and spontaneity. You're attracted to boldness and directness in romance, and you pursue what you want fearlessly.",
    Taurus: "Venus in Taurus (its home sign) loves deeply and sensuously. You value loyalty, physical affection, and creating beautiful, comfortable spaces.",
    Gemini: "Venus in Gemini needs intellectual stimulation in love. You're attracted to wit, conversation, and variety in your relationships.",
    Cancer: "Venus in Cancer loves nurturingly and protectively. You create emotional security in relationships and value deep family bonds.",
    Leo: "Venus in Leo loves dramatically and generously. You're attracted to confidence and creativity, and you express affection with grand gestures.",
    Virgo: "Venus in Virgo shows love through acts of service and attention to detail. You express care practically and value reliability in partners.",
    Libra: "Venus in Libra (its home sign) is a natural romantic. You value partnership, beauty, and harmony, and you create elegance in all relationships.",
    Scorpio: "Venus in Scorpio loves with intense depth and loyalty. You crave emotional and physical intimacy and form transformative bonds.",
    Sagittarius: "Venus in Sagittarius loves adventurously and freely. You're attracted to diverse perspectives and need independence within partnership.",
    Capricorn: "Venus in Capricorn approaches love with seriousness and commitment. You value stability and are attracted to ambition and maturity.",
    Aquarius: "Venus in Aquarius loves unconventionally. You're attracted to unique individuals and value friendship and intellectual connection in romance.",
    Pisces: "Venus in Pisces (exalted) loves unconditionally and romantically. You're deeply compassionate in love and see the divine in your partners.",
  },
  mars: {
    Aries: "Mars in Aries (its home sign) gives you tremendous drive and courage. You take initiative boldly and compete with natural athleticism.",
    Taurus: "Mars in Taurus gives you steady, unstoppable determination. You pursue goals with patient persistence and have impressive physical endurance.",
    Gemini: "Mars in Gemini channels energy through intellect and communication. You fight with words and pursue multiple interests simultaneously.",
    Cancer: "Mars in Cancer channels energy through emotional motivation. You fight fiercely to protect loved ones and create security.",
    Leo: "Mars in Leo drives you with creative ambition and dramatic flair. You pursue goals with confidence and inspire others with your energy.",
    Virgo: "Mars in Virgo channels energy with precision and efficiency. You work methodically toward goals and excel at detailed, focused effort.",
    Libra: "Mars in Libra channels energy through partnership and diplomacy. You're motivated by justice and prefer strategic action over confrontation.",
    Scorpio: "Mars in Scorpio (its traditional home) gives you formidable willpower. Your drive is intense, strategic, and deeply transformative.",
    Sagittarius: "Mars in Sagittarius channels energy into adventure and ideals. You pursue goals with enthusiasm and are motivated by meaning and freedom.",
    Capricorn: "Mars in Capricorn (exalted) gives you disciplined, ambitious drive. You pursue long-term goals with strategic patience and professional focus.",
    Aquarius: "Mars in Aquarius channels energy toward innovation and causes. You're motivated by progress and take action for the collective good.",
    Pisces: "Mars in Pisces channels energy through intuition and compassion. You're motivated by creative visions and spiritual ideals.",
  },
  jupiter: {
    Aries: "Jupiter in Aries expands your courage and pioneering spirit. Luck comes through bold initiative and being first to act.",
    Taurus: "Jupiter in Taurus expands your material abundance and appreciation for life's pleasures. Growth comes through patient investment.",
    Gemini: "Jupiter in Gemini expands your intellectual horizons. Growth and luck come through communication, learning, and diverse connections.",
    Cancer: "Jupiter in Cancer (exalted) expands your nurturing gifts. Abundance flows through family, home, and emotional generosity.",
    Leo: "Jupiter in Leo expands your creative confidence and generosity. Luck comes through self-expression and inspiring leadership.",
    Virgo: "Jupiter in Virgo expands your capacity for service and analysis. Growth comes through practical skills and attention to wellness.",
    Libra: "Jupiter in Libra expands your diplomatic gifts and partnerships. Luck comes through collaboration and creating harmony.",
    Scorpio: "Jupiter in Scorpio expands your transformative power. Growth comes through deep investigation and psychological insight.",
    Sagittarius: "Jupiter in Sagittarius (its home sign) amplifies your wisdom and adventurous spirit. You're naturally lucky and philosophically gifted.",
    Capricorn: "Jupiter in Capricorn expands your ambition and organizational ability. Growth comes through discipline and long-term planning.",
    Aquarius: "Jupiter in Aquarius expands your humanitarian vision. Luck comes through innovation, community, and progressive thinking.",
    Pisces: "Jupiter in Pisces (its traditional home) expands your spiritual gifts and compassion. Growth comes through faith, creativity, and empathy.",
  },
  saturn: {
    Aries: "Saturn in Aries teaches you to develop patience with your pioneering nature. Your life lessons involve balancing initiative with discipline.",
    Taurus: "Saturn in Taurus teaches lessons about material security and self-worth. You build lasting foundations through persistent, careful effort.",
    Gemini: "Saturn in Gemini brings discipline to your communication and thinking. You learn to focus your versatile mind on meaningful goals.",
    Cancer: "Saturn in Cancer teaches emotional maturity and family responsibility. Your growth comes through learning to balance nurturing with boundaries.",
    Leo: "Saturn in Leo develops humility alongside your creative gifts. You learn to lead with responsibility and express yourself authentically.",
    Virgo: "Saturn in Virgo demands excellence in your work and service. You learn that true mastery comes from dedicated, humble practice.",
    Libra: "Saturn in Libra (exalted) develops your sense of justice and commitment. You learn important lessons through partnerships and fairness.",
    Scorpio: "Saturn in Scorpio demands emotional honesty and transformation. Your deepest growth comes from facing fears and embracing change.",
    Sagittarius: "Saturn in Sagittarius develops disciplined wisdom. You learn to ground your idealism in practical philosophy and focused study.",
    Capricorn: "Saturn in Capricorn (its home sign) gives you exceptional ambition and structure. You understand that meaningful achievement requires time and effort.",
    Aquarius: "Saturn in Aquarius (its traditional home) structures your humanitarian vision. You learn to turn progressive ideas into lasting social change.",
    Pisces: "Saturn in Pisces grounds your spiritual and creative gifts. You learn to give form to your dreams through disciplined imagination.",
  },
  uranus: {
    Aries: "Uranus in Aries brings revolutionary independence. Your generation pioneers bold new approaches to identity and personal freedom.",
    Taurus: "Uranus in Taurus revolutionizes values and finances. Your generation transforms how the world relates to money, nature, and material security.",
    Gemini: "Uranus in Gemini revolutionizes communication and technology. Your generation brings breakthrough innovations in how people share information.",
    Cancer: "Uranus in Cancer transforms family structures and emotional expression. Your generation redefines home, belonging, and nurturing.",
    Leo: "Uranus in Leo revolutionizes creative expression and leadership. Your generation brings radical changes to art, entertainment, and self-expression.",
    Virgo: "Uranus in Virgo transforms work, health, and service. Your generation innovates in healthcare, technology, and practical systems.",
    Libra: "Uranus in Libra revolutionizes relationships and justice. Your generation redefines partnership, marriage, and social equality.",
    Scorpio: "Uranus in Scorpio transforms power structures and psychology. Your generation brings radical changes to shared resources and healing.",
    Sagittarius: "Uranus in Sagittarius revolutionizes education and belief systems. Your generation expands consciousness through new philosophies and global connection.",
    Capricorn: "Uranus in Capricorn transforms institutions and authority. Your generation restructures government, business, and traditional power dynamics.",
    Aquarius: "Uranus in Aquarius (its home sign) amplifies technological and social revolution. Your generation builds the future of human connection and innovation.",
    Pisces: "Uranus in Pisces transforms spirituality and collective consciousness. Your generation awakens new forms of compassion, art, and transcendence.",
  },
  neptune: {
    Aries: "Neptune in Aries dissolves boundaries around identity. Your generation explores new forms of selfhood and spiritual independence.",
    Taurus: "Neptune in Taurus dissolves material certainties. Your generation reimagines the relationship between spirituality and the physical world.",
    Gemini: "Neptune in Gemini blurs the line between fact and imagination in communication. Your generation transforms storytelling and information.",
    Cancer: "Neptune in Cancer idealizes home and family. Your generation has deep nostalgia and works to heal collective emotional wounds.",
    Leo: "Neptune in Leo glamorizes creativity and self-expression. Your generation produces powerful artists and romanticizes leadership.",
    Virgo: "Neptune in Virgo brings idealism to service and health. Your generation seeks perfect systems and holistic approaches to wellness.",
    Libra: "Neptune in Libra idealizes love and partnership. Your generation dreams of perfect harmony and transforms relationship ideals.",
    Scorpio: "Neptune in Scorpio deepens collective transformation. Your generation explores hidden truths and brings spiritual depth to psychology.",
    Sagittarius: "Neptune in Sagittarius expands spiritual horizons. Your generation seeks meaning through diverse faiths, travel, and universal truth.",
    Capricorn: "Neptune in Capricorn dissolves rigid structures. Your generation reimagines institutions and blends idealism with practical ambition.",
    Aquarius: "Neptune in Aquarius dissolves social boundaries. Your generation envisions universal connection and brings spiritual awareness to technology.",
    Pisces: "Neptune in Pisces (its home sign) amplifies collective empathy and creativity. Your generation experiences profound spiritual awakening and artistic sensitivity.",
  },
  pluto: {
    Aries: "Pluto in Aries transforms the concept of individuality and personal power. Your generation rebuilds identity from the ground up.",
    Taurus: "Pluto in Taurus transforms material values and environmental consciousness. Your generation confronts fundamental questions about resources and sustainability.",
    Gemini: "Pluto in Gemini transforms communication and knowledge systems. Your generation rebuilds how information is shared and understood.",
    Cancer: "Pluto in Cancer transforms family and national identity. Your generation experienced profound shifts in home, security, and belonging.",
    Leo: "Pluto in Leo transforms creative expression and leadership. Your generation brought powerful changes to entertainment, authority, and self-expression.",
    Virgo: "Pluto in Virgo transforms work, health, and service systems. Your generation revolutionized healthcare, technology, and practical methodology.",
    Libra: "Pluto in Libra transforms relationships and justice. Your generation fundamentally changed marriage, partnership, and social equality.",
    Scorpio: "Pluto in Scorpio (its home sign) brings the deepest transformation. Your generation confronts taboos, hidden power, and psychological truth.",
    Sagittarius: "Pluto in Sagittarius transforms beliefs and global consciousness. Your generation challenges religions, philosophies, and cultural assumptions.",
    Capricorn: "Pluto in Capricorn transforms power structures. Your generation is witnessing and driving the rebuilding of governments, corporations, and institutions.",
    Aquarius: "Pluto in Aquarius transforms society and technology. Your generation will fundamentally reshape community, innovation, and human potential.",
    Pisces: "Pluto in Pisces transforms spirituality and collective consciousness. Your generation will dissolve and rebuild humanity's deepest beliefs and creative expressions.",
  },
};

const BIG_THREE_SUN: Record<string, string> = {
  Aries: "a fiery pioneer who leads with courage",
  Taurus: "a grounded builder who values stability",
  Gemini: "a versatile communicator who thrives on variety",
  Cancer: "an intuitive nurturer who creates emotional safety",
  Leo: "a radiant leader who inspires through generosity",
  Virgo: "a devoted analyst who serves with precision",
  Libra: "a graceful diplomat who seeks harmony",
  Scorpio: "an intense transformer who sees hidden truths",
  Sagittarius: "a bold explorer who seeks meaning",
  Capricorn: "a determined achiever who builds lasting legacies",
  Aquarius: "a visionary innovator who champions progress",
  Pisces: "a compassionate dreamer who channels universal wisdom",
};

const BIG_THREE_MOON: Record<string, string> = {
  Aries: "Your emotional world is passionate and action-oriented — you process feelings quickly and need independence.",
  Taurus: "Your emotional foundation is steady and sensual — you need beauty, comfort, and physical presence to feel secure.",
  Gemini: "Your inner world is curious and communicative — you process emotions through dialogue and mental stimulation.",
  Cancer: "Your emotional landscape is deeply nurturing — you feel everything intensely and create safety for those you love.",
  Leo: "Your heart is warm and expressive — you need recognition, creativity, and drama in your emotional life.",
  Virgo: "Your inner world is orderly and service-minded — you process feelings through analysis and practical care.",
  Libra: "Your emotional nature seeks balance and partnership — you process feelings through relationships and aesthetic beauty.",
  Scorpio: "Your emotional depths are profound — you feel with extraordinary intensity and have powerful intuitive gifts.",
  Sagittarius: "Your inner world is expansive and optimistic — you process emotions through adventure and philosophical understanding.",
  Capricorn: "Your emotional foundation is mature and structured — you handle feelings with composure and quiet strength.",
  Aquarius: "Your inner world is unconventional and idealistic — you process emotions intellectually and need mental freedom.",
  Pisces: "Your emotional nature is boundlessly empathetic — you absorb the feelings of others and need creative expression.",
};

const BIG_THREE_RISING: Record<string, string> = {
  Aries: "The world sees you as bold and energetic — your first impression is one of confidence and directness.",
  Taurus: "The world sees you as calm and reliable — your presence is grounding and you project quiet strength.",
  Gemini: "The world sees you as witty and adaptable — you make quick connections and project intellectual charm.",
  Cancer: "The world sees you as warm and approachable — your presence feels nurturing and emotionally safe.",
  Leo: "The world sees you as charismatic and magnetic — you command attention and radiate natural warmth.",
  Virgo: "The world sees you as composed and thoughtful — your presence conveys intelligence and quiet competence.",
  Libra: "The world sees you as graceful and charming — you project elegance and put others at ease.",
  Scorpio: "The world sees you as mysterious and intense — your presence is powerful and magnetically compelling.",
  Sagittarius: "The world sees you as adventurous and optimistic — your energy is expansive and inspiring.",
  Capricorn: "The world sees you as serious and capable — you project authority, ambition, and quiet determination.",
  Aquarius: "The world sees you as unique and forward-thinking — your presence feels original and intellectually stimulating.",
  Pisces: "The world sees you as gentle and dreamy — your presence is soothing and creatively inspiring.",
};

/** Generate Big Three Insight paragraph */
export function getBigThreeInsight(sunSign: string, moonSign: string, risingSign: string | null): string {
  const sunDesc = BIG_THREE_SUN[sunSign] || "someone with a unique cosmic signature";
  const moonDesc = BIG_THREE_MOON[moonSign] || "Your emotional world is complex and multi-layered.";

  let text = `At your core, you are ${sunDesc}. ${moonDesc}`;

  if (risingSign) {
    const risingDesc = BIG_THREE_RISING[risingSign] || "Your rising sign adds a distinctive layer to how others perceive you.";
    text += ` ${risingDesc}`;
  }

  return text;
}

/** Get interpretation for a planet in a sign */
export function getPlanetInsight(planet: string, sign: string): string {
  return PLANET_IN_SIGN[planet]?.[sign] || `Your ${planet} in ${sign} adds a unique dimension to your cosmic profile.`;
}

/** Generate planet insights for all planets */
export function getAllPlanetInsights(planets: Record<string, { sign: string }>): Record<string, string> {
  const insights: Record<string, string> = {};
  for (const [planet, data] of Object.entries(planets)) {
    insights[planet] = getPlanetInsight(planet, data.sign);
  }
  return insights;
}

/** Generate life themes based on planet placements */
export function getLifeThemes(planets: Record<string, { sign: string; house: number | null }>): {
  loveAndRelationships: string;
  careerAndSuccess: string;
  communicationStyle: string;
  emotionalWorld: string;
  spiritualPath: string;
} {
  const venus = planets.venus;
  const moon = planets.moon;
  const mercury = planets.mercury;
  const saturn = planets.saturn;
  const neptune = planets.neptune;
  const mars = planets.mars;
  const jupiter = planets.jupiter;

  return {
    loveAndRelationships: `With Venus in ${venus?.sign || 'your sign'} and Moon in ${moon?.sign || 'your sign'}, your love language is unique. ${getPlanetInsight('venus', venus?.sign || 'Aries')} In relationships, your ${moon?.sign || ''} Moon adds emotional depth — you need both intellectual and emotional connection to feel truly loved.`,

    careerAndSuccess: `Saturn in ${saturn?.sign || 'your sign'} shapes your professional destiny, while Mars in ${mars?.sign || 'your sign'} drives your ambition. ${getPlanetInsight('saturn', saturn?.sign || 'Capricorn')} Your career path benefits from combining discipline with your natural drive.`,

    communicationStyle: `Mercury in ${mercury?.sign || 'your sign'} defines how you process and share ideas. ${getPlanetInsight('mercury', mercury?.sign || 'Gemini')} This placement shapes not just what you say, but how you think and learn.`,

    emotionalWorld: `Your Moon in ${moon?.sign || 'your sign'} is the key to your inner life. ${getPlanetInsight('moon', moon?.sign || 'Cancer')} Understanding your lunar nature helps you honor your deepest needs and navigate emotional challenges with greater awareness.`,

    spiritualPath: `Neptune in ${neptune?.sign || 'your sign'} and Jupiter in ${jupiter?.sign || 'your sign'} illuminate your spiritual journey. ${getPlanetInsight('neptune', neptune?.sign || 'Pisces')} Your path to meaning combines philosophical wisdom with intuitive knowing.`,
  };
}

/** Generate chart summary */
export function getChartSummary(sunSign: string, moonSign: string, risingSign: string | null, dominantElement: string): string {
  const rising = risingSign ? `, with ${risingSign} Rising` : '';
  return `Your birth chart reveals a ${sunSign} Sun and ${moonSign} Moon${rising}. With a strong ${dominantElement} element influence, your chart suggests a person who navigates life with a distinctive blend of ${getElementTraits(dominantElement)}. Your planetary placements create a unique cosmic signature that shapes your personality, relationships, and life path.`;
}

function getElementTraits(element: string): string {
  switch (element) {
    case 'Fire': return 'passion, courage, and creative energy';
    case 'Earth': return 'practicality, determination, and groundedness';
    case 'Air': return 'intellect, communication, and social connection';
    case 'Water': return 'intuition, emotion, and depth';
    default: return 'unique and multifaceted energy';
  }
}

/** Determine dominant element from planet placements */
export function getDominantElement(planets: Record<string, { sign: string }>): string {
  const elementMap: Record<string, string> = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
  };

  const counts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const data of Object.values(planets)) {
    const element = elementMap[data.sign];
    if (element) counts[element]++;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
