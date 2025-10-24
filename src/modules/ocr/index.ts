import sharp from 'sharp';
import { createWorker, PSM, RecognizeResult } from 'tesseract.js';
import fs from 'fs';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { patterns } from '@common/constants';

export async function extractBloodTestData(
  inputPath: string,
): Promise<BloodTestData> {
  const cleaned = inputPath.replace('.png', '_clean.png');

  await sharp(inputPath)
    .grayscale()
    .normalise()
    .sharpen()
    .resize({ width: 3000 })
    .toFile(cleaned);

  console.log('✓ Preprocessing complete');

  const worker = await createWorker(['ukr', 'eng'], 1);

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
  });

  const result: RecognizeResult = await worker.recognize(cleaned);
  await worker.terminate();

  const rawOcrPath = inputPath.replace('.png', '_ocr_raw.txt');
  fs.writeFileSync(rawOcrPath, result.data.text);

  return parseBloodTest(result.data.text);
}

function parseBloodTest(text: string): BloodTestData {
  const data: BloodTestData = {
    patientInfo: {},
    lipids: {},
    bloodAll: {},
    kidneyFunction: {},
    liverFunction: {},
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1];
      const numValue = normalizeNumber(value, key);

      if (['age', 'sex', 'dob'].includes(key)) {
        data.patientInfo[key] = key === 'age' ? numValue : value;
      } else if (
        [
          'triglycerides',
          'cholesterol',
          'hdl',
          'ldl',
          'vldl',
          'atherogenicCoeff',
        ].includes(key)
      ) {
        data.lipids[key] = numValue;
      } else if (
        [
          'wbc',
          'rbc',
          'hemoglobin',
          'hematocrit',
          'mcv',
          'mch',
          'mchc',
          'plt',
          'rdwsd',
          'rdwcv',
          'pdw',
          'mpv',
          'neutrophils',
          'lymphocytes',
          'monocytes',
          'eosinophils',
          'basophils',
        ].includes(key)
      ) {
        data.bloodAll[key] = numValue;
      } else if (
        [
          'glucose',
          'alt',
          'ast',
          'ggt',
          'alp',
          'albumin',
          'totalBilirubin',
          'directBilirubin',
        ].includes(key)
      ) {
        data.liverFunction[key] = numValue;
      } else if (['creatinine', 'uricAcid'].includes(key)) {
        data.kidneyFunction[key] = numValue;
      }
    }
  }

  return data;
}

function normalizeNumber(value: string, key: string): number {
  let normalized = value.replace(/\s+/g, '').replace(',', '.');

  if (/^\d+\.\d+$/.test(normalized)) {
    return parseFloat(normalized);
  }

  const needsDecimal = {
    lipids: [
      'triglycerides',
      'cholesterol',
      'hdl',
      'ldl',
      'vldl',
      'atherogenicCoeff',
    ],
    biochemSmall: ['glucose', 'totalBilirubin', 'directBilirubin'],
  };

  const isLipid = needsDecimal.lipids.includes(key);
  const isBiochemSmall = needsDecimal.biochemSmall.includes(key);

  if (!/[.,]/.test(normalized) && /^\d+$/.test(normalized)) {
    const num = parseInt(normalized, 10);

    if (isLipid) {
      if (num >= 10) normalized = (num / 100).toFixed(2);
    } else if (isBiochemSmall && num >= 100) {
      normalized = (num / 100).toFixed(2);
    }
  }

  return parseFloat(normalized);
}
