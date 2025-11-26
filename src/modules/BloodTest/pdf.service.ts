import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AiAnalysisResult } from '@common/interfaces/analysis-result.interface';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';

interface MarkerInterpretation {
  markerName: string;
  value: string | number;
  referenceMin: string | number;
  referenceMax: string | number;
  unit: string;
  status: string;
}

@Injectable()
export class PdfService {
  async generateHealthReportPdf(
    analysisResult: AiAnalysisResult,
    inputData: CreateReviewDataDto,
    debug = false,
  ): Promise<Buffer> {
    const tempHtmlPath = path.join(os.tmpdir(), `report_${Date.now()}.html`);

    try {
      const writeStream = fs.createWriteStream(tempHtmlPath);
      await this.writeHtmlInChunks(writeStream, analysisResult, inputData);

      const pdfBuffer = await this.htmlToPdf(tempHtmlPath, debug);

      fs.unlinkSync(tempHtmlPath);

      return pdfBuffer;
    } catch (error) {
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
      throw error;
    }
  }

  private async writeHtmlInChunks(
    writeStream: fs.WriteStream,
    analysisResult: AiAnalysisResult,
    inputData: CreateReviewDataDto,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reportDate = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      const wellnessScore =
        analysisResult.bloodTestSummary.overallWellnessScore;
      const circumference = 2 * Math.PI * 27;
      const fixedFillPercentage = 67;
      const offset =
        circumference - (fixedFillPercentage / 100) * circumference;

      const getScoreColors = (score: number) => {
        if (score >= 85) return { from: '#047E56', to: '#32AC84' };
        if (score >= 65) return { from: '#9BC74B', to: '#FE9901' };
        return { from: '#FF9509', to: '#FF3B01' };
      };
      const colors = getScoreColors(wellnessScore);

      const firstPageMarkers = 12;
      const subsequentPageMarkers = 16;
      const totalMarkers = analysisResult.markersInterpretations.length;

      const page1Markers = analysisResult.markersInterpretations.slice(
        0,
        Math.min(firstPageMarkers, totalMarkers),
      );
      const remainingAfterPage1 =
        analysisResult.markersInterpretations.slice(firstPageMarkers);

      const markerPages: MarkerInterpretation[][] = [];
      for (
        let i = 0;
        i < remainingAfterPage1.length;
        i += subsequentPageMarkers
      ) {
        markerPages.push(
          remainingAfterPage1.slice(i, i + subsequentPageMarkers),
        );
      }

      const hasRecommendations =
        (inputData.nutritionAdvice &&
          analysisResult.nutritionRecommendations) ||
        (inputData.supplementRecommendations &&
          analysisResult.supplementsRecommendations) ||
        (inputData.medicationGuidance && analysisResult.drugsRecommendations) ||
        (inputData.exerciseGuidelines &&
          analysisResult.exerciseRecommendations);

      const totalPages = 1 + markerPages.length + (hasRecommendations ? 1 : 0);

      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      writeStream.write(this.getHtmlHeader());

      writeStream.write(
        this.getFirstPage(
          reportDate,
          wellnessScore,
          circumference,
          offset,
          colors,
          analysisResult,
          page1Markers,
          totalPages,
        ),
      );

      markerPages.forEach((markers, index) => {
        writeStream.write(
          this.getMarkerPage(reportDate, markers, index + 2, totalPages),
        );
      });

      if (hasRecommendations) {
        writeStream.write(
          this.getRecommendationsPage(
            reportDate,
            inputData,
            analysisResult,
            totalPages,
          ),
        );
      }

      writeStream.write('</body></html>');
      writeStream.end();
    });
  }

  private async htmlToPdf(htmlPath: string, debug: boolean): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      if (debug) {
        const debugDir = path.join(process.cwd(), 'debug');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir);
        }
        fs.writeFileSync(
          path.join(debugDir, `report-${Date.now()}.html`),
          htmlContent,
        );
      }

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      });

      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        preferCSSPageSize: true,
      });

      const pdfBuffer = Buffer.from(pdfUint8Array);

      if (debug) {
        const debugDir = path.join(process.cwd(), 'debug');
        fs.writeFileSync(
          path.join(debugDir, `report-${Date.now()}.pdf`),
          pdfBuffer,
        );
      }

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  private getHtmlHeader(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body { 
      font-family: 'Inter', sans-serif; 
      color: #080B08;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page { 
      width: 210mm;
      min-height: 297mm;
      padding: 0 20px 80px 20px;
      page-break-after: always;
      position: relative;
    }

    .page:last-child {
      page-break-after: auto;
    }
    
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
    }
    
    .logo { 
      font-family: 'Poppins', sans-serif;
      font-size: 24px; 
      font-weight: 700;
      color: #14B8A6;
    }
    
    .date { 
      font-size: 12px; 
      color: #525252;
    }
    
    .page-title { 
      text-align: center;
      font-family: 'Poppins', sans-serif;
      font-size: 12px;
      font-weight: 500;
      margin-top: 20px;
      margin-bottom:5px;
    }
    
    .summary-wrapper {
      display: flex;
      align-items:center;
      gap: 10px;
      margin: 0px 0 40px 0;
      border-radius: 20px;
    }
    
    .wellness-box {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        width: 165px;
        align-items: center; 
        justify-content: center; 
        padding: 40px 12px;
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 20px;
        text-align: center;
    }

    .wellness-title {
        font-size: 12px;
        font-family: 'Poppins', sans-serif;
        font-weight: 400;
        margin-bottom: 10px;
    }

    .donut-chart {
        position: relative;
        width: 70px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .donut-chart svg {
        transform: rotate(-90deg);
        position: absolute;
        top: 0;
        left: 0;
    }

    .donut-bg {
        fill: transparent;
        stroke: transparent;
        stroke-width: 8;
    }

    .donut-progress {
        fill: none;
        stroke: url(#gradient);
        stroke-width: 8;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.5s ease;
    }

    .donut-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 14px;
        font-weight: 500;
        font-family: 'Poppins', sans-serif;
        z-index: 10;
    }

    .summary-content {
      flex: 1;
    }
    
    .summary-content p {
      font-size: 10.5px;
      color: #1E1E1E;
      margin-bottom: 10px;
      line-height: 14px;
    }
    
    .summary-content ul {
      list-style: none;
      padding: 0;
      margin-bottom: 10px;
    }
    
    .summary-content li {
      font-size: 10.5px;
      color: #1E1E1E;
      padding-left: 15px;
      position: relative;
      line-height: 14px;
    }
    
    .summary-content li:before {
      content: "•";
      position: absolute;
      left: 5px;
      font-weight: 700;
      font-size: 12px;
      color: #1E1E1E;
    }
    
    .conclusion {
      font-size: 10.5px;
      color: #1E1E1E;
      line-height: 1.6;
    }
    
    .markers-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #DCDCDC;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 30px;
    }

    .markers-table thead {
      height: 32px;
      background: #FDFDFD;
      border-bottom: 1px solid #DCDCDC;
    }

    .markers-table th {
      padding: 12px;
      text-align: left;
      font-weight: 500;
      font-size: 12px;
      border-bottom: 1px solid #DCDCDC;
    }

    .markers-table th:nth-child(1) { width: 30%; }
    .markers-table th:nth-child(2) { width: 10%; }
    .markers-table th:nth-child(3) { width: 42%; }
    .markers-table th:nth-child(4) { width: 18%; }

    .markers-table td {
      padding: 16px 12px;
      font-size: 12px;
      vertical-align: middle;
    }

    .markers-table tbody tr {
      page-break-inside: avoid;
    }
    
    .marker-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .marker-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .marker-dot.normal { background: #10B981; }
    .marker-dot.slightly-high,
    .marker-dot.slightly-low { background: #F59E0B; }
    .marker-dot.high,
    .marker-dot.low,
    .marker-dot.critical { background: #EF4444; }
    
    .marker-value {
      font-weight: 400;
    }
    
    .range-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .health-bar {
      margin-right:30px;
      position: relative;
      width: 120px;
      height: 8px;
      background: linear-gradient(to right, 
        #EF4444 0% 20%,
        #F59E0B 20% 30%,
        #10B981 30% 70%,
        #F59E0B 70% 80%,
        #EF4444 80% 100%
      );
      border-radius: 12px;
    }
    
    .health-indicator {
      position: absolute;
      top: -12px;
      transform: translateX(-50%);
      font-size: 14px;
      line-height: 1;
    }
    
    .health-indicator.normal { color: #10B981; }
    .health-indicator.slightly-high,
    .health-indicator.slightly-low { color: #F59E0B; }
    .health-indicator.high,
    .health-indicator.low,
    .health-indicator.critical { color: #EF4444; }
    
    .range-text {
      font-size: 12px;
    }
    
    .status-badge {
      width:90px;
      display: inline-block;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 400;
      text-align: center;
    }
    
    .status-badge.normal {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    
    .status-badge.slightly-high,
    .status-badge.slightly-low {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }
    
    .status-badge.high,
    .status-badge.low,
    .status-badge.critical {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .advice-block {
      border-top: 1px solid #DCDCDC;
    }

    .wrapper-recommendations{
      border-bottom: 1px solid #DCDCDC;
    }

    .section-title {
      font-size: 12px;
      font-family: 'Poppins', sans-serif;
      font-weight: 400;
      margin: 10px 0 5px 10px;
      color: #1F2937;
    }
    
    .recommendation-list {
      list-style: none;
      margin-left: 20px;
      padding: 0;
      margin-bottom: 16px;
    }
    
    .recommendation-list li {
      font-size: 10.5px;
      color: #1F2937;
      padding-left: 12px;
      position: relative;
      line-height: 1.6;
    }
    
    .recommendation-list li:before {
      content: "•";
      position: absolute;
      left: 0;
      top: -2px;
      font-weight: 700;
      font-size: 12px;
    }
    
    .question-answer-box {
      margin-bottom: 12px;
      padding: 16px;
      background: #FDFDFD;
      border: 1px solid #DCDCDC;
      border-left: 4px solid #14B8A6;
      border-radius: 4px 12px 12px 4px;
    }
    
    .question-answer-title {
      display:flex;
      justify-content:center;
      font-size: 12px;
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    
    .question-label {
      font-size: 12px;
      color: #525252;
      margin-bottom: 8px;
    }
    
    .question-text {
      font-size: 12px;
      font-family: 'Poppins', sans-serif;
      font-style: italic;
      color: #1E1E1E;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    
    .answer-text {
      font-size: 12px;
      color: #1E1E1E;
      line-height: 1.6;
    }
    
    .footer {
      position: absolute;
      bottom: 20px; 
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
    }
    
    .disclaimer {
      font-size: 10.5px;
      color: #525252;
      line-height: 1.4;
      max-width: 70%;
    }
    
    .page-number {
      font-size: 10.5px;
      color: #525252;
    }
    
    .markers-table-continuation {
      border-radius: 0 0 12px 12px;
      margin-top: 0;
    }
  </style>
</head>
<body>`;
  }

  private getFirstPage(
    reportDate: string,
    wellnessScore: number,
    circumference: number,
    offset: number,
    colors: { from: string; to: string },
    analysisResult: AiAnalysisResult,
    page1Markers: MarkerInterpretation[],
    totalPages: number,
  ): string {
    return `
  <div class="page">
    <div class="header">
      <img
          src="https://res.cloudinary.com/dqbv0zovj/image/upload/v1760468594/logo_rm2vto.png"
          alt="PlasmAI"
          width="80"
      />
      <div class="date">Date of Report: ${reportDate}</div>
    </div>
    
    <h1 class="page-title">Your blood test summary</h1>
    
    <div class="summary-wrapper">
      <div class="wellness-box">
        <div class="wellness-title">Overall wellness score</div>
        <div class="donut-chart">
          <svg width="70" height="70" viewBox="0 0 70 70">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${colors.to};stop-opacity:1"/>
                <stop offset="67%" style="stop-color:${colors.from};stop-opacity:1"/>
              </linearGradient>
            </defs>
            <circle class="donut-bg" cx="35" cy="35" r="27"/>
            <circle class="donut-progress" cx="35" cy="35" r="27" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="donut-text">${wellnessScore}%</div>
        </div>
      </div>
      
      <div class="summary-content">
        <p>${analysisResult.bloodTestSummary.overallSummary}</p>
        <ul>
          ${analysisResult.bloodTestSummary.detailedFindings.map((finding) => `<li>${finding}</li>`).join('')}
        </ul>
        <div class="conclusion">${analysisResult.bloodTestSummary.conclusionStatement}</div>
      </div>
    </div>
    
    <table class="markers-table">
      <thead>
        <tr>
          <th>Marker</th>
          <th>Value</th>
          <th>Normal Range</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateMarkerRows(page1Markers)}
      </tbody>
    </table>
    
    <div class="footer">
      <div class="disclaimer">
        Disclaimer: This AI-generated report is for informational purposes only<br>
        and is not medical diagnosis. Please consult a healthcare professional.
      </div>
      <div class="page-number">Page 1 of ${totalPages}</div>
    </div>
  </div>`;
  }

  private getMarkerPage(
    reportDate: string,
    markers: MarkerInterpretation[],
    pageNum: number,
    totalPages: number,
  ): string {
    return `
  <div class="page">
    <div class="header">
      <img
          src="https://res.cloudinary.com/dqbv0zovj/image/upload/v1760468594/logo_rm2vto.png"
          alt="PlasmAI"
          width="80"
      />
      <div class="date">Date of Report: ${reportDate}</div>
    </div>
    
    <h1 class="page-title">Your blood test summary (continued)</h1>
    
    <table class="markers-table markers-table-continuation">
      <thead>
        <tr>
          <th>Marker</th>
          <th>Value</th>
          <th>Normal Range</th>
          <th>Interpretation</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateMarkerRows(markers)}
      </tbody>
    </table>
    
    <div class="footer">
      <div class="disclaimer">
        Disclaimer: This AI-generated report is for informational purposes only<br>
        and is not medical diagnosis. Please consult a healthcare professional.
      </div>
      <div class="page-number">Page ${pageNum} of ${totalPages}</div>
    </div>
  </div>`;
  }

  private getRecommendationsPage(
    reportDate: string,
    inputData: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
    totalPages: number,
  ): string {
    return `
  <div class="page">
    <div class="header">
      <img
          src="https://res.cloudinary.com/dqbv0zovj/image/upload/v1760468594/logo_rm2vto.png"
          alt="PlasmAI"
          width="80"
      />
      <div class="date">Date of Report: ${reportDate}</div>
    </div>
    
    <h1 class="page-title">Your personalized recommendations</h1>
  
    <div class="wrapper-recommendations">
      ${
        inputData.nutritionAdvice && analysisResult.nutritionRecommendations
          ? `
        <div class="advice-block">
          <h2 class="section-title">Nutrition advice</h2>
          <ul class="recommendation-list">
            ${analysisResult.nutritionRecommendations.descriptions.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        inputData.supplementRecommendations &&
        analysisResult.supplementsRecommendations
          ? `
        <div class="advice-block">
          <h2 class="section-title">Supplement recommendations</h2>
          <ul class="recommendation-list">
            ${analysisResult.supplementsRecommendations.descriptions.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        inputData.medicationGuidance && analysisResult.drugsRecommendations
          ? `
        <div class="advice-block">
          <h2 class="section-title">Medical guidance</h2>
          <ul class="recommendation-list">
            ${analysisResult.drugsRecommendations.descriptions.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
      
      ${
        inputData.exerciseGuidelines && analysisResult.exerciseRecommendations
          ? `
        <div class="advice-block">
          <h2 class="section-title">Exercise guidelines</h2>
          <ul class="recommendation-list">
            ${analysisResult.exerciseRecommendations.descriptions.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
    </div>
    
    ${
      inputData.additionalQuestions && analysisResult.userQuestionResponse
        ? `
      <h3 class="question-answer-title">Answer to your question</h3>
      <div class="question-answer-box">
        <div class="question-label">Your Question:</div>
        <div class="question-text">"${analysisResult.userQuestionResponse.question}"</div>
        <div class="question-label">AI recommendations:</div>
        <div class="answer-text">${analysisResult.userQuestionResponse.answer}</div>
      </div>
    `
        : ''
    }
    
    <div class="footer">
      <div class="disclaimer">
        Disclaimer: This AI-generated report is for informational purposes only<br>
        and is not medical diagnosis. Please consult a healthcare professional.
      </div>
      <div class="page-number">Page ${totalPages} of ${totalPages}</div>
    </div>
  </div>`;
  }

  private generateMarkerRows(markers: MarkerInterpretation[]): string {
    return markers
      .map((marker: MarkerInterpretation) => {
        const statusClass = marker.status.toLowerCase().replace(/ /g, '-');
        const position = this.calculateMarkerPosition(
          Number(marker.value),
          Number(marker.referenceMin),
          Number(marker.referenceMax),
        );
        return `
          <tr>
            <td>
              <div class="marker-name-cell">
                <div class="marker-dot ${statusClass}"></div>
                <span>${marker.markerName}</span>
              </div>
            </td>
            <td class="marker-value">${marker.value}</td>
            <td>
              <div class="range-cell">
                <div class="health-bar">
                  <div class="health-indicator ${statusClass}" style="left: ${position}%">▼</div>
                </div>
                <div class="range-text">${marker.referenceMin} - ${marker.referenceMax} ${marker.unit}</div>
              </div>
            </td>
            <td>
              <span class="status-badge ${statusClass}">${marker.status}</span>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  private calculateMarkerPosition(
    value: number,
    referenceMin: number,
    referenceMax: number,
  ): number {
    const redLowEnd = referenceMin * 0.5;
    const yellowLowEnd = referenceMin;
    const yellowHighStart = referenceMax;
    const yellowHighEnd = referenceMax * 1.5;
    const redHighEnd = referenceMax * 3;

    let position: number;

    if (value <= 0) {
      position = 0;
    } else if (value < redLowEnd) {
      position = (value / redLowEnd) * 20;
      position = Math.max(0, position);
    } else if (value < referenceMin) {
      const zoneRange = yellowLowEnd - redLowEnd;
      const valueInZone = value - redLowEnd;
      position = 20 + (valueInZone / zoneRange) * 10;
    } else if (value <= referenceMax) {
      const zoneRange = referenceMax - referenceMin;
      const valueInZone = value - referenceMin;
      position = 30 + (valueInZone / zoneRange) * 40;
    } else if (value < yellowHighEnd) {
      const zoneRange = yellowHighEnd - yellowHighStart;
      const valueInZone = value - yellowHighStart;
      position = 70 + (valueInZone / zoneRange) * 10;
    } else if (value < redHighEnd) {
      const zoneRange = redHighEnd - yellowHighEnd;
      const valueInZone = value - yellowHighEnd;
      position = 80 + (valueInZone / zoneRange) * 20;
    } else {
      position = 100;
    }

    return Math.max(0, Math.min(100, position));
  }
}
