import sharp from 'sharp';
import { createWorker, PSM, RecognizeResult } from 'tesseract.js';
import fs from 'fs';
import {
  BloodTestData,
  MarkerValue,
} from '@common/interfaces/blood-test-data.interface';
import { Marker } from '@modules/marker/entities/marker.entity';

export async function extractBloodTestData(
  inputPath: string,
  markers: Marker[],
): Promise<BloodTestData> {
  const cleaned = inputPath.replace('.png', '_clean.png');

  await sharp(inputPath)
    .grayscale()
    .normalise()
    .sharpen()
    .resize({ width: 3000 })
    .toFile(cleaned);

  console.log('✓ Preprocessing complete');

  const worker = await createWorker(['ukr', 'eng', 'pol'], 1);

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
  });

  const result: RecognizeResult = await worker.recognize(cleaned);
  await worker.terminate();

  const rawOcrPath = inputPath.replace('.png', '_ocr_raw.txt');
  fs.writeFileSync(rawOcrPath, result.data.text);

  console.log('✓ OCR complete');

  return parseBloodTestWithMarkers(result.data.text, markers);
}

function parseBloodTestWithMarkers(
  text: string,
  markers: Marker[],
): BloodTestData {
  const data: BloodTestData = {};

  for (const marker of markers) {
    try {
      const pattern = new RegExp(marker.pattern, 'i');
      const match = text.match(pattern);

      if (match && match[1]) {
        const rawValue = match[1];
        const numValue = normalizeNumber(rawValue, marker.key);

        data[marker.key as keyof BloodTestData] = {
          value: numValue,
          unit: marker.unit,
          referenceMin: marker.referenceMin,
          referenceMax: marker.referenceMax,
        } as MarkerValue;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing marker ${marker.key}:`, errorMessage);
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

    if (isLipid && num >= 10) {
      normalized = (num / 100).toFixed(2);
    } else if (isBiochemSmall && num >= 100) {
      normalized = (num / 100).toFixed(2);
    }
  }

  return parseFloat(normalized);
}
