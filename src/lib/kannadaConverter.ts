// Comprehensive Multi-Font Kannada Conversion Suite
// Supporting Nudi/Baraha ASCII ⇄ Unicode, Shree-Lipi ➔ Unicode, and Font Auto-Detection

import { shreeLipiToUnicode, ShreeKanOptions } from './shreeKanConverter';

export type FontMode =
  | 'auto'
  | 'nudi-to-unicode'
  | 'shree-to-unicode'
  | 'unicode-to-nudi';

export interface KannadaConversionOptions extends ShreeKanOptions {
  fontMode?: FontMode;
}

// ----------------------------------------------------------------------------
// ASCII to Unicode Engine (Aravinda VK's ascii2unicode)
// ----------------------------------------------------------------------------

const A2U_MAPPING: Record<string, string> = {
  "C"     : "ಅ",
  "D"     : "ಆ",
  "E"     : "ಇ",
  "F"     : "ಈ",
  "G"     : "ಉ",
  "H"     : "ಊ",
  "IÄ"    : "ಋ",
  "J"     : "ಎ",
  "K"     : "ಏ",
  "L"     : "ಐ",
  "M"     : "ಒ",
  "N"     : "ಓ",
  "O"     : "ಔ",
  "A"     : "ಂ",
  "B"     : "ಃ",
  "Pï"    : "ಕ್",
  "PÀ"    : "ಕ",
  "PÁ"    : "ಕಾ",
  "Q"     : "ಕಿ",
  "PÉ"    : "ಕೆ",
  "PË"    : "ಕೌ",
  "Sï"    : "ಖ್",
  "R"     : "ಖ",
  "SÁ"    : "ಖಾ",
  "T"     : "ಖಿ",
  "SÉ"    : "ಖೆ",
  "SË"    : "ಖೌ",
  "Uï"    : "ಗ್",
  "UÀ"    : "ಗ",
  "UÁ"    : "ಗಾ",
  "V"     : "ಗಿ",
  "UÉ"    : "ಗೆ",
  "UË"    : "ಗೌ",
  "Wï"    : "ಘ್",
  "WÀ"    : "ಘ",
  "WÁ"    : "ಘಾ",
  "X"     : "ಘಿ",
  "WÉ"    : "ಘೆ",
  "WË"    : "ಘೌ",
  "k"     : "ಞ",
  "Zï"    : "ಚ್",
  "ZÀ"    : "ಚ",
  "ZÁ"    : "ಚಾ",
  "a"     : "ಚಿ",
  "ZÉ"    : "ಚೆ",
  "ZË"    : "ಚೌ",
  "bï"    : "ಛ್",
  "bÀ"    : "ಛ",
  "bÁ"    : "ಛಾ",
  "c"     : "ಛಿ",
  "bÉ"    : "ಛೆ",
  "bË"    : "ಛೌ",
  "eï"    : "ಜ್",
  "d"     : "ಜ",
  "eÁ"    : "ಜಾ",
  "f"     : "ಜಿ",
  "eÉ"    : "ಜೆ",
  "eË"    : "ಜೌ",
  "gÀhiï" : "ಝ್",
  "gÀhÄ"  : "ಝ",
  "gÀhiÁ" : "ಝಾ",
  "jhÄ"   : "ಝಿ",
  "gÉhÄ"  : "ಝೆ",
  "gÉhÆ"  : "ಝೊ",
  "gÀhiË" : "ಝೌ",
  "Y"     : "ಙ",
  "mï"    : "ಟ್",
  "l"     : "ಟ",
  "mÁ"    : "ಟಾ",
  "n"     : "ಟಿ",
  "mÉ"    : "ಟೆ",
  "mË"    : "ಟೌ",
  "oï"    : "ಠ್",
  "oÀ"    : "ಠ",
  "oÁ"    : "ಠಾ",
  "p"     : "ಠಿ",
  "oÉ"    : "ಠೆ",
  "oË"    : "ಠೌ",
  "qï"    : "ಡ್",
  "qÀ"    : "ಡ",
  "qÁ"    : "ಡಾ",
  "r"     : "ಡಿ",
  "qÉ"    : "ಡೆ",
  "qË"    : "ಡೌ",
  "qsï"   : "ಢ್",
  "qsÀ"   : "ಢ",
  "qsÁ"   : "ಢಾ",
  "rü"    : "ಢಿ",
  "qsÉ"   : "ಢೆ",
  "qsË"   : "ಢೌ",
  "uï"    : "ಣ್",
  "t"     : "ಣ",
  "uÁ"    : "ಣಾ",
  "tÂ"    : "ಣಿ",
  "uÉ"    : "ಣೆ",
  "uË"    : "ಣೌ",
  "vï"    : "ತ್",
  "vÀ"    : "ತ",
  "vÁ"    : "ತಾ",
  "w"     : "ತಿ",
  "vÉ"    : "ತೆ",
  "vË"    : "ತೌ",
  "xï"    : "ಥ್",
  "xÀ"    : "ಥ",
  "xÁ"    : "ಥಾ",
  "y"     : "ಥಿ",
  "xÉ"    : "ಥೆ",
  "xË"    : "ಥೌ",
  "zï"    : "ದ್",
  "zÀ"    : "ದ",
  "zÁ"    : "ದಾ",
  "¢"     : "ದಿ",
  "zÉ"    : "ದೆ",
  "zË"    : "ದೌ",
  "zsï"   : "ಧ್",
  "zsÀ"   : "ಧ",
  "zsÁ"   : "ಧಾ",
  "¢ü"    : "ಧಿ",
  "zsÉ"   : "ಧೆ",
  "zsË"   : "ಧೌ",
  "£ï"    : "ನ್",
  "£À"    : "ನ",
  "£Á"    : "ನಾ",
  "¤"     : "ನಿ",
  "£É"    : "ನೆ",
  "£Ë"    : "ನೌ",
  "¥ï"    : "ಪ್",
  "¥À"    : "ಪ",
  "¥Á"    : "ಪಾ",
  "¦"     : "ಪಿ",
  "¥É"    : "ಪೆ",
  "¥Ë"    : "ಪೌ",
  "¥sï"   : "ಫ್",
  "¥sÀ"   : "ಫ",
  "¥sÁ"   : "ಫಾ",
  "¦ü"    : "ಫಿ",
  "¥sÉ"   : "ಫೆ",
  "¥sË"   : "ಫೌ",
  "¨ï"    : "ಬ್",
  "§"     : "ಬ",
  "¨Á"    : "ಬಾ",
  "©"     : "ಬಿ",
  "¨É"    : "ಬೆ",
  "¨Ë"    : "ಬೌ",
  "¨sï"   : "ಭ್",
  "¨sÀ"   : "ಭ",
  "¨sÁ"   : "ಭಾ",
  "©ü"    : "ಭಿ",
  "¨sÉ"   : "ಭೆ",
  "¨sË"   : "ಭೌ",
  "ªÀiï"  : "ಮ್",
  "ªÀÄ"   : "ಮ",
  "ªÀiÁ"  : "ಮಾ",
  "«Ä"    : "ಮಿ",
  "ªÉÄ"   : "ಮೆ",
  "ªÀiË"  : "ಮೌ",
  "AiÀiï" : "ಯ್",
  "AiÀÄ"  : "ಯ",
  "0iÀÄ"  : "ಯ",
  "AiÀiÁ" : "ಯಾ",
  "0iÀiÁ" : "ಯಾ",
  "¬Ä"    : "ಯಿ",
  "0iÀÄÄ" : "ಯು",
  "AiÉÄ"  : "ಯೆ",
  "0iÉÆ"  : "ಯೊ",
  "AiÉÆ"  : "ಯೊ",
  "AiÀiË" : "ಯೌ",
  "gï"    : "ರ್",
  "gÀ"    : "ರ",
  "gÁ"    : "ರಾ",
  "j"     : "ರಿ",
  "gÉ"    : "ರೆ",
  "gË"    : "ರೌ",
  "¯ï"    : "ಲ್",
  "®"     : "ಲ",
  "¯Á"    : "ಲಾ",
  "°"     : "ಲಿ",
  "¯É"    : "ಲೆ",
  "¯Ë"    : "ಲೌ",
  "ªï"    : "ವ್",
  "ªÀ"    : "ವ",
  "ªÁ"    : "ವಾ",
  "«"     : "ವಿ",
  "ªÀÅ"   : "ವು",
  "ªÀÇ"   : "ವೂ",
  "ªÉ"    : "ವೆ",
  "ªÉÃ"   : "ವೇ",
  "ªÉÊ"   : "ವೈ",
  "ªÉÆ"   : "ಮೊ",
  "ªÉÆÃ"  : "ಮೋ",
  "ªÉÇ"   : "ವೊ",
  "ªÉÇÃ"  : "ವೋ",
  "ªÉ  "  : "ವೆ",
  "¥ÀÅ"   : "ಪು",
  "¥ÀÇ"   : "ಪೂ",
  "¥sÀÅ"  : "ಫು",
  "¥sÀÇ"  : "ಫೂ",
  "ªË"    : "ವೌ",
  "±ï"    : "ಶ್",
  "±À"    : "ಶ",
  "±Á"    : "ಶಾ",
  "²"     : "ಶಿ",
  "±É"    : "ಶೆ",
  "±Ë"    : "ಶೌ",
  "µï"    : "ಷ್",
  "µÀ"    : "ಷ",
  "µÁ"    : "ಷಾ",
  "¶"     : "ಷಿ",
  "µÉ"    : "ಷೆ",
  "µË"    : "ಷೌ",
  "¸ï"    : "ಸ್",
  "¸À"    : "ಸ",
  "¸Á"    : "ಸಾ",
  "¹"     : "ಸಿ",
  "¸É"    : "ಸೆ",
  "¸Ë"    : "ಸೌ",
  "ºï"    : "ಹ್",
  "ºÀ"    : "ಹ",
  "ºÁ"    : "ಹಾ",
  "»"     : "ಹಿ",
  "ºÉ"    : "ಹೆ",
  "ºË"    : "ಹೌ",
  "¼ï"    : "ಳ್",
  "¼À"    : "ಳ",
  "¼Á"    : "ಳಾ",
  "½"     : "ಳಿ",
  "¼É"    : "ಳೆ",
  "¼Ë"    : "ಳೌ"
};

const A2U_BROKEN_CASES: Record<string, { value: string; mapping: Record<string, string> }> = {
  "Ã": {
    value: "ೀ",
    mapping: {
      "ಿ": "ೀ",
      "ೆ": "ೇ",
      "ೊ": "ೋ"
    }
  },
  "Ä": {
    value: "ು",
    mapping: {}
  },
  "Æ": {
    value: "ೂ",
    mapping: {
      "ೆ": "ೊ"
    }
  },
  "È": {
    value: "ೃ",
    mapping: {}
  },
  "Ê": {
    value: "ೈ",
    mapping: {
      "ೆ": "ೈ"
    }
  }
};

const A2U_DEPENDENT_VOWELS = ["್", "ಾ", "ಿ", "ೀ", "ು", "ೂ", "ೃ", "ೆ", "ೇ", "ೈ", "ೊ", "ೋ", "ೌ"];
const A2U_IGNORE_LIST: Record<string, string> = { "ö": "", "÷": "" };

const A2U_VATTAKSHARAGALU: Record<string, string> = {
  "Ì": "ಕ",
  "Í": "ಖ",
  "Î": "ಗ",
  "Ï": "ಘ",
  "Õ": "ಞ",
  "Ñ": "ಚ",
  "Ò": "ಛ",
  "Ó": "ಜ",
  "Ô": "ಝ",
  "Ö": "ಟ",
  "×": "ಠ",
  "Ø": "ಡ",
  "Ù": "ಢ",
  "Ú": "ಣ",
  "Û": "ತ",
  "Ü": "ಥ",
  "Ý": "ದ",
  "Þ": "ಧ",
  "ß": "ನ",
  "à": "ಪ",
  "á": "ಫ",
  "â": "ಬ",
  "ã": "ಭ",
  "ä": "ಮ",
  "å": "ಯ",
  "æ": "ರ",
  "è": "ಲ",
  "é": "ವ",
  "ê": "ಶ",
  "ë": "ಷ",
  "ì": "ಸ",
  "í": "ಹ",
  "î": "ಳ",
  "ç": "ರ",
  "ù": "ಱ",
  "ú": "ೞ"
};

const A2U_ARKAVATTU: Record<string, string> = {
  "ð": "ರ"
};

function processVattakshara(letters: string[], t: string): string[] {
  let last_letter = "";
  if (letters.length > 0) {
    last_letter = letters[letters.length - 1];
  }

  if (A2U_DEPENDENT_VOWELS.indexOf(last_letter) !== -1) {
    letters[letters.length - 1] = "್";
    letters.push(A2U_VATTAKSHARAGALU[t]);
    letters.push(last_letter);
  } else {
    letters.push("್");
    letters.push(A2U_VATTAKSHARAGALU[t]);
  }
  return letters;
}

function processArkavattu(letters: string[], t: string): string[] {
  let last_letter = "";
  let second_last = "";

  if (letters.length > 0) {
    last_letter = letters[letters.length - 1];
  }
  if (letters.length > 1) {
    second_last = letters[letters.length - 2];
  }

  if (A2U_DEPENDENT_VOWELS.indexOf(last_letter) !== -1) {
    letters[letters.length - 2] = A2U_ARKAVATTU[t];
    letters[letters.length - 1] = "್";
    letters.push(second_last);
    letters.push(last_letter);
  } else {
    letters[letters.length - 1] = A2U_ARKAVATTU[t];
    letters.push("್");
    letters.push(last_letter);
  }
  return letters;
}

function processBrokenCases(letters: string[], t: string): string[] {
  let last_letter = "";
  if (letters.length > 0) {
    last_letter = letters[letters.length - 1];
  }

  const broken_case_mapping = A2U_BROKEN_CASES[t]?.mapping || {};
  if (last_letter in broken_case_mapping) {
    letters[letters.length - 1] = broken_case_mapping[last_letter];
  } else if (A2U_BROKEN_CASES[t]) {
    letters.push(A2U_BROKEN_CASES[t].value);
  }
  return letters;
}

function findA2UMapping(op: string[], txt: string, current_pos: number): [number, string[]] {
  let max_len = 4;
  const remaining = txt.length - current_pos;
  if (remaining < 5) {
    max_len = remaining - 1;
  }

  let n = 0;

  for (let i = max_len; i >= 0; i--) {
    const substr_till = current_pos + i + 1;
    const t = txt.substring(current_pos, substr_till);

    if (t in A2U_MAPPING) {
      if (op.length > 0 && /್$/.test(op[op.length - 1])) {
        op.push("‍"); // ZWJ
      }
      op.push(A2U_MAPPING[t]);
      n = i;
      break;
    } else {
      if (i > 0) continue;

      let opList = op.join('').split('');
      if (t in A2U_ARKAVATTU) {
        opList = processArkavattu(opList, t);
      } else if (t in A2U_VATTAKSHARAGALU) {
        opList = processVattakshara(opList, t);
      } else if (t in A2U_BROKEN_CASES) {
        opList = processBrokenCases(opList, t);
      } else {
        opList.push(t);
      }
      op = [opList.join('')];
    }
  }

  return [n, op];
}

function processA2UWord(word: string, english_numbers = false): string {
  let i = 0;
  const max_len = word.length;
  let op: string[] = [];

  while (i < max_len) {
    if (word[i] in A2U_IGNORE_LIST) {
      i += 1;
      continue;
    }

    const data = findA2UMapping(op, word, i);
    op = data[1];
    i += 1 + data[0];
  }

  let result = op.join('');
  if (!english_numbers) {
    result = toUnicodeNumbers(result);
  }
  return result;
}

// ----------------------------------------------------------------------------
// Unicode to ASCII Engine (Sanka / kn.js)
// ----------------------------------------------------------------------------

const U2A_MAP: Record<string, string> = {
  "\u0c82": "A", "\u0c83": "B", "\u0c85\u0c82": "CA", "\u0c85\u0c83": "CB", "\u0c85": "C", "\u0c86": "D", "\u0c87": "E", "\u0c88": "F", "\u0c89": "G", "\u0c8a": "H", "\u0c8b": "I\u00c4", "\u0ce0": "I\u00c62", "\u0c8e": "J", "\u0c8f": "K", "\u0c90": "L", "\u0c92": "M", "\u0c93": "N", "\u0c94": "O",
  "\u0c95\u0ccd": "P\u00ef", "\u0c95": "P\u00c0", "\u0c95\u0cbe": "P\u00c1", "\u0c95\u0cbf": "Q", "\u0c95\u0cc0": "Q\u00c3", "\u0c95\u0cc1": "P\u00c0\u00c4", "\u0c95\u0cc2": "P\u00c0\u00c6", "\u0c95\u0cc3": "P\u00c0\u00c8", "\u0c95\u0cc6": "P\u00c9", "\u0c95\u0cc7": "P\u00c9\u00c3", "\u0c95\u0cc8": "P\u00c9\u00ca", "\u0c95\u0cca": "P\u00c9\u00c6", "\u0c95\u0ccb": "P\u00c9\u00c6\u00c3", "\u0c95\u0ccc": "P\u00cb",
  "\u0c96\u0ccd": "S\u00ef", "\u0c96": "R", "\u0c96\u0cbe": "S\u00c1", "\u0c96\u0cbf": "T", "\u0c96\u0cc0": "T\u00c3", "\u0c96\u0cc1": "R\u00c4", "\u0c96\u0cc2": "R\u00c6", "\u0c96\u0cc3": "R\u00c8", "\u0c96\u0cc6": "S\u00c9", "\u0c96\u0cc7": "S\u00c9\u00c3", "\u0c96\u0cc8": "S\u00c9\u00ca", "\u0c96\u0cca": "S\u00c9\u00c6", "\u0c96\u0ccb": "S\u00c9\u00c6\u00c3", "\u0c96\u0ccc": "S\u00cb",
  "\u0c97\u0ccd": "U\u00ef", "\u0c97": "U\u00c0", "\u0c97\u0cbe": "U\u00c1", "\u0c97\u0cbf": "V", "\u0c97\u0cc0": "V\u00c3", "\u0c97\u0cc1": "U\u00c0\u00c4", "\u0c97\u0cc2": "U\u00c0\u00c6", "\u0c97\u0cc3": "U\u00c0\u00c8", "\u0c97\u0cc6": "U\u00c9", "\u0c97\u0cc7": "U\u00c9\u00c3", "\u0c97\u0cc8": "U\u00c9\u00ca", "\u0c97\u0cca": "U\u00c9\u00c6", "\u0c97\u0ccb": "U\u00c9\u00c6\u00c3", "\u0c97\u0ccc": "U\u00cb",
  "\u0c98\u0ccd": "W\u00ef", "\u0c98": "W\u00c0", "\u0c98\u0cbe": "W\u00c1", "\u0c98\u0cbf": "X", "\u0c98\u0cc0": "X\u00c3", "\u0c98\u0cc1": "W\u00c0\u00c4", "\u0c98\u0cc2": "W\u00c0\u00c6", "\u0c98\u0cc3": "W\u00c0\u00c8", "\u0c98\u0cc6": "W\u00c9", "\u0c98\u0cc7": "W\u00c9\u00c3", "\u0c98\u0cc8": "W\u00c9\u00ca", "\u0c98\u0cca": "W\u00c9\u00c6", "\u0c98\u0ccb": "W\u00c9\u00c6\u00c3", "\u0c98\u0ccc": "W\u00cb",
  "\u0c99\u0ccd": "Y\u00ef", "\u0c99": "Y",
  "\u0c9a\u0ccd": "Z\u00ef", "\u0c9a": "Z\u00c0", "\u0c9a\u0cbe": "Z\u00c1", "\u0c9a\u0cbf": "a", "\u0c9a\u0cc0": "a\u00c3", "\u0c9a\u0cc1": "Z\u00c0\u00c4", "\u0c9a\u0cc2": "Z\u00c0\u00c6", "\u0c9a\u0cc3": "Z\u00c0\u00c8", "\u0c9a\u0cc6": "Z\u00c9", "\u0c9a\u0cc7": "Z\u00c9\u00c3", "\u0c9a\u0cc8": "Z\u00c9\u00ca", "\u0c9a\u0cca": "Z\u00c9\u00c6", "\u0c9a\u0ccb": "Z\u00c9\u00c6\u00c3", "\u0c9a\u0ccc": "Z\u00cb",
  "\u0c9b\u0ccd": "b\u00ef", "\u0c9b": "b\u00c0", "\u0c9b\u0cbe": "b\u00c1", "\u0c9b\u0cbf": "c", "\u0c9b\u0cc0": "c\u00c3", "\u0c9b\u0cc1": "b\u00c0\u00c4", "\u0c9b\u0cc2": "b\u00c0\u00c6", "\u0c9b\u0cc3": "b\u00c0\u00c8", "\u0c9b\u0cc6": "b\u00c9", "\u0c9b\u0cc7": "b\u00c9\u00c3", "\u0c9b\u0cc8": "b\u00c9\u00ca", "\u0c9b\u0cca": "b\u00c9\u00c6", "\u0c9b\u0ccb": "b\u00c9\u00c6\u00c3", "\u0c9b\u0ccc": "b\u00cb",
  "\u0c9c\u0ccd": "e\u00ef", "\u0c9c": "d", "\u0c9c\u0cbe": "e\u00c1", "\u0c9c\u0cbf": "f", "\u0c9c\u0cc0": "f\u00c3", "\u0c9c\u0cc1": "d\u00c4", "\u0c9c\u0cc2": "d\u00c6", "\u0c9c\u0cc3": "d\u00c8", "\u0c9c\u0cc6": "e\u00c9", "\u0c9c\u0cc7": "e\u00c9\u00c3", "\u0c9c\u0cc8": "e\u00c9\u00ca", "\u0c9c\u0cca": "e\u00c9\u00c6", "\u0c9c\u0ccb": "e\u00c9\u00c6\u00c3", "\u0c9c\u0ccc": "e\u00cb",
  "\u0c9d\u0ccd": "g\u00c0hi\u00ef", "\u0c9d": "g\u00c0h\u00c4", "\u0c9d\u0cbe": "g\u00c0hi\u00c1", "\u0c9d\u0cbf": "jh\u00c4", "\u0c9d\u0cc0": "jh\u00c4\u00c3", "\u0c9d\u0cc1": "g\u00c0h\u00c4\u00c4", "\u0c9d\u0cc2": "g\u00c0h\u00c4\u00c6", "\u0c9d\u0cc3": "g\u00c0h\u00c4\u00c8", "\u0c9d\u0cc6": "g\u00c9h\u00c4", "\u0c9d\u0cc7": "g\u00c9h\u00c4\u00c3", "\u0c9d\u0cc8": "g\u00c9h\u00c4\u00ca", "\u0c9d\u0cca": "g\u00c9h\u00c6", "\u0c9d\u0ccb": "g\u00c9h\u00c6\u00c3", "\u0c9d\u0ccc": "g\u00c0hi\u00cb",
  "\u0c9e\u0ccd": "k\u00ef", "\u0c9e": "k",
  "\u0c9f\u0ccd": "m\u00ef", "\u0c9f": "l", "\u0c9f\u0cbe": "m\u00c1", "\u0c9f\u0cbf": "n", "\u0c9f\u0cc0": "n\u00c3", "\u0c9f\u0cc1": "l\u00c4", "\u0c9f\u0cc2": "l\u00c6", "\u0c9f\u0cc3": "l\u00c8", "\u0c9f\u0cc6": "m\u00c9", "\u0c9f\u0cc7": "m\u00c9\u00c3", "\u0c9f\u0cc8": "m\u00c9\u00ca", "\u0c9f\u0cca": "m\u00c9\u00c6", "\u0c9f\u0ccb": "m\u00c9\u00c6\u00c3", "\u0c9f\u0ccc": "m\u00cb",
  "\u0ca0\u0ccd": "o\u00ef", "\u0ca0": "o\u00c0", "\u0ca0\u0cbe": "o\u00c1", "\u0ca0\u0cbf": "p", "\u0ca0\u0cc0": "p\u00c3", "\u0ca0\u0cc1": "o\u00c0\u00c4", "\u0ca0\u0cc2": "o\u00c0\u00c6", "\u0ca0\u0cc3": "o\u00c0\u00c8", "\u0ca0\u0cc6": "o\u00c9", "\u0ca0\u0cc7": "o\u00c9\u00c3", "\u0ca0\u0cc8": "o\u00c9\u00ca", "\u0ca0\u0cca": "o\u00c9\u00c6", "\u0ca0\u0ccb": "o\u00c9\u00c6\u00c3", "\u0ca0\u0ccc": "o\u00cb",
  "\u0ca1\u0ccd": "q\u00ef", "\u0ca1": "q\u00c0", "\u0ca1\u0cbe": "q\u00c1", "\u0ca1\u0cbf": "r", "\u0ca1\u0cc0": "r\u00c3", "\u0ca1\u0cc1": "q\u00c0\u00c4", "\u0ca1\u0cc2": "q\u00c0\u00c6", "\u0ca1\u0cc3": "q\u00c0\u00c8", "\u0ca1\u0cc6": "q\u00c9", "\u0ca1\u0cc7": "q\u00c9\u00c3", "\u0ca1\u0cc8": "q\u00c9\u00ca", "\u0ca1\u0cca": "q\u00c9\u00c6", "\u0ca1\u0ccb": "q\u00c9\u00c6\u00c3", "\u0ca1\u0ccc": "q\u00cb",
  "\u0ca2\u0ccd": "qs\u00ef", "\u0ca2": "qs\u00c0", "\u0ca2\u0cbe": "qs\u00c1", "\u0ca2\u0cbf": "r\u00fc", "\u0ca2\u0cc0": "r\u00fc\u00c3", "\u0ca2\u0cc1": "qs\u00c0\u00c4", "\u0ca2\u0cc2": "qs\u00c0\u00c6", "\u0ca2\u0cc3": "qs\u00c0\u00c8", "\u0ca2\u0cc6": "qs\u00c9", "\u0ca2\u0cc7": "qs\u00c9\u00c3", "\u0ca2\u0cc8": "qs\u00c9\u00ca", "\u0ca2\u0cca": "qs\u00c9\u00c6", "\u0ca2\u0ccb": "qs\u00c9\u00c6\u00c3", "\u0ca2\u0ccc": "qs\u00cb",
  "\u0ca3\u0ccd": "u\u00ef", "\u0ca3": "t", "\u0ca3\u0cbe": "u\u00c1", "\u0ca3\u0cbf": "t\u00c2", "\u0ca3\u0cc0": "t\u00c2\u00c3", "\u0ca3\u0cc1": "t\u00c4", "\u0ca3\u0cc2": "t\u00c6", "\u0ca3\u0cc3": "t\u00c8", "\u0ca3\u0cc6": "u\u00c9", "\u0ca3\u0cc7": "u\u00c9\u00c3", "\u0ca3\u0cc8": "u\u00c9\u00ca", "\u0ca3\u0cca": "u\u00c9\u00c6", "\u0ca3\u0ccb": "u\u00c9\u00c6\u00c3", "\u0ca3\u0ccc": "u\u00cb",
  "\u0ca4\u0ccd": "v\u00ef", "\u0ca4": "v\u00c0", "\u0ca4\u0cbe": "v\u00c1", "\u0ca4\u0cbf": "w", "\u0ca4\u0cc0": "w\u00c3", "\u0ca4\u0cc1": "v\u00c0\u00c4", "\u0ca4\u0cc2": "v\u00c0\u00c6", "\u0ca4\u0cc3": "v\u00c0\u00c8", "\u0ca4\u0cc6": "v\u00c9", "\u0ca4\u0cc7": "v\u00c9\u00c3", "\u0ca4\u0cc8": "v\u00c9\u00ca", "\u0ca4\u0cca": "v\u00c9\u00c6", "\u0ca4\u0ccb": "v\u00c9\u00c6\u00c3", "\u0ca4\u0ccc": "v\u00cb",
  "\u0ca5\u0ccd": "x\u00ef", "\u0ca5": "x\u00c0", "\u0ca5\u0cbe": "x\u00c1", "\u0ca5\u0cbf": "y", "\u0ca5\u0cc0": "y\u00c3", "\u0ca5\u0cc1": "x\u00c0\u00c4", "\u0ca5\u0cc2": "x\u00c0\u00c6", "\u0ca5\u0cc3": "x\u00c0\u00c8", "\u0ca5\u0cc6": "x\u00c9", "\u0ca5\u0cc7": "x\u00c9\u00c3", "\u0ca5\u0cc8": "x\u00c9\u00ca", "\u0ca5\u0cca": "x\u00c9\u00c6", "\u0ca5\u0ccb": "x\u00c9\u00c6\u00c3", "\u0ca5\u0ccc": "x\u00cb",
  "\u0ca6\u0ccd": "z\u00ef", "\u0ca6": "z\u00c0", "\u0ca6\u0cbe": "z\u00c1", "\u0ca6\u0cbf": "\u00a2", "\u0ca6\u0cc0": "\u00a2\u00c3", "\u0ca6\u0cc1": "z\u00c0\u00c4", "\u0ca6\u0cc2": "z\u00c0\u00c6", "\u0ca6\u0cc3": "z\u00c0\u00c8", "\u0ca6\u0cc6": "z\u00c9", "\u0ca6\u0cc7": "z\u00c9\u00c3", "\u0ca6\u0cc8": "z\u00c9\u00ca", "\u0ca6\u0cca": "z\u00c9\u00c6", "\u0ca6\u0ccb": "z\u00c9\u00c6\u00c3", "\u0ca6\u0ccc": "z\u00cb",
  "\u0ca7\u0ccd": "zs\u00ef", "\u0ca7": "zs\u00c0", "\u0ca7\u0cbe": "zs\u00c1", "\u0ca7\u0cbf": "\u00a2\u00fc", "\u0ca7\u0cc0": "\u00a2\u00fc\u00c3", "\u0ca7\u0cc1": "zs\u00c0\u00c4", "\u0ca7\u0cc2": "zs\u00c0\u00c6", "\u0ca7\u0cc3": "zs\u00c0\u00c8", "\u0ca7\u0cc6": "zs\u00c9", "\u0ca7\u0cc7": "zs\u00c9\u00c3", "\u0ca7\u0cc8": "zs\u00c9\u00ca", "\u0ca7\u0cca": "zs\u00c9\u00c6", "\u0ca7\u0ccb": "zs\u00c9\u00c6\u00c3", "\u0ca7\u0ccc": "zs\u00cb",
  "\u0ca8\u0ccd": "\u00a3\u00ef", "\u0ca8": "\u00a3\u00c0", "\u0ca8\u0cbe": "\u00a3\u00c1", "\u0ca8\u0cbf": "\u00a4", "\u0ca8\u0cc0": "\u00a4\u00c3", "\u0ca8\u0cc1": "\u00a3\u00c0\u00c4", "\u0ca8\u0cc2": "\u00a3\u00c0\u00c6", "\u0ca8\u0cc3": "\u00a3\u00c0\u00c8", "\u0ca8\u0cc6": "\u00a3\u00c9", "\u0ca8\u0cc7": "\u00a3\u00c9\u00c3", "\u0ca8\u0cc8": "\u00a3\u00c9\u00ca", "\u0ca8\u0cca": "\u00a3\u00c9\u00c6", "\u0ca8\u0ccb": "\u00a3\u00c9\u00c6\u00c3", "\u0ca8\u0ccc": "\u00a3\u00cb",
  "\u0caa\u0ccd": "\u00a5\u00ef", "\u0caa": "\u00a5\u00c0", "\u0caa\u0cbe": "\u00a5\u00c1", "\u0caa\u0cbf": "\u00a6", "\u0caa\u0cc0": "\u00a6\u00c3", "\u0caa\u0cc1": "\u00a5\u00c0\u00c5", "\u0caa\u0cc2": "\u00a5\u00c0\u00c7", "\u0caa\u0cc3": "\u00a5\u00c0\u00c8", "\u0caa\u0cc6": "\u00a5\u00c9", "\u0caa\u0cc7": "\u00a5\u00c9\u00c3", "\u0caa\u0cc8": "\u00a5\u00c9\u00ca", "\u0caa\u0cca": "\u00a5\u00c9\u00c7", "\u0caa\u0ccb": "\u00a5\u00c9\u00c7\u00c3", "\u0caa\u0ccc": "\u00a5\u00cb",
  "\u0cab\u0ccd": "\u00a5s\u00ef", "\u0cab": "\u00a5s\u00c0", "\u0cab\u0cbe": "\u00a5s\u00c1", "\u0cab\u0cbf": "\u00a6\u00fc", "\u0cab\u0cc0": "\u00a6\u00fc\u00c3", "\u0cab\u0cc1": "\u00a5s\u00c0\u00c5", "\u0cab\u0cc2": "\u00a5s\u00c0\u00c7", "\u0cab\u0cc3": "\u00a5s\u00c0\u00c8", "\u0cab\u0cc6": "\u00a5s\u00c9", "\u0cab\u0cc7": "\u00a5s\u00c9\u00c3", "\u0cab\u0cc8": "\u00a5s\u00c9\u00ca", "\u0cab\u0cca": "\u00a5s\u00c9\u00c7", "\u0cab\u0ccb": "\u00a5s\u00c9\u00c7\u00c3", "\u0cab\u0ccc": "\u00a5s\u00cb",
  "\u0cac\u0ccd": "\u00a8\u00ef", "\u0cac": "\u00a7", "\u0cac\u0cbe": "\u00a8\u00c1", "\u0cac\u0cbf": "\u00a9", "\u0cac\u0cc0": "\u00a9\u00c3", "\u0cac\u0cc1": "\u00a7\u00c4", "\u0cac\u0cc2": "\u00a7\u00c6", "\u0cac\u0cc3": "\u00a7\u00c8", "\u0cac\u0cc6": "\u00a8\u00c9", "\u0cac\u0cc7": "\u00a8\u00c9\u00c3", "\u0cac\u0cc8": "\u00a8\u00c9\u00ca", "\u0cac\u0cca": "\u00a8\u00c9\u00c6", "\u0cac\u0ccb": "\u00a8\u00c9\u00c6\u00c3", "\u0cac\u0ccc": "\u00a8\u00cb",
  "\u0cad\u0ccd": "\u00a8s\u00ef", "\u0cad": "\u00a8s\u00c0", "\u0cad\u0cbe": "\u00a8s\u00c1", "\u0cad\u0cbf": "\u00a9\u00fc", "\u0cad\u0cc0": "\u00a9\u00fc\u00c3", "\u0cad\u0cc1": "\u00a8s\u00c0\u00c4", "\u0cad\u0cc2": "\u00a8s\u00c0\u00c6", "\u0cad\u0cc3": "\u00a8s\u00c0\u00c8", "\u0cad\u0cc6": "\u00a8s\u00c9", "\u0cad\u0cc7": "\u00a8s\u00c9\u00c3", "\u0cad\u0cc8": "\u00a8s\u00c9\u00ca", "\u0cad\u0cca": "\u00a8s\u00c9\u00c6", "\u0cad\u0ccb": "\u00a8s\u00c9\u00c6\u00c3", "\u0cad\u0ccc": "\u00a8s\u00cb",
  "\u0cae\u0ccd": "\u00aa\u00c0i\u00ef", "\u0cae": "\u00aa\u00c0\u00c4", "\u0cae\u0cbe": "\u00aa\u00c0i\u00c1", "\u0cae\u0cbf": "\u00ab\u00c4", "\u0cae\u0cc0": "\u00ab\u00c4\u00c3", "\u0cae\u0cc1": "\u00aa\u00c0\u00c4\u00c4", "\u0cae\u0cc2": "\u00aa\u00c0\u00c4\u00c6", "\u0cae\u0cc3": "\u00aa\u00c0\u00c4\u00c8", "\u0cae\u0cc6": "\u00aa\u00c9\u00c4", "\u0cae\u0cc7": "\u00aa\u00c9\u00c4\u00c3", "\u0cae\u0cc8": "\u00aa\u00c9\u00c4\u00ca", "\u0cae\u0cca": "\u00aa\u00c9\u00c6", "\u0cae\u0ccb": "\u00aa\u00c9\u00c6\u00c3", "\u0cae\u0ccc": "\u00aa\u00c0i\u00cb",
  "\u0caf\u0ccd": "Ai\u00c0i\u00ef", "\u0caf": "Ai\u00c0\u00c4", "\u0caf\u0cbe": "Ai\u00c0i\u00c1", "\u0caf\u0cbf": "\u00ac\u00c4", "\u0caf\u0cc0": "\u00ac\u00c4\u00c3", "\u0caf\u0cc1": "Ai\u00c0\u00c4\u00c4", "\u0caf\u0cc2": "Ai\u00c0\u00c4\u00c6", "\u0caf\u0cc3": "Ai\u00c0\u00c4\u00c8", "\u0caf\u0cc6": "Ai\u00c9\u00c4", "\u0caf\u0cc7": "Ai\u00c9\u00c4\u00c3", "\u0caf\u0cc8": "Ai\u00c9\u00c4\u00ca", "\u0caf\u0cca": "Ai\u00c9\u00c6", "\u0caf\u0ccb": "Ai\u00c9\u00c6\u00c3", "\u0caf\u0ccc": "Ai\u00c0i\u00cb",
  "\u0cb0\u0ccd": "g\u00ef", "\u0cb0": "g\u00c0", "\u0cb0\u0cbe": "g\u00c1", "\u0cb0\u0cbf": "j", "\u0cb0\u0cc0": "j\u00c3", "\u0cb0\u0cc1": "g\u00c0\u00c4", "\u0cb0\u0cc2": "g\u00c0\u00c6", "\u0cb0\u0cc3": "g\u00c0\u00c8", "\u0cb0\u0cc6": "g\u00c9", "\u0cb0\u0cc7": "g\u00c9\u00c3", "\u0cb0\u0cc8": "g\u00c9\u00ca", "\u0cb0\u0cca": "g\u00c9\u00c6", "\u0cb0\u0ccb": "g\u00c9\u00c6\u00c3", "\u0cb0\u0ccc": "g\u00cb",
  "\u0cb2\u0ccd": "\u00af\u00ef", "\u0cb2": "\u00ae", "\u0cb2\u0cbe": "\u00af\u00c1", "\u0cb2\u0cbf": "\u00b0", "\u0cb2\u0cc0": "\u00b0\u00c3", "\u0cb2\u0cc1": "\u00ae\u00c4", "\u0cb2\u0cc2": "\u00ae\u00c6", "\u0cb2\u0cc3": "\u00ae\u00c8", "\u0cb2\u0cc6": "\u00af\u00c9", "\u0cb2\u0cc7": "\u00af\u00c9\u00c3", "\u0cb2\u0cc8": "\u00af\u00c9\u00ca", "\u0cb2\u0cca": "\u00af\u00c9\u00c6", "\u0cb2\u0ccb": "\u00af\u00c9\u00c6\u00c3", "\u0cb2\u0ccc": "\u00af\u00cb",
  "\u0cb5\u0ccd": "\u00aa\u00ef", "\u0cb5": "\u00aa\u00c0", "\u0cb5\u0cbe": "\u00aa\u00c1", "\u0cb5\u0cbf": "\u00ab", "\u0cb5\u0cc0": "\u00ab\u00c3", "\u0cb5\u0cc1": "\u00aa\u00c0\u00c5", "\u0cb5\u0cc2": "\u00aa\u00c0\u00c7", "\u0cb5\u0cc3": "\u00aa\u00c0\u00c8", "\u0cb5\u0cc6": "\u00aa\u00c9", "\u0cb5\u0cc7": "\u00aa\u00c9\u00c3", "\u0cb5\u0cc8": "\u00aa\u00c9\u00ca", "\u0cb5\u0cca": "\u00aa\u00c9\u00c7", "\u0cb5\u0ccb": "\u00aa\u00c9\u00c7\u00c3", "\u0cb5\u0ccc": "\u00aa\u00cb",
  "\u0cb6\u0ccd": "\u00b1\u00ef", "\u0cb6": "\u00b1\u00c0", "\u0cb6\u0cbe": "\u00b1\u00c1", "\u0cb6\u0cbf": "\u00b2", "\u0cb6\u0cc0": "\u00b2\u00c3", "\u0cb6\u0cc1": "\u00b1\u00c0\u00c4", "\u0cb6\u0cc2": "\u00b1\u00c0\u00c6", "\u0cb6\u0cc3": "\u00b1\u00c0\u00c8", "\u0cb6\u0cc6": "\u00b1\u00c9", "\u0cb6\u0cc7": "\u00b1\u00c9\u00c3", "\u0cb6\u0cc8": "\u00b1\u00c9\u00ca", "\u0cb6\u0cca": "\u00b1\u00c9\u00c6", "\u0cb6\u0ccb": "\u00b1\u00c9\u00c6\u00c3", "\u0cb6\u0ccc": "\u00b1\u00cb",
  "\u0cb7\u0ccd": "\u03bc\u00ef", "\u0cb7": "\u03bc\u00c0", "\u0cb7\u0cbe": "\u03bc\u00c1", "\u0cb7\u0cbf": "\u00b6", "\u0cb7\u0cc0": "\u00b6\u00c3", "\u0cb7\u0cc1": "\u03bc\u00c0\u00c4", "\u0cb7\u0cc2": "\u03bc\u00c0\u00c6", "\u0cb7\u0cc3": "\u03bc\u00c0\u00c8", "\u0cb7\u0cc6": "\u03bc\u00c9", "\u0cb7\u0cc7": "\u03bc\u00c9\u00c3", "\u0cb7\u0cc8": "\u03bc\u00c9\u00ca", "\u0cb7\u0cca": "\u03bc\u00c9\u00c6", "\u0cb7\u0ccb": "\u03bc\u00c9\u00c6\u00c3", "\u0cb7\u0ccc": "\u03bc\u00cb",
  "\u0cb8\u0ccd": "\u00b8\u00ef", "\u0cb8": "\u00b8\u00c0", "\u0cb8\u0cbe": "\u00b8\u00c1", "\u0cb8\u0cbf": "\u00b9", "\u0cb8\u0cc0": "\u00b9\u00c3", "\u0cb8\u0cc1": "\u00b8\u00c0\u00c4", "\u0cb8\u0cc2": "\u00b8\u00c0\u00c6", "\u0cb8\u0cc3": "\u00b8\u00c0\u00c8", "\u0cb8\u0cc6": "\u00b8\u00c9", "\u0cb8\u0cc7": "\u00b8\u00c9\u00c3", "\u0cb8\u0cc8": "\u00b8\u00c9\u00ca", "\u0cb8\u0cca": "\u00b8\u00c9\u00c6", "\u0cb8\u0ccb": "\u00b8\u00c9\u00c6\u00c3", "\u0cb8\u0ccc": "\u00b8\u00cb",
  "\u0cb9\u0ccd": "\u00ba\u00ef", "\u0cb9": "\u00ba\u00c0", "\u0cb9\u0cbe": "\u00ba\u00c1", "\u0cb9\u0cbf": "\u00bb", "\u0cb9\u0cc0": "\u00bb\u00c3", "\u0cb9\u0cc1": "\u00ba\u00c0\u00c4", "\u0cb9\u0cc2": "\u00ba\u00c0\u00c6", "\u0cb9\u0cc3": "\u00ba\u00c0\u00c8", "\u0cb9\u0cc6": "\u00ba\u00c9", "\u0cb9\u0cc7": "\u00ba\u00c9\u00c3", "\u0cb9\u0cc8": "\u00ba\u00c9\u00ca", "\u0cb9\u0cca": "\u00ba\u00c9\u00c6", "\u0cb9\u0ccb": "\u00ba\u00c9\u00c6\u00c3", "\u0cb9\u0ccc": "\u00ba\u00cb",
  "\u0cb3\u0ccd": "\u00bc\u00ef", "\u0cb3": "\u00bc\u00c0", "\u0cb3\u0cbe": "\u00bc\u00c1", "\u0cb3\u0cbf": "\u00bd", "\u0cb3\u0cc0": "\u00bd\u00c3", "\u0cb3\u0cc1": "\u00bc\u00c0\u00c4", "\u0cb3\u0cc2": "\u00bc\u00c0\u00c6", "\u0cb3\u0cc3": "\u00bc\u00c0\u00c8", "\u0cb3\u0cc6": "\u00bc\u00c9", "\u0cb3\u0cc7": "\u00bc\u00c9\u00c3", "\u0cb3\u0cc8": "\u00bc\u00c9\u00ca", "\u0cb3\u0cca": "\u00bc\u00c9\u00c6", "\u0cb3\u0ccb": "\u00bc\u00c9\u00c6\u00c3", "\u0cb3\u0ccc": "\u00bc\u00cb",
  "\u0cb1\u0ccd\u200c": "\u00be\u00f5\u00ef", "\u0cb1": "\u00be\u00f5\u00c0", "\u0cb1\u0cbe": "\u00be\u00f5\u00c1", "\u0cb1\u0cbf": "\u00be\u00c2", "\u0cb1\u0cc1": "\u00be\u00c4", "\u0cb1\u0cc2": "\u00be\u00c6", "\u0cb1\u0cc3": "\u00be\u00c8", "\u0cb1\u0cc6": "\u00be\u00f5\u00c9", "\u0cb1\u0cc7": "\u00be\u00f5\u00c9\u00c3", "\u0cb1\u0cc8": "\u00be\u00f5\u00c9\u00ca", "\u0cb1\u0cca": "\u00be\u00f5\u00c9\u00c6", "\u0cb1\u0ccb": "\u00be\u00f5\u00c9\u00c6\u00c3", "\u0cb1\u0ccc": "\u00be\u00f5\u00cb",
  "\u0cde\u0ccd\u200c": "\u00bf\u00f5\u00ef", "\u0cde": "\u00bf\u00f5\u00c0", "\u0cde\u0cbe": "\u00bf\u00f5\u00c1", "\u0cde\u0cbf": "\u00bf\u00c2", "\u0cde\u0cc1": "\u00bf\u00c4", "\u0cde\u0cc2": "\u00bf\u00c6", "\u0cde\u0cc3": "\u00bf\u00c8", "\u0cde\u0cc6": "\u00bf\u00f5\u00c9", "\u0cde\u0cc7": "\u00bf\u00f5\u00c9\u00c3", "\u0cde\u0cc8": "\u00bf\u00f5\u00c9\u00ca", "\u0cde\u0cca": "\u00bf\u00f5\u00c9\u00c6", "\u0cde\u0ccb": "\u00bf\u00f5\u00c9\u00c6\u00c3", "\u0cde\u0ccc": "\u00bf\u00f5\u00cb",
  "\u0ccd\u0c95": "\u00cc", "\u0ccd\u0c96": "\u00cd", "\u0ccd\u0c97": "\u00ce", "\u0ccd\u0c98": "\u00cf", "\u0ccd\u0c99": "\u00d0",
  "\u0ccd\u0c9a": "\u00d1", "\u0ccd\u0c9b": "\u00d2", "\u0ccd\u0c9c": "\u00d3", "\u0ccd\u0c9d": "\u00d4", "\u0ccd\u0c9e": "\u00d5",
  "\u0ccd\u0c9f": "\u00d6", "\u0ccd\u0ca0": "\u00d7", "\u0ccd\u0ca1": "\u00d8", "\u0ccd\u0ca2": "\u00d9", "\u0ccd\u0ca3": "\u00da",
  "\u0ccd\u0ca4": "\u00db", "\u0ccd\u0ca5": "\u00dc", "\u0ccd\u0ca6": "\u00dd", "\u0ccd\u0ca7": "\u00de", "\u0ccd\u0ca8": "\u00df",
  "\u0ccd\u0caa": "\u00e0", "\u0ccd\u0cab": "\u00e1", "\u0ccd\u0cac": "\u00e2", "\u0ccd\u0cad": "\u00e3", "\u0ccd\u0cae": "\u00e4",
  "\u0ccd\u0caf": "\u00e5", "\u0ccd\u0cb0": "\u00e6", "\u0ccd\u0cb2": "\u00e8", "\u0ccd\u0cb5": "\u00e9", "\u0ccd\u0cb6": "\u00ea",
  "\u0ccd\u0cb7": "\u00eb", "\u0ccd\u0cb8": "\u00ec", "\u0ccd\u0cb9": "\u00ed", "\u0ccd\u0cb3": "\u00ee", "\u0ccd\u0cb1": "\u00f9", "\u0ccd\u0cde": "\u00fa"
};

const U2A_VOWELS = [
  "\u0c85", "\u0c86", "\u0c87", "\u0c88", "\u0c89", "\u0c8a",
  "\u0c8b", "\u0ce0", "\u0c8e", "\u0c8f", "\u0c90", "\u0c92",
  "\u0c93", "\u0c94", "\u0c85\u0c82", "\u0c85\u0c83"
];

const U2A_ANUSVARA_VISARGA = ["\u0c82", "\u0c83"];
const U2A_HALANT = "\u0ccd";
const U2A_ARKAVATTU = "\u00f0";

const U2A_PREV_VALUE_CHARS = [
  "cbe", "cbf", "cc0", "cc1",
  "cc2", "cc3", "cc4", "cc6",
  "cc7", "cc8", "cca", "ccb",
  "ccc", "ccd", "c82", "c83", "200d"
];

const REGEX_UNI_VOWEL_PLUS_ANUSVARA_VISARGA = /^([ಅಆಇಈಉಊಋೠಎಏಐಒಓಔಅಂಅಃ])([ಂಃ])$/;
const REGEX_UNI_CONSONANT_PLUS_VOWEL = /^([ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?$/;
const REGEX_UNI_REPH_WITHOUT_ZWJ = /^([ರ])(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])?(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])?([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?$/;
const REGEX_UNI_VATTAKSHARA = /^([ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])‍?(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])?(್[ಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಲವಶಷಸಹಳಱೞ])?([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?([್ಾಿೀುೂೃೆೇೈೊೋೌಂಃ])?$/;

function getKannadaGraphemes(txt: string): string[] {
  const hexval = (i: number) => txt[i].charCodeAt(0).toString(16);
  const prev_hexval = (i: number) => (txt[i - 1] ? txt[i - 1].charCodeAt(0).toString(16) : '');
  const iskn = (i: number) => /^[\u0C80-\u0CFF\u200D]+$/.test(txt[i]);

  const l = txt.length;
  const out: string[] = [];

  for (let i = 0; i < l; i++) {
    const cond = U2A_PREV_VALUE_CHARS.indexOf(hexval(i)) !== -1 || prev_hexval(i) === 'ccd';
    if (out.length > 0 && iskn(i) && cond) {
      out[out.length - 1] += txt[i];
    } else {
      out.push(txt[i]);
    }
  }
  return out;
}

function substituteU2AAscii(
  base: string,
  dep_vowel: (string | undefined)[],
  vattaksharagalu: (string | undefined)[],
  append_chars?: string[]
): string {
  let op = '';
  if (dep_vowel[0] === undefined) {
    op += U2A_MAP[base] || base;
  } else {
    if (U2A_ANUSVARA_VISARGA.indexOf(dep_vowel[0]) === -1) {
      op += U2A_MAP[base + dep_vowel[0]] || (U2A_MAP[base] || base);
    } else {
      op += U2A_MAP[base] || base;
    }
  }

  for (let i = 0; i < vattaksharagalu.length; i++) {
    const v = vattaksharagalu[i];
    if (v !== undefined) {
      op += U2A_MAP[v] || v;
    }
  }

  if (dep_vowel[0] && U2A_ANUSVARA_VISARGA.indexOf(dep_vowel[0]) !== -1) {
    op += U2A_MAP[dep_vowel[0]] || dep_vowel[0];
  }

  if (dep_vowel[1] !== undefined) {
    op += U2A_MAP[dep_vowel[1]] || dep_vowel[1];
  }

  if (append_chars !== undefined) {
    op += append_chars.join('');
  }
  return op;
}

function rearrangeAndReplaceU2A(inp: string): string {
  if (U2A_VOWELS.indexOf(inp) !== -1) {
    return U2A_MAP[inp] || inp;
  }

  const vowelMatch = inp.match(REGEX_UNI_VOWEL_PLUS_ANUSVARA_VISARGA);
  if (vowelMatch) {
    return (U2A_MAP[vowelMatch[1]] || vowelMatch[1]) + (U2A_MAP[vowelMatch[2]] || vowelMatch[2]);
  }

  const consVowelMatch = inp.match(REGEX_UNI_CONSONANT_PLUS_VOWEL);
  if (consVowelMatch) {
    return substituteU2AAscii(consVowelMatch[1], [consVowelMatch[2], consVowelMatch[3]], []);
  }

  const rephMatch = inp.match(REGEX_UNI_REPH_WITHOUT_ZWJ);
  if (rephMatch) {
    const base = rephMatch[2].replace(U2A_HALANT, '');
    const append_chars = [U2A_ARKAVATTU];
    return substituteU2AAscii(base, [rephMatch[5], rephMatch[6]], [rephMatch[3], rephMatch[4]], append_chars);
  }

  const vattuMatch = inp.match(REGEX_UNI_VATTAKSHARA);
  if (vattuMatch) {
    return substituteU2AAscii(vattuMatch[1], [vattuMatch[5], vattuMatch[6]], [vattuMatch[2], vattuMatch[3], vattuMatch[4]]);
  }

  return inp;
}

function u2aDeergaHandle(txt: string): string {
  txt = txt.replace(
    /(Ã)([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])/g,
    (_match, g1, g2, g3, g4) => g2 + g3 + g4 + g1
  );
  txt = txt.replace(
    /(Ã)([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])/g,
    (_match, g1, g2, g3) => g2 + g3 + g1
  );
  txt = txt.replace(
    /(Ã)([ÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæèéêëìíîùú])/g,
    (_match, g1, g2) => g2 + g1
  );
  return txt;
}

function processU2AWord(word: string, english_numbers = false): string {
  const letters = getKannadaGraphemes(word);
  const converted: string[] = letters.map((letter) => rearrangeAndReplaceU2A(letter));

  let txt = converted.join('').replace(/ಂ/g, 'A').replace(/ಃ/g, 'B');

  if (!english_numbers) {
    txt = toAsciiNumbers(txt);
  }

  txt = txt.replace(/\u200c/g, '');
  return txt;
}

// ----------------------------------------------------------------------------
// Number & Whitespace Helpers
// ----------------------------------------------------------------------------

export function toUnicodeNumbers(txt: string): string {
  return txt
    .replace(/0/g, '೦').replace(/1/g, '೧').replace(/2/g, '೨').replace(/3/g, '೩').replace(/4/g, '೪')
    .replace(/5/g, '೫').replace(/6/g, '೬').replace(/7/g, '೭').replace(/8/g, '೮').replace(/9/g, '೯');
}

export function toAsciiNumbers(txt: string): string {
  return txt
    .replace(/೦/g, '0').replace(/೧/g, '1').replace(/೨/g, '2').replace(/೩/g, '3').replace(/೪/g, '4')
    .replace(/೫/g, '5').replace(/೬/g, '6').replace(/೭/g, '7').replace(/೮/g, '8').replace(/೯/g, '9');
}

export function cleanExtraSpaces(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

// ----------------------------------------------------------------------------
// Font Auto-Detection
// ----------------------------------------------------------------------------

export type DetectedFontType = 'unicode' | 'nudi' | 'shree-lipi' | 'unknown';

export function detectKannadaFont(text: string): DetectedFontType {
  if (!text || !text.trim()) return 'unknown';

  // Check Unicode Kannada block (\u0C80 - \u0CFF)
  const unicodeMatches = text.match(/[\u0C80-\u0CFF]/g);
  if (unicodeMatches && unicodeMatches.length > 0) {
    return 'unicode';
  }

  // Check Shree-Lipi distinctive glyphs
  const shreeDistinctive = /[\u00ED\u00DD\u00DF\u00E1\u00E6\u00DE\u00BF\u00FB\u00FD\u00FE\u00A4\u00A7\u00AA\u0153\u00B0\u00B3\u00BA\u00BD\u00BE\u00C2\u00C5\u00C9\u00CC\u00CF\u00D2\u00D5\u00D8\u00DB\u00EC]/g;
  const shreeMatches = text.match(shreeDistinctive);

  // Check Nudi / Baraha distinctive glyphs
  const nudiDistinctive = /(PÀ|£À|¸À|¨É|gÀ|ªÀ|UÀ|ZÀ|vÀ|zÀ|¥À|§|¯Á|±À|µÀ|ºÀ|¼À|Ì|Í|Î|Ï|Ð|Ñ|Ò|Ó|Ô|Õ|Ö|×|Ø|Ù|Ú|Û|Ü|Ý|Þ|ß|à|á|â|ã|ä|å|æ|è|é|ê|ë|ì|í|î|ù|ú|ð|Ã|Æ|Ê)/g;
  const nudiMatches = text.match(nudiDistinctive);

  const shreeScore = shreeMatches ? shreeMatches.length : 0;
  const nudiScore = nudiMatches ? nudiMatches.length : 0;

  if (shreeScore > nudiScore && shreeScore > 0) {
    return 'shree-lipi';
  }
  if (nudiScore > 0) {
    return 'nudi';
  }

  return 'unknown';
}

// ----------------------------------------------------------------------------
// Public Conversion Functions
// ----------------------------------------------------------------------------

export function kannadaAsciiToUnicode(asciiText: string, options: KannadaConversionOptions = {}): string {
  if (!asciiText) return '';
  let text = asciiText;
  if (options.removeExtraSpaces) {
    text = cleanExtraSpaces(text);
  }

  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    const words = line.split(' ');
    const op: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wl = w.length;
      if (wl > 0 && w[0] === '$' && w[wl - 1] === '$') {
        op.push(w.replace(/^\$/g, '').replace(/\$$/g, ''));
      } else if (w.length > 0) {
        op.push(processA2UWord(w, options.englishNumbers));
      }
    }
    return op.join(' ');
  });

  let result = processedLines.join('\n');
  if (options.removeExtraSpaces) {
    result = cleanExtraSpaces(result);
  }
  return result;
}

export function kannadaUnicodeToAscii(unicodeText: string, options: KannadaConversionOptions = {}): string {
  if (!unicodeText) return '';
  let text = unicodeText;
  if (options.removeExtraSpaces) {
    text = cleanExtraSpaces(text);
  }

  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    const words = line.split(' ');
    const op: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wl = w.length;
      if (wl > 0 && w[0] === '$' && w[wl - 1] === '$') {
        op.push(w.replace(/^\$/g, '').replace(/\$$/g, ''));
      } else if (w.length > 0) {
        op.push(processU2AWord(w, options.englishNumbers));
      }
    }
    return u2aDeergaHandle(op.join(' '));
  });

  let result = processedLines.join('\n');
  if (options.removeExtraSpaces) {
    result = cleanExtraSpaces(result);
  }
  return result;
}

export { shreeLipiToUnicode };

// Unified multi-font conversion dispatcher
export function convertKannadaText(
  inputText: string,
  mode: FontMode = 'auto',
  options: KannadaConversionOptions = {}
): { outputText: string; effectiveMode: FontMode; detectedType: DetectedFontType } {
  if (!inputText) {
    return { outputText: '', effectiveMode: mode, detectedType: 'unknown' };
  }

  let effectiveMode = mode;
  const detectedType = detectKannadaFont(inputText);

  if (mode === 'auto') {
    if (detectedType === 'unicode') {
      effectiveMode = 'unicode-to-nudi';
    } else if (detectedType === 'shree-lipi') {
      effectiveMode = 'shree-to-unicode';
    } else {
      effectiveMode = 'nudi-to-unicode';
    }
  }

  let outputText = '';
  switch (effectiveMode) {
    case 'shree-to-unicode':
      outputText = shreeLipiToUnicode(inputText, options);
      break;
    case 'unicode-to-nudi':
      outputText = kannadaUnicodeToAscii(inputText, options);
      break;
    case 'nudi-to-unicode':
    default:
      outputText = kannadaAsciiToUnicode(inputText, options);
      break;
  }

  return { outputText, effectiveMode, detectedType };
}
