// Client-side local keyword search and query analyzer for SchemeSaathi Assistant.
// Serves as 100% reliable offline fallback when Gemini AI API is unavailable.

export function searchLocalSchemes(query, schemes = [], language = 'en') {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      reply: 'Please ask a question or enter keywords (e.g., "scholarships for students", "schemes for farmers", "women business aid").',
      matchedSchemes: [],
      source: 'local_search',
    };
  }

  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  // Score each scheme
  const scored = schemes.map((s) => {
    let score = 0;
    const nameEn = (typeof s.name === 'object' ? s.name.en : s.name).toLowerCase();
    const nameNative = (typeof s.name === 'object' ? s.name[language] || '' : '').toLowerCase();
    const desc = (typeof s.description === 'object' ? s.description[language] || s.description.en : s.description).toLowerCase();
    const pub = (s.publisher || '').toLowerCase();

    // Exact phrase match
    if (nameEn.includes(q) || nameNative.includes(q)) score += 50;
    if (desc.includes(q)) score += 30;

    // Word matches
    for (const w of words) {
      if (nameEn.includes(w) || nameNative.includes(w)) score += 15;
      if (desc.includes(w)) score += 8;
      if (pub.includes(w)) score += 10;
      if (s.applicableStates?.some((st) => st.toLowerCase().includes(w))) score += 12;
      if (s.eligibility?.occupations?.some((o) => o.toLowerCase().includes(w))) score += 20;
      if (s.eligibility?.domicile?.states?.some((d) => d.toLowerCase().includes(w))) score += 15;
    }

    // Keyword detection
    if ((q.includes('farm') || q.includes('kisan') || q.includes('crop') || q.includes('land')) &&
        (s.eligibility?.occupations?.includes('farmer') || s.id.includes('kisan') || s.id.includes('farmer') || s.id.includes('crop'))) {
      score += 25;
    }

    if ((q.includes('student') || q.includes('study') || q.includes('scholarship') || q.includes('college')) &&
        (s.eligibility?.occupations?.includes('student') || s.id.includes('scholarship') || s.eligibility?.requires?.some((r) => r.field === 'isStudent'))) {
      score += 25;
    }

    if ((q.includes('women') || q.includes('woman') || q.includes('female') || q.includes('mahila')) &&
        (s.eligibility?.genders?.includes('female') || s.id.includes('women'))) {
      score += 25;
    }

    if ((q.includes('senior') || q.includes('old') || q.includes('pension') || q.includes('elderly')) &&
        ((s.eligibility?.age?.min && s.eligibility.age.min >= 55) || s.id.includes('senior') || s.id.includes('pension'))) {
      score += 25;
    }

    if ((q.includes('loan') || q.includes('business') || q.includes('fund') || q.includes('self-employed')) &&
        (s.eligibility?.occupations?.includes('selfEmployed') || s.id.includes('mudra') || s.id.includes('seed'))) {
      score += 25;
    }

    return { scheme: s, score };
  });

  const matches = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.scheme);

  if (matches.length === 0) {
    return {
      reply: language === 'hi'
        ? `स्थानीय डेटाबेस में "${query}" से संबंधित कोई योजना नहीं मिली। कृपया अपने कीवर्ड बदलें या प्रोफाइल फॉर्म भरें।`
        : language === 'ur'
        ? `مقامی ڈیٹا بیس میں "${query}" کے حوالے سے کوئی اسکیم نہیں ملی۔ برائے مہربانی دوسرے الفاظ تلاش کریں۔`
        : `No matching schemes found in the local database for "${query}". Try searching by occupation (e.g. "farmer", "student"), state, or age.`,
      matchedSchemes: [],
      source: 'local_search',
    };
  }

  const topMatches = matches.slice(0, 3);
  const titles = topMatches.map((s) => typeof s.name === 'object' ? s.name[language] || s.name.en : s.name).join(', ');

  let replyText = '';
  if (language === 'hi') {
    replyText = `आपके प्रश्न के आधार पर, स्थानीय डेटाबेस में निम्नलिखित योजनाएं प्रासंगिक हैं:\n\n` +
      topMatches.map((s, i) => `${i + 1}. **${typeof s.name === 'object' ? s.name.hi || s.name.en : s.name}**: ${typeof s.description === 'object' ? s.description.hi || s.description.en : s.description}`).join('\n\n') +
      `\n\nकृपया विस्तृत पात्रता शर्तें देखने के लिए नीचे दी गई योजनाओं पर क्लिक करें।`;
  } else if (language === 'ur') {
    replyText = `آپ کے سوال کی بنیاد پر، درج ذیل متعلقہ اسکیمیں دستیاب ہیں:\n\n` +
      topMatches.map((s, i) => `${i + 1}. **${typeof s.name === 'object' ? s.name.ur || s.name.en : s.name}**: ${typeof s.description === 'object' ? s.description.ur || s.description.en : s.description}`).join('\n\n') +
      `\n\nتفصیلی شرائط دیکھنے کے لیے نیچے دی گئی اسکیموں پر کلک کریں۔`;
  } else {
    replyText = `Based on your query, here are the most relevant schemes in our local database:\n\n` +
      topMatches.map((s, i) => `${i + 1}. **${typeof s.name === 'object' ? s.name.en : s.name}**: ${typeof s.description === 'object' ? s.description.en : s.description}`).join('\n\n') +
      `\n\nClick on any scheme below to view exact eligibility conditions and required documents.`;
  }

  return {
    reply: replyText,
    matchedSchemes: topMatches,
    source: 'local_search',
  };
}
