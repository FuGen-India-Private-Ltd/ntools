// Bilingual UI Localization Dictionary (English & Kannada)

export type Language = 'en' | 'kn';

export interface TranslationSchema {
  appTitle: string;
  appSubtitle: string;
  tabLiveText: string;
  tabBatchDocs: string;
  fontModeLabel: string;
  modeAuto: string;
  modeNudiToUnicode: string;
  modeShreeToUnicode: string;
  modeUnicodeToNudi: string;
  autoDetected: string;
  removeExtraSpaces: string;
  quickSamples: string;
  inputTitle: string;
  outputTitle: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
  resetBtn: string;
  copyBtn: string;
  copiedBtn: string;
  pasteBtn: string;
  downloadTxtBtn: string;
  downloadDocxBtn: string;
  downloadPdfBtn: string;
  statsChars: string;
  statsWords: string;
  statsLines: string;
  statsSpeed: string;
  batchTitle: string;
  batchSubtitle: string;
  dragDropTitle: string;
  dragDropDesc: string;
  browseFiles: string;
  convertFileBtn: string;
  convertingStatus: string;
  conversionSuccess: string;
  downloadConvertedPptx: string;
  downloadConvertedPdf: string;
  downloadConvertedDocx: string;
  downloadConvertedTxt: string;
  slideCountLabel: string;
  footerSecurity: string;
  themeToggleDark: string;
  themeToggleLight: string;
  langToggle: string;
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    appTitle: 'nTools',
    appSubtitle: 'All-in-One Utility & Productivity Suite',
    tabLiveText: 'Live Text Converter',
    tabBatchDocs: 'Document & Presentation Studio (.docx, .pptx ➔ .pdf)',
    fontModeLabel: 'Conversion Mode',
    modeAuto: '✨ Auto-Detect Font',
    modeNudiToUnicode: 'Nudi / Baraha ASCII ➔ Unicode',
    modeShreeToUnicode: 'Shree-Lipi (Shree-Kan) ➔ Unicode',
    modeUnicodeToNudi: 'Unicode ➔ Nudi / Baraha ASCII',
    autoDetected: 'Auto-Detected',
    removeExtraSpaces: 'Remove extra spaces',
    quickSamples: 'Quick Samples',
    inputTitle: 'Input / Source Text',
    outputTitle: 'Converted Output (Unicode)',
    inputPlaceholder: 'Type or paste text here (Nudi, Baraha, Shree-Lipi or Unicode)...',
    outputPlaceholder: 'Converted Kannada text will appear live here...',
    resetBtn: 'Clear / Reset',
    copyBtn: 'Copy Output',
    copiedBtn: 'Copied!',
    pasteBtn: 'Paste',
    downloadTxtBtn: 'Download .txt',
    downloadDocxBtn: 'Download .docx',
    downloadPdfBtn: 'Download .pdf',
    statsChars: 'Characters',
    statsWords: 'Words',
    statsLines: 'Lines',
    statsSpeed: 'Latency',
    batchTitle: 'Document & Presentation Converter',
    batchSubtitle: 'Upload Word (.docx), PowerPoint (.pptx/.ppt), or Text (.txt) files. 100% offline.',
    dragDropTitle: 'Drop files here or click to browse',
    dragDropDesc: 'Supports .docx, .pptx, .ppt, and .txt files up to 50MB',
    browseFiles: 'Browse File',
    convertFileBtn: 'Process & Convert File',
    convertingStatus: 'Processing document...',
    conversionSuccess: 'Conversion Complete!',
    downloadConvertedPptx: 'Download Converted Presentation (.pptx)',
    downloadConvertedPdf: 'Download Generated PDF (.pdf)',
    downloadConvertedDocx: 'Download Converted Word Document (.docx)',
    downloadConvertedTxt: 'Download Converted Text (.txt)',
    slideCountLabel: 'Slides Processed',
    footerSecurity: '100% Client-Side Offline • No Data Leaves Your Device',
    themeToggleDark: 'Switch to Dark Mode',
    themeToggleLight: 'Switch to Light Mode',
    langToggle: 'ಕನ್ನಡ UI',
  },
  kn: {
    appTitle: 'nTools',
    appSubtitle: 'ಆಲ್-ಇನ್-ಒನ್ ಯುಟಿಲಿಟಿ ಸೂಟ್ • 100% ಆಫ್‌ಲೈನ್',
    tabLiveText: 'ಲೈವ್ ಪಠ್ಯ ಪರಿವರ್ತಕ',
    tabBatchDocs: 'ದಾಖಲೆ & ಪ್ರೆಸೆಂಟೇಶನ್ ಸ್ಟುಡಿಯೋ (.docx, .pptx ➔ .pdf)',
    fontModeLabel: 'ಪರಿವರ್ತನೆ ವಿಧಾನ',
    modeAuto: '✨ ಸ್ವಯಂ ಪತ್ತೆ (Auto-Detect)',
    modeNudiToUnicode: 'ನುಡಿ / ಬರಹ ಆಸ್ಕಿ ➔ ಯುನಿಕೋಡ್',
    modeShreeToUnicode: 'ಶ್ರೀ-ಲಿಪಿ (Shree-Kan) ➔ ಯುನಿಕೋಡ್',
    modeUnicodeToNudi: 'ಯುನಿಕೋಡ್ ➔ ನುಡಿ / ಬರಹ ಆಸ್ಕಿ',
    autoDetected: 'ಸ್ವಯಂ ಪತ್ತೆಯಾಗಿದೆ',
    removeExtraSpaces: 'ಹೆಚ್ಚುವರಿ ಜಾಗಗಳನ್ನು ತೆಗೆದುಹಾಕಿ',
    quickSamples: 'ಮಾದರಿಗಳು',
    inputTitle: 'ಮೂಲ ಪಠ್ಯ (ಇನ್‌ಪುಟ್)',
    outputTitle: 'ಪರಿವರ್ತಿತ ಪಠ್ಯ (ಯುನಿಕೋಡ್ ಔಟ್‌ಪುಟ್)',
    inputPlaceholder: 'ಇಲ್ಲಿ ನುಡಿ, ಬರಹ, ಶ್ರೀ-ಲಿಪಿ ಅಥವಾ ಯುನಿಕೋಡ್ ಪಠ್ಯವನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಪೇಸ್ಟ್ ಮಾಡಿ...',
    outputPlaceholder: 'ಪರಿವರ್ತಿತ ಕನ್ನಡ ಪಠ್ಯವು ಇಲ್ಲಿ ನೇರವಾಗಿ ಮೂಡಿಬರುತ್ತದೆ...',
    resetBtn: 'ತೆರವುಗೊಳಿಸಿ / ಮರುಹೊಂದಿಸಿ',
    copyBtn: 'ಕಾಪಿ ಮಾಡಿ',
    copiedBtn: 'ಕಾಪಿಯಾಗಿದೆ!',
    pasteBtn: 'ಪೇಸ್ಟ್',
    downloadTxtBtn: '.txt ಡೌನ್‌ಲೋಡ್',
    downloadDocxBtn: '.docx ಡೌನ್‌ಲೋಡ್',
    downloadPdfBtn: '.pdf ಡೌನ್‌ಲೋಡ್',
    statsChars: 'ಅಕ್ಷರಗಳು',
    statsWords: 'ಪದಗಳು',
    statsLines: 'ಸಾಲುಗಳು',
    statsSpeed: 'ವೇಗ',
    batchTitle: 'ದಾಖಲೆ & ಪ್ರೆಸೆಂಟೇಶನ್ ಪರಿವರ್ತಕ',
    batchSubtitle: 'ವರ್ಡ್ (.docx), ಪವರ್‌ಪಾಯಿಂಟ್ (.pptx/.ppt), ಅಥವಾ ಪಠ್ಯ (.txt) ಫೈಲ್‌ಗಳನ್ನು ಪರಿವರ್ತಿಸಿ. 100% ಆಫ್‌ಲೈನ್.',
    dragDropTitle: 'ಫೈಲ್‌ಗಳನ್ನು ಇಲ್ಲಿ ಎಳೆಯಿರಿ ಅಥವಾ ಆಯ್ಕೆ ಮಾಡಿ',
    dragDropDesc: '.docx, .pptx, .ppt, ಮತ್ತು .txt ಫೈಲ್‌ಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ (ಗರಿಷ್ಠ 50MB)',
    browseFiles: 'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ',
    convertFileBtn: 'ದಾಖಲೆಯನ್ನು ಪರಿವರ್ತಿಸಿ',
    convertingStatus: 'ದಾಖಲೆಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...',
    conversionSuccess: 'ಪರಿವರ್ತನೆ ಯಶಸ್ವಿಯಾಗಿದೆ!',
    downloadConvertedPptx: 'ಪರಿವರ್ತಿತ ಪ್ರೆಸೆಂಟೇಶನ್ ಡೌನ್‌ಲೋಡ್ (.pptx)',
    downloadConvertedPdf: 'ರಚಿಸಲಾದ PDF ಡೌನ್‌ಲೋಡ್ (.pdf)',
    downloadConvertedDocx: 'ಪರಿವರ್ತಿತ ವರ್ಡ್ ಡಾಕ್ಯುಮೆಂಟ್ ಡೌನ್‌ಲೋಡ್ (.docx)',
    downloadConvertedTxt: 'ಪರಿವರ್ತಿತ ಪಠ್ಯ ಫೈಲ್ ಡೌನ್‌ಲೋಡ್ (.txt)',
    slideCountLabel: 'ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾದ ಸ್ಲೈಡ್‌ಗಳು',
    footerSecurity: '100% ಆಫ್‌ಲೈನ್ & ಸುರಕ್ಷಿತ • ಯಾವುದೇ ಡೇಟಾ ನಿಮ್ಮ ಸಾಧನವನ್ನು ಬಿಟ್ಟು ಹೋಗುವುದಿಲ್ಲ',
    themeToggleDark: 'ಡಾರ್ಕ್ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ',
    themeToggleLight: 'ಲೈಟ್ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ',
    langToggle: 'English UI',
  },
};
