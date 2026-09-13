// Complete Shree-Lipi (Shree-Kan-0850 / 0714 / Shree-Dev) to Kannada Unicode Engine
// Based on Padma reference mapping & ligatures transformation architecture

export interface ShreeKanOptions {
  englishNumbers?: boolean;
  removeExtraSpaces?: boolean;
}

// Special symbols
const SHREE_VISARGA = "\u0040";
const SHREE_ANUSVARA = "\u00ED";
const SHREE_VIRAMA = "\u2026";
const SHREE_HALFFM_RA = "\u00EC";

// Independent Vowels
const SHREE_VOWELS: Record<string, string> = {
  "\u0041": "ಅ",
  "\u0042": "ಆ",
  "\u0043": "ಇ",
  "\u0044": "ಈ",
  "\u0045": "ಉ",
  "\u0046": "ಊ",
  "\u004D\u00E1": "ಋ",
  "\u004D\u00E2": "ಋ",
  "\u004D\u00E5": "ಋ",
  "\u004D\u00E3": "ೠ",
  "\u004D\u00E4": "ೠ",
  "\u0047": "ಎ",
  "\u0048": "ಏ",
  "\u0049": "ಐ",
  "\u004A": "ಒ",
  "\u004B": "ಓ",
  "\u004C": "ಔ",
};

// Consonants
const SHREE_CONSONANTS: Record<string, string> = {
  "\u0050": "ಕ",
  "\u0053": "ಖ",
  "\u0054": "ಖ",
  "\u0057": "ಗ",
  "\u005A": "ಘ",
  "\u005B": "ಘ",
  "\u005F": "ಙ",
  "\u0061": "ಚ",
  "\u0064": "ಛ",
  "\u0067": "ಜ",
  "\u0068": "ಜ",
  "\u00C3\u006B\u00E1": "ಝ",
  "\u00C3\u006B\u00E2": "ಝ",
  "\u00C3\u006B\u00E5": "ಝ",
  "\u006D": "ಞ",
  "\u006F": "ಟ",
  "\u0070": "ಟ",
  "\u0073": "ಠ",
  "\u0076": "ಡ",
  "\u0079": "ಢ",
  "\u007C": "ಣ",
  "\u004F": "ಣ",
  "\u00F1": "ತ",
  "\u00A5": "ಥ",
  "\u00A8": "ದ",
  "\u00AB": "ಧ",
  "\u00AE": "ನ",
  "\u00B1": "ಪ",
  "\u00B4": "ಫ",
  "\u00B8": "ಬ",
  "\u0178": "ಬ",
  "\u00BB": "ಭ",
  "\u00CA\u00E1": "ಮ",
  "\u00CA\u00E5": "ಮ",
  "\u00BF\u00E1": "ಯ",
  "\u00BF\u00E5": "ಯ",
  "\u0030\u00E5\u00E1": "ಯ",
  "\u00C3": "ರ",
  "\u00C6": "ಲ",
  "\u00C7": "ಲ",
  "\u00CA": "ವ",
  "\u00CD": "ಶ",
  "\u00D0": "ಷ",
  "\u00D3": "ಸ",
  "\u00D6": "ಹ",
  "\u00D9": "ಳ",
  "\u201C": "ಱ",
  "\u201D": "ಱ",
  "\u2018": "ಫ",
  "\u2019": "ಫ",
  "\u00FB": "ಕ್ಷ",
  "\u00FD": "ಜ್ಞ",
  "\u00FE": "ಜ್ಞ",
};

// Consonant + Vowel Combinations (Ligatures)
const SHREE_COMBOS: Record<string, string> = {
  "\u0051": "ಕಿ",
  "\u0055": "ಖಿ",
  "\u0058": "ಗಿ",
  "\u005C": "ಘಿ",
  "\u004E": "ಘೆ",
  "\u0062": "ಚಿ",
  "\u0065": "ಛಿ",
  "\u0069": "ಜಿ",
  "\u0071": "ಟಿ",
  "\u0074": "ಠಿ",
  "\u0077": "ಡಿ",
  "\u007B": "ಢಿ",
  "\u007E": "ಣಿ",
  "\u00A3": "ತಿ",
  "\u00A6": "ಥಿ",
  "\u00A9": "ದಿ",
  "\u2014": "ಧಿ",
  "\u00AF": "ನಿ",
  "\u00B2": "ಪಿ",
  "\u00B5": "ಫಿ",
  "\u00B9": "ಬಿ",
  "\u00BC": "ಭಿ",
  "\u00CA\u00DE": "ಮಾ",
  "\u00CB\u00E1": "ಮಿ",
  "\u00CB\u00E2": "ಮಿ",
  "\u00CB\u00E5": "ಮಿ",
  "\u00CA\u00E6\u00E1": "ಮೆ",
  "\u00CA\u00E6\u00E3": "ಮೊ",
  "\u00BF\u00DE": "ಯಾ",
  "\u0030\u00E5\u00DE": "ಯಾ",
  "\u00C0\u00E1": "ಯಿ",
  "\u00BF\u00E6\u00E1": "ಯೆ",
  "\u00C1\u00E1": "ಯೆ",
  "\u0030\u00E5\u00E6\u00E1": "ಯೆ",
  "\u00BF\u00E6\u00E3": "ಯೊ",
  "\u0030\u00E5\u00E6\u00E3": "ಯೊ",
  "\u00C1\u00E3": "ಯೊ",
  "\u00C4": "ರಿ",
  "\u00C8": "ಲಿ",
  "\u00CB": "ವಿ",
  "\u00CE": "ಶಿ",
  "\u00D1": "ಷಿ",
  "\u00D4": "ಸಿ",
  "\u00D7": "ಹಿ",
  "\u00DA": "ಳಿ",
  "\u005D": "ಶ್ರೀ",
  "\u00FC": "ಕ್ಷಿ",
  "\u00FF": "ಜ್ಞಿ",
  "\u00C4\u006B\u00E1": "ಝಿ",
  "\u00C3\u00E6\u006B\u00E1": "ಝೆ",
  "\u00C3\u006B\u00DE": "ಝಾ",
};

// Dependent Vowel Signs (Gunintamulu)
const SHREE_VOWEL_SIGNS: Record<string, string> = {
  "\u00DD": "ಾ",
  "\u00DF": "ಿ",
  "\u00E1": "ು",
  "\u00E2": "ು",
  "\u00E5": "ು",
  "\u00E3": "ೂ",
  "\u00E4": "ೂ",
  "\u00DE": "ೂ",
  "\u00EA": "ೃ",
  "\u0192": "ೃ",
  "\u00EB": "ೄ",
  "\u00E6": "ೆ",
  "\u00E6\u00E3": "ೊ",
  "\u00E6\u00E4": "ೊ",
  "\u00E6\u00DE": "ೊ",
  "\u00E8": "ೌ",
  "\u00EE": "ೌ",
  "\u00E0": "ೀ_MOD", // length modifier for II/EE/OO
  "\u00E7": "ೈ_MOD", // length modifier for AI
  "\u201E": "ೈ_MOD",
};

// Vattulu (Subscript / Conjunct Consonants)
const SHREE_VATTULU: Record<string, string> = {
  "\u0052": "್ಕ",
  "\u00F0": "್ಕ್ರ",
  "\u00A2": "್ಕೃ",
  "\u0056": "್ಖ",
  "\u0059": "್ಗ",
  "\u005E": "್ಘ",
  "\u0060": "್ಙ",
  "\u0063": "್ಚ",
  "\u0066": "್ಛ",
  "\u006A": "್ಜ",
  "\u006C": "್ಝ",
  "\u006E": "್ಞ",
  "\u0072": "್ಟ",
  "\u0075": "್ಠ",
  "\u0078": "್ಡ",
  "\u007A": "್ಢ",
  "\u00A1": "್ಣ",
  "\u00A4": "್ತ",
  "\u00F5": "್ತು",
  "\u00F4": "್ತೈ",
  "\u00A7": "್ಥ",
  "\u00AA": "್ದ",
  "\u0153": "್ಧ",
  "\u00B0": "್ನ",
  "\u00B3": "್ಪ",
  "\u2013": "್ಫ",
  "\u00BA": "್ಬ",
  "\u00BD": "್ಭ",
  "\u00BE": "್ಮ",
  "\u00C2": "್ಯ",
  "\u00E9": "್ಯ",
  "\u00C5": "್ರ",
  "\u2020": "್ರ",
  "\u2039": "್ರ",
  "\u203A": "್ರ",
  "\u00F9": "್ರ",
  "\u2022": "್ರಾ",
  "\u00C9": "್ಲ",
  "\u00CC": "್ವ",
  "\u00CF": "್ಶ",
  "\u00D2": "್ಷ",
  "\u00D5": "್ಸ",
  "\u00D8": "್ಹ",
  "\u00DB": "್ಳ",
  "\u00F2": "್ಜೈ",
  "\u00F3": "್ಟ್ರ",
  "\u00F6": "್ತ್ಯ",
  "\u00F7": "್ತ್ರ",
  "\u00F8": "್ಪ್ರ",
  "\u00FA": "್ಸ್ರ",
};

// All Direct Mappings sorted by length descending
const ALL_SHREE_DIRECT: [string, string][] = ([
  ...Object.entries(SHREE_COMBOS),
  ...Object.entries(SHREE_VOWELS),
  ...Object.entries(SHREE_CONSONANTS),
  ...Object.entries(SHREE_VOWEL_SIGNS),
  ...Object.entries(SHREE_VATTULU),
  [SHREE_VISARGA, "ಃ"],
  [SHREE_ANUSVARA, "ಂ"],
  [SHREE_VIRAMA, "್"],
  ["\u003E", "।"],
  ["\u0023", "ಓಂ"],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

const SHREE_DIRECT_MAP: Record<string, string> = {};
for (const [k, v] of ALL_SHREE_DIRECT) {
  SHREE_DIRECT_MAP[k] = v;
}

function handleTwoPartVowelSigns(sign1: string, sign2: string): string {
  if (
    (sign2 === 'ಿ' && sign1 === 'ೀ_MOD') ||
    (sign1 === 'ಿ' && sign2 === 'ೀ_MOD')
  ) {
    return 'ೀ';
  }
  if (
    (sign2 === 'ೆ' && sign1 === 'ೀ_MOD') ||
    (sign1 === 'ೆ' && sign2 === 'ೀ_MOD')
  ) {
    return 'ೇ';
  }
  if (
    (sign2 === 'ೆ' && sign1 === 'ೈ_MOD') ||
    (sign1 === 'ೆ' && sign2 === 'ೈ_MOD')
  ) {
    return 'ೈ';
  }
  if (
    (sign2 === 'ೊ' && sign1 === 'ೀ_MOD') ||
    (sign1 === 'ೊ' && sign2 === 'ೀ_MOD')
  ) {
    return 'ೋ';
  }
  return sign1.replace('_MOD', '') + sign2.replace('_MOD', '');
}

export function shreeLipiToUnicode(
  text: string,
  options: ShreeKanOptions = {}
): string {
  if (!text) return '';

  let input = text;
  if (options.removeExtraSpaces) {
    input = input
      .split('\n')
      .map((l) => l.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  const lines = input.split('\n');
  const processedLines = lines.map((line) => {
    let result = '';
    let i = 0;
    const len = line.length;

    while (i < len) {
      // Check half form RA (Arkavattu) \u00EC
      if (line[i] === SHREE_HALFFM_RA) {
        // Arkavattu in Shree-Lipi attaches after base/vowel: insert ರ್ before
        result += 'ರ್';
        i += 1;
        continue;
      }

      // Check max match up to 4 chars
      let matched = false;
      for (let matchLen = 4; matchLen >= 1; matchLen--) {
        if (i + matchLen <= len) {
          const substr = line.substring(i, i + matchLen);
          if (substr in SHREE_DIRECT_MAP) {
            const mappedVal = SHREE_DIRECT_MAP[substr];
            result += mappedVal;
            i += matchLen;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        result += line[i];
        i += 1;
      }
    }

    // Post-process modifiers (ೀ_MOD, ೈ_MOD, etc.)
    result = result.replace(/([ಿೆೊ])(ೀ_MOD)/g, (_m, g1) => {
      if (g1 === 'ಿ') return 'ೀ';
      if (g1 === 'ೆ') return 'ೇ';
      if (g1 === 'ೊ') return 'ೋ';
      return g1;
    });

    result = result.replace(/([ೆ])(ೈ_MOD)/g, 'ೈ');
    result = result.replace(/ೀ_MOD/g, 'ೀ');
    result = result.replace(/ೈ_MOD/g, 'ೈ');

    // Fix Kannada numbers
    if (!options.englishNumbers) {
      result = result
        .replace(/0/g, '೦')
        .replace(/1/g, '೧')
        .replace(/2/g, '೨')
        .replace(/3/g, '೩')
        .replace(/4/g, '೪')
        .replace(/5/g, '೫')
        .replace(/6/g, '೬')
        .replace(/7/g, '೭')
        .replace(/8/g, '೮')
        .replace(/9/g, '೯');
    }

    return result;
  });

  return processedLines.join('\n');
}
