// Life-Situation recommendations and mapping
// Categories:
// 1. Students & Youth
// 2. Farmers & Agricultural Workers
// 3. Job Seekers & Unemployed
// 4. Senior Citizens
// 5. Women & Entrepreneurs
// 6. Low-Income & BPL Households

export const LIFE_SITUATIONS = [
  {
    key: 'students',
    icon: '🎓',
    name: {
      en: 'Students & Youth',
      hi: 'विद्यार्थी और युवा',
      ur: 'طلباء اور نوجوان',
    },
    description: {
      en: 'Scholarships, education allowances, skill vouchers, and study aids.',
      hi: 'छात्रवृत्तियाँ, शिक्षा भत्ते, कौशल वाउचर और अध्ययन सहायता।',
      ur: 'وظائف، تعلیمی الاؤنس، مہارت واؤچرز، اور مطالعاتی امداد۔',
    },
  },
  {
    key: 'farmers',
    icon: '🌾',
    name: {
      en: 'Farmers & Agricultural Workers',
      hi: 'किसान और कृषि कामगार',
      ur: 'کسان اور زرعی کارکن',
    },
    description: {
      en: 'Income support, crop season aid, agricultural credit, and landholder benefits.',
      hi: 'आय सहायता, फसल मौसम सहायता, कृषि ऋण और भूस्वामी लाभ।',
      ur: 'آمدنی کی امداد، فصل کے موسم کی امداد، زرعی قرض، اور اراضی کے فوائد۔',
    },
  },
  {
    key: 'job_seekers',
    icon: '💼',
    name: {
      en: 'Job Seekers & Unemployed',
      hi: 'रोज़गार खोजने वाले और बेरोज़गार',
      ur: 'ملازمت کے متلاشی اور بے روزگار',
    },
    description: {
      en: 'Vocational training, micro-enterprise seed loans, and self-employment funding.',
      hi: 'व्यावसायिक प्रशिक्षण, सूक्ष्म उद्यम प्रारंभिक ऋण और स्वरोज़गार निधि।',
      ur: 'پیشہ ورانہ تربیت، مائیکرو انٹرپرائز ابتدائی قرض، اور خود روزگار فنڈنگ۔',
    },
  },
  {
    key: 'seniors',
    icon: '👵',
    name: {
      en: 'Senior Citizens (60+)',
      hi: 'वरिष्ठ नागरिक (60+)',
      ur: 'بزرگ شہری (60+)',
    },
    description: {
      en: 'Monthly pension schemes, senior health coverage, and retirement security.',
      hi: 'मासिक पेंशन योजनाएं, वरिष्ठ स्वास्थ्य बीमा और सेवानिवृत्ति सुरक्षा।',
      ur: 'ماہانہ پنشن اسکیمیں، بزرگوں کی صحت کوریج، اور ریٹائرمنٹ سیکیورٹی۔',
    },
  },
  {
    key: 'women',
    icon: '👩',
    name: {
      en: 'Women & Entrepreneurs',
      hi: 'महिलाएं और उद्यमी',
      ur: 'خواتین اور کاروباری افراد',
    },
    description: {
      en: 'Women entrepreneur seed funds, self-help grants, and maternity benefits.',
      hi: 'महिला उद्यमी प्रारंभिक पूंजी, स्वयं सहायता समूह अनुदान और मातृत्व लाभ।',
      ur: 'خواتین کاروباری بیج فنڈز، سیلف ہیلپ گرانٹس، اور زچگی کے فوائد۔',
    },
  },
  {
    key: 'low_income',
    icon: '🏠',
    name: {
      en: 'Low-Income Households',
      hi: 'सीमित आय वाले परिवार',
      ur: 'محدود آمدنی والے خاندان',
    },
    description: {
      en: 'Cashless hospitalisation insurance, subsidized food security, and income transfers.',
      hi: 'कैशलेस अस्पताल बीमा, रियायती खाद्य सुरक्षा और प्रत्यक्ष आय सहायता।',
      ur: 'کیش لیس ہسپتال انشورنس، سبسڈی والی خوراک، اور براہ راست آمدنی کی امداد۔',
    },
  },
];

export function schemeMatchesSituation(scheme, situationKey) {
  if (!scheme) return false;
  if (Array.isArray(scheme.lifeSituations) && scheme.lifeSituations.includes(situationKey)) {
    return true;
  }

  const e = scheme.eligibility || {};
  switch (situationKey) {
    case 'students':
      return (
        e.occupations?.includes('student') ||
        e.requires?.some((r) => r.field === 'isStudent' && r.equals === 'yes') ||
        scheme.id.includes('scholarship') ||
        scheme.id.includes('student')
      );
    case 'farmers':
      return (
        e.occupations?.includes('farmer') ||
        e.requires?.some((r) => r.field === 'ownsLand' && r.equals === 'yes') ||
        scheme.id.includes('farmer') ||
        scheme.id.includes('crop') ||
        scheme.id.includes('kisan')
      );
    case 'job_seekers':
      return (
        e.occupations?.includes('unemployed') ||
        e.occupations?.includes('selfEmployed') ||
        scheme.id.includes('voucher') ||
        scheme.id.includes('skill') ||
        scheme.id.includes('mudra')
      );
    case 'seniors':
      return (
        (e.age?.min != null && e.age.min >= 55) ||
        scheme.id.includes('senior') ||
        scheme.id.includes('pension')
      );
    case 'women':
      return (
        e.genders?.includes('female') ||
        scheme.id.includes('women') ||
        scheme.id.includes('mahila')
      );
    case 'low_income':
      return (
        (e.income?.max != null && e.income.max <= 300000) ||
        scheme.id.includes('jay') ||
        scheme.id.includes('jdy') ||
        scheme.id.includes('livelihood')
      );
    default:
      return false;
  }
}

export function filterSchemesBySituation(schemes, situationKey) {
  if (!situationKey || situationKey === 'all') return schemes;
  return schemes.filter((s) => schemeMatchesSituation(s, situationKey));
}
