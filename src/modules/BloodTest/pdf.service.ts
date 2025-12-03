import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
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
  private readonly LOGO_URL =
    'https://res.cloudinary.com/dqbv0zovj/image/upload/v1760468594/logo_rm2vto.png';
  private readonly PAGE_WIDTH = 595.28;
  private readonly PAGE_HEIGHT = 841.89;

  private readonly MARGIN_X = 20;
  private readonly MARGIN_Y = 1;

  private readonly CONTENT_WIDTH = this.PAGE_WIDTH - this.MARGIN_X * 2;

  async generateHealthReportPdf(
    analysisResult: AiAnalysisResult,
    inputData: CreateReviewDataDto,
    debug = false,
  ): Promise<Buffer> {
    let logoBuffer: Buffer | null = null;
    try {
      const response = await axios.get<ArrayBuffer>(this.LOGO_URL, {
        responseType: 'arraybuffer',
      });
      logoBuffer = Buffer.from(response.data);
    } catch (error) {
      console.warn('Failed to load logo:', error);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 0,
            bottom: 0,
            left: this.MARGIN_X,
            right: this.MARGIN_X,
          },
          bufferPages: true,
        });

        const fontsPath = path.join(process.cwd(), 'assets', 'fonts');

        doc.registerFont(
          'Poppins-Regular',
          path.join(fontsPath, 'Poppins-Regular.ttf'),
        );
        doc.registerFont(
          'Inter-Regular',
          path.join(fontsPath, 'Inter-Regular.otf'),
        );
        doc.registerFont('Inter-Bold', path.join(fontsPath, 'Inter-Bold.otf'));
        doc.registerFont(
          'Inter-Italic',
          path.join(fontsPath, 'Inter-Italic.otf'),
        );

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          if (debug) {
            const debugDir = path.join(process.cwd(), 'debug');
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir);
            }
            fs.writeFileSync(
              path.join(debugDir, `report-${Date.now()}.pdf`),
              pdfBuffer,
            );
          }
          resolve(pdfBuffer);
        });
        doc.on('error', (err: Error) => reject(err));

        const reportDate = new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });

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
          (inputData.medicationGuidance &&
            analysisResult.drugsRecommendations) ||
          (inputData.exerciseGuidelines &&
            analysisResult.exerciseRecommendations) ||
          (inputData.additionalQuestions &&
            analysisResult.userQuestionResponse);

        const recommendationsHeight = hasRecommendations
          ? this.calculateRecommendationsHeight(doc, inputData, analysisResult)
          : 0;

        const lastPageMarkerCount =
          markerPages.length > 0
            ? markerPages[markerPages.length - 1].length
            : page1Markers.length;

        const headerSpace = 50 + 25;
        const footerSpace = 60;
        const markerTableHeaderSpace = 30;
        const markerRowHeight = 40;
        const tableBottomBorder = 0;
        const spacingBeforeRecommendations = 25;

        const lastPageMarkersHeight =
          markerTableHeaderSpace +
          lastPageMarkerCount * markerRowHeight +
          tableBottomBorder;

        const lastPageUsedSpace =
          headerSpace +
          lastPageMarkersHeight +
          spacingBeforeRecommendations +
          footerSpace;

        const lastPageAvailableSpace = this.PAGE_HEIGHT - lastPageUsedSpace;

        const fitOnLastPage =
          hasRecommendations &&
          recommendationsHeight > 0 &&
          lastPageAvailableSpace >= recommendationsHeight;

        const needsNewPage = hasRecommendations && !fitOnLastPage;
        const totalPages = 1 + markerPages.length + (needsNewPage ? 1 : 0);

        this.drawFirstPage(
          doc,
          logoBuffer,
          reportDate,
          analysisResult,
          page1Markers,
          1,
          totalPages,
        );

        markerPages.forEach((markers, index) => {
          const isLastMarkerPage = index === markerPages.length - 1;
          doc.addPage();
          this.drawMarkerPage(
            doc,
            logoBuffer,
            reportDate,
            markers,
            index + 2,
            totalPages,
          );

          if (isLastMarkerPage && fitOnLastPage && hasRecommendations) {
            const headerSpace = 50 + 25;
            const markerTableHeaderSpace = 30;
            const markerRowHeight = 40;
            const spacingBeforeRecommendations = 25;

            const currentY =
              headerSpace +
              markerTableHeaderSpace +
              markers.length * markerRowHeight +
              spacingBeforeRecommendations;

            this.drawRecommendationsSection(
              doc,
              inputData,
              analysisResult,
              currentY,
            );
          }
        });

        if (needsNewPage) {
          doc.addPage();
          this.drawRecommendationsPage(
            doc,
            logoBuffer,
            reportDate,
            inputData,
            analysisResult,
            totalPages,
          );
        }

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private calculateRecommendationsHeight(
    doc: PDFKit.PDFDocument,
    inputData: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
  ): number {
    let totalHeight = 0;

    totalHeight += 25 + 15;

    if (inputData.nutritionAdvice && analysisResult.nutritionRecommendations) {
      totalHeight += this.calculateSectionHeight(
        doc,
        analysisResult.nutritionRecommendations.descriptions,
      );
    }

    if (
      inputData.supplementRecommendations &&
      analysisResult.supplementsRecommendations
    ) {
      totalHeight += this.calculateSectionHeight(
        doc,
        analysisResult.supplementsRecommendations.descriptions,
      );
    }

    if (inputData.medicationGuidance && analysisResult.drugsRecommendations) {
      totalHeight += this.calculateSectionHeight(
        doc,
        analysisResult.drugsRecommendations.descriptions,
      );
    }

    if (
      inputData.exerciseGuidelines &&
      analysisResult.exerciseRecommendations
    ) {
      totalHeight += this.calculateSectionHeight(
        doc,
        analysisResult.exerciseRecommendations.descriptions,
      );
    }

    if (inputData.additionalQuestions && analysisResult.userQuestionResponse) {
      const questionText = `"${analysisResult.userQuestionResponse.question}"`;
      const answerText = analysisResult.userQuestionResponse.answer;

      doc.fontSize(9).font('Inter-Italic');
      const questionHeight = doc.heightOfString(questionText, {
        width: this.CONTENT_WIDTH - 30,
      });

      doc.fontSize(9).font('Inter-Regular');
      const answerHeight = doc.heightOfString(answerText, {
        width: this.CONTENT_WIDTH - 30,
      });

      const boxHeight = 15 + 15 + questionHeight + 15 + 15 + answerHeight + 15;
      totalHeight += 20 + boxHeight + 10;
    }

    return totalHeight;
  }

  private calculateSectionHeight(
    doc: PDFKit.PDFDocument,
    items: string[],
  ): number {
    let height = 18;

    items.forEach((item) => {
      doc.fontSize(8.5).font('Inter-Regular');
      const itemHeight = doc.heightOfString(item, {
        width: this.CONTENT_WIDTH - 42,
        lineGap: 2,
      });
      height += itemHeight + 8;
    });

    height += 15;
    return height;
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    y: number,
  ) {
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, this.MARGIN_X, y, { width: 80 });
      } catch (error) {
        console.warn('Failed to embed logo:', error);
      }
    }

    doc
      .fontSize(9)
      .fillColor('#525252')
      .font('Inter-Regular')
      .text(
        `Date of Report: ${reportDate}`,
        this.PAGE_WIDTH - this.MARGIN_X - 120,
        y + 5,
        {
          width: 120,
          align: 'right',
        },
      );
  }

  private drawFooter(
    doc: PDFKit.PDFDocument,
    pageNum: number,
    totalPages: number,
  ) {
    const footerY = this.PAGE_HEIGHT - 30;

    doc
      .fontSize(8)
      .fillColor('#525252')
      .font('Inter-Regular')
      .text(
        'Disclaimer: This AI-generated report is for informational purposes only\nand is not medical diagnosis. Please consult a healthcare professional.',
        this.MARGIN_X,
        footerY,
        { width: this.CONTENT_WIDTH * 0.7, align: 'left', lineGap: 2 },
      );

    doc
      .fontSize(8)
      .fillColor('#525252')
      .font('Inter-Regular')
      .text(
        `Page ${pageNum} of ${totalPages}`,
        this.PAGE_WIDTH - this.MARGIN_X - 80,
        footerY,
        {
          width: 80,
          align: 'right',
        },
      );
  }

  private drawFirstPage(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    analysisResult: AiAnalysisResult,
    page1Markers: MarkerInterpretation[],
    pageNum: number,
    totalPages: number,
  ) {
    let currentY = this.MARGIN_Y;
    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    doc
      .fontSize(10)
      .fillColor('#080B08')
      .font('Poppins-Regular')
      .text('Your blood test summary', this.MARGIN_X, currentY, {
        width: this.CONTENT_WIDTH,
        align: 'center',
      });
    currentY += 25;

    const wellnessScore = analysisResult.bloodTestSummary.overallWellnessScore;
    const boxWidth = 140;
    const boxHeight = 140;
    const boxX = this.MARGIN_X;
    const summaryX = boxX + boxWidth + 15;

    doc
      .roundedRect(boxX, currentY, boxWidth, boxHeight, 10)
      .lineWidth(1)
      .strokeColor('#DCDCDC')
      .fillColor('#FFFFFF')
      .fillAndStroke();

    doc
      .fontSize(9)
      .fillColor('#080B08')
      .font('Poppins-Regular')
      .text('Overall wellness score', boxX, currentY + 15, {
        width: boxWidth,
        align: 'center',
      });

    this.drawDonutChart(doc, boxX + boxWidth / 2, currentY + 75, wellnessScore);

    const scoreTextY = currentY + 67;
    doc
      .fontSize(12)
      .fillColor('#080B08')
      .font('Poppins-Regular')
      .text(`${wellnessScore}%`, boxX, scoreTextY, {
        width: boxWidth,
        align: 'center',
      });

    const summaryWidth = this.CONTENT_WIDTH - boxWidth - 15;
    let summaryY = currentY + 5;

    doc
      .fontSize(8.5)
      .fillColor('#1E1E1E')
      .font('Inter-Regular')
      .text(
        analysisResult.bloodTestSummary.overallSummary,
        summaryX,
        summaryY,
        {
          width: summaryWidth,
          align: 'left',
          lineGap: 2,
        },
      );
    summaryY = doc.y + 8;

    analysisResult.bloodTestSummary.detailedFindings.forEach((finding) => {
      const bulletX = summaryX;
      const textX = summaryX + 12;

      doc
        .fontSize(8.5)
        .fillColor('#1E1E1E')
        .font('Inter-Regular')
        .text('•', bulletX, summaryY);

      doc
        .fontSize(8.5)
        .fillColor('#1E1E1E')
        .font('Inter-Regular')
        .text(finding, textX, summaryY, {
          width: summaryWidth - 12,
          align: 'left',
          lineGap: 2,
        });
      summaryY = doc.y + 5;
    });

    doc
      .fontSize(8.5)
      .fillColor('#1E1E1E')
      .font('Inter-Regular')
      .text(
        analysisResult.bloodTestSummary.conclusionStatement,
        summaryX,
        summaryY,
        {
          width: summaryWidth,
          align: 'left',
          lineGap: 2,
        },
      );

    currentY += boxHeight + 25;

    this.drawMarkersTable(doc, page1Markers, currentY);

    this.drawFooter(doc, pageNum, totalPages);
  }

  private drawMarkerPage(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    markers: MarkerInterpretation[],
    pageNum: number,
    totalPages: number,
  ) {
    let currentY = this.MARGIN_Y;

    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    doc
      .fontSize(10)
      .fillColor('#080B08')
      .font('Poppins-Regular')
      .text('Your blood test summary (continued)', this.MARGIN_X, currentY, {
        width: this.CONTENT_WIDTH,
        align: 'center',
      });
    currentY += 25;

    this.drawMarkersTable(doc, markers, currentY);

    this.drawFooter(doc, pageNum, totalPages);
  }

  private drawRecommendationsSection(
    doc: PDFKit.PDFDocument,
    inputData: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
    startY: number,
  ) {
    let currentY = startY;

    const hasActualRecommendations =
      (inputData.nutritionAdvice && analysisResult.nutritionRecommendations) ||
      (inputData.supplementRecommendations &&
        analysisResult.supplementsRecommendations) ||
      (inputData.medicationGuidance && analysisResult.drugsRecommendations) ||
      (inputData.exerciseGuidelines && analysisResult.exerciseRecommendations);

    if (hasActualRecommendations) {
      doc
        .fontSize(10)
        .fillColor('#080B08')
        .font('Poppins-Regular')
        .text('Your personalized recommendations', this.MARGIN_X, currentY, {
          width: this.CONTENT_WIDTH,
          align: 'center',
        });
      currentY += 25;

      doc
        .moveTo(this.MARGIN_X, currentY)
        .lineTo(this.PAGE_WIDTH - this.MARGIN_X, currentY)
        .strokeColor('#DCDCDC')
        .lineWidth(1)
        .stroke();
      currentY += 15;
    }

    if (inputData.nutritionAdvice && analysisResult.nutritionRecommendations) {
      currentY = this.drawRecommendationSection(
        doc,
        'Nutrition advice',
        analysisResult.nutritionRecommendations.descriptions,
        currentY,
      );
    }

    if (
      inputData.supplementRecommendations &&
      analysisResult.supplementsRecommendations
    ) {
      currentY = this.drawRecommendationSection(
        doc,
        'Supplement recommendations',
        analysisResult.supplementsRecommendations.descriptions,
        currentY,
      );
    }

    if (inputData.medicationGuidance && analysisResult.drugsRecommendations) {
      currentY = this.drawRecommendationSection(
        doc,
        'Medical guidance',
        analysisResult.drugsRecommendations.descriptions,
        currentY,
      );
    }

    if (
      inputData.exerciseGuidelines &&
      analysisResult.exerciseRecommendations
    ) {
      currentY = this.drawRecommendationSection(
        doc,
        'Exercise guidelines',
        analysisResult.exerciseRecommendations.descriptions,
        currentY,
      );
    }

    if (inputData.additionalQuestions && analysisResult.userQuestionResponse) {
      doc
        .fontSize(10)
        .fillColor('#1F2937')
        .font('Poppins-Regular')
        .text('Answer to your question', this.MARGIN_X, currentY, {
          width: this.CONTENT_WIDTH,
          align: 'center',
        });
      currentY += 20;

      const questionText = `"${analysisResult.userQuestionResponse.question}"`;
      const answerText = analysisResult.userQuestionResponse.answer;

      doc.fontSize(9).font('Inter-Italic');
      const questionHeight = doc.heightOfString(questionText, {
        width: this.CONTENT_WIDTH - 30,
      });

      doc.fontSize(9).font('Inter-Regular');
      const answerHeight = doc.heightOfString(answerText, {
        width: this.CONTENT_WIDTH - 30,
      });

      const boxHeight = 15 + 15 + questionHeight + 15 + 15 + answerHeight + 15;
      const boxY = currentY;

      doc
        .roundedRect(this.MARGIN_X, boxY, this.CONTENT_WIDTH, boxHeight, 6)
        .lineWidth(1)
        .strokeColor('#DCDCDC')
        .fillColor('#FDFDFD')
        .fillAndStroke();

      doc.rect(this.MARGIN_X, boxY, 4, boxHeight).fillColor('#14B8A6').fill();

      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#525252')
        .font('Poppins-Regular')
        .text('Your Question:', this.MARGIN_X + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
        });
      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#1E1E1E')
        .font('Inter-Italic')
        .text(questionText, this.MARGIN_X + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
          lineGap: 2,
        });
      currentY = doc.y + 15;

      doc
        .fontSize(9)
        .fillColor('#525252')
        .font('Poppins-Regular')
        .text('AI recommendations:', this.MARGIN_X + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
        });
      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#1E1E1E')
        .font('Inter-Regular')
        .text(answerText, this.MARGIN_X + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
          lineGap: 2,
        });

      currentY = boxY + boxHeight + 10;
    }
  }

  private drawRecommendationsPage(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    inputData: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
    totalPages: number,
  ) {
    let currentY = this.MARGIN_Y;

    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    this.drawRecommendationsSection(doc, inputData, analysisResult, currentY);

    this.drawFooter(doc, totalPages, totalPages);
  }

  private drawRecommendationSection(
    doc: PDFKit.PDFDocument,
    title: string,
    items: string[],
    startY: number,
  ): number {
    let currentY = startY;

    doc
      .fontSize(9.5)
      .fillColor('#1F2937')
      .font('Poppins-Regular')
      .text(title, this.MARGIN_X + 5, currentY, { align: 'left' });
    currentY += 18;

    items.forEach((item) => {
      const bulletX = this.MARGIN_X + 20;
      const textX = this.MARGIN_X + 32;

      doc
        .fontSize(8.5)
        .fillColor('#1F2937')
        .font('Inter-Regular')
        .text('•', bulletX, currentY);

      doc
        .fontSize(8.5)
        .fillColor('#1F2937')
        .font('Inter-Regular')
        .text(item, textX, currentY, {
          width: this.CONTENT_WIDTH - 42,
          align: 'left',
          lineGap: 2,
        });
      currentY = doc.y + 8;
    });

    doc
      .moveTo(this.MARGIN_X, currentY)
      .lineTo(this.PAGE_WIDTH - this.MARGIN_X, currentY)
      .strokeColor('#DCDCDC')
      .lineWidth(1)
      .stroke();
    currentY += 15;

    return currentY;
  }

  private drawMarkersTable(
    doc: PDFKit.PDFDocument,
    markers: MarkerInterpretation[],
    startY: number,
  ) {
    const tableWidth = this.CONTENT_WIDTH;
    const col1Width = tableWidth * 0.3;
    const col2Width = tableWidth * 0.1;
    const col3Width = tableWidth * 0.42;
    const col4Width = tableWidth * 0.18;

    let currentY = startY;

    doc
      .roundedRect(this.MARGIN_X, currentY, tableWidth, 30, 8)
      .fillColor('#FDFDFD')
      .fill();

    const headerY = currentY + 10;
    doc
      .fontSize(9)
      .fillColor('#080B08')
      .font('Poppins-Regular')
      .text('Marker', this.MARGIN_X + 10, headerY, {
        width: col1Width - 20,
        align: 'left',
      })
      .text('Value', this.MARGIN_X + col1Width + 10, headerY, {
        width: col2Width - 20,
        align: 'left',
      })
      .text(
        'Normal Range',
        this.MARGIN_X + col1Width + col2Width + 10,
        headerY,
        {
          width: col3Width - 20,
          align: 'left',
        },
      )
      .text(
        'Interpretation',
        this.MARGIN_X + col1Width + col2Width + col3Width + 10,
        headerY,
        { width: col4Width - 20, align: 'left' },
      );

    currentY += 30;

    doc
      .moveTo(this.MARGIN_X, currentY)
      .lineTo(this.MARGIN_X + tableWidth, currentY)
      .strokeColor('#DCDCDC')
      .lineWidth(1)
      .stroke();

    markers.forEach((marker, index) => {
      const rowHeight = 40;
      const rowY = currentY + rowHeight / 2 - 6;
      const statusClass = marker.status.toLowerCase().replace(/ /g, '-');
      const dotColor = this.getStatusColor(statusClass);
      doc
        .circle(this.MARGIN_X + 15, rowY + 4, 5)
        .fillColor(dotColor)
        .fill();
      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Inter-Regular')
        .text(this.sanitizeText(marker.markerName), this.MARGIN_X + 30, rowY, {
          width: col1Width - 40,
          align: 'left',
        });

      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Inter-Regular')
        .text(String(marker.value), this.MARGIN_X + col1Width + 10, rowY, {
          width: col2Width - 20,
          align: 'left',
        });

      const barX = this.MARGIN_X + col1Width + col2Width + 10;
      const barY = rowY + 3;
      this.drawHealthBar(doc, barX, barY, marker);

      const rangeText = `${marker.referenceMin} - ${marker.referenceMax} ${marker.unit}`;
      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Inter-Regular')
        .text(this.sanitizeText(rangeText), barX + 110, rowY, {
          width: col3Width - 110,
          align: 'left',
        });

      this.drawStatusBadge(
        doc,
        marker.status,
        this.MARGIN_X + col1Width + col2Width + col3Width + 10,
        rowY - 4,
      );

      currentY += rowHeight;

      if (index < markers.length - 1) {
        doc
          .moveTo(this.MARGIN_X, currentY)
          .lineTo(this.MARGIN_X + tableWidth, currentY)
          .strokeColor('#DCDCDC')
          .lineWidth(0.5)
          .stroke();
      }
    });

    const tableHeight = currentY - startY;
    doc
      .roundedRect(this.MARGIN_X, startY, tableWidth, tableHeight, 8)
      .lineWidth(1)
      .strokeColor('#DCDCDC')
      .stroke();
  }

  private drawDonutChart(
    doc: PDFKit.PDFDocument,
    centerX: number,
    centerY: number,
    score: number,
  ) {
    const radius = 27;
    const lineWidth = 8;
    const colors = this.getScoreColors(score);

    doc
      .circle(centerX, centerY, radius)
      .lineWidth(lineWidth)
      .strokeColor('#FFFFFF')
      .stroke();

    const percentage = 67;
    const angle = (percentage / 100) * 360;
    const startAngle = -90;
    const segments = 20;

    for (let i = 0; i < segments; i++) {
      const segmentAngle = angle / segments;
      const currentStartAngle = startAngle + i * segmentAngle;
      const currentEndAngle = currentStartAngle + segmentAngle;

      const ratio = i / segments;
      const color = this.interpolateColor(colors.to, colors.from, ratio);

      this.drawArc(
        doc,
        centerX,
        centerY,
        radius,
        currentStartAngle,
        currentEndAngle,
        lineWidth,
        color,
      );
    }
  }

  private interpolateColor(
    color1: string,
    color2: string,
    ratio: number,
  ): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private drawArc(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    lineWidth: number,
    color: string,
  ) {
    const start = this.polarToCartesian(x, y, radius, startAngle);
    const end = this.polarToCartesian(x, y, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    doc.save();
    doc
      .path(
        `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      )
      .lineWidth(lineWidth)
      .lineCap('round')
      .strokeColor(color)
      .stroke();
    doc.restore();
  }

  private polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ) {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  private drawHealthBar(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    marker: MarkerInterpretation,
  ) {
    const barWidth = 100;
    const barHeight = 6;
    const borderRadius = 12;

    const segments = [
      { color: '#EF4444', start: 0, end: 0.2 },
      { color: '#F59E0B', start: 0.2, end: 0.3 },
      { color: '#10B981', start: 0.3, end: 0.7 },
      { color: '#F59E0B', start: 0.7, end: 0.8 },
      { color: '#EF4444', start: 0.8, end: 1.0 },
    ];

    doc.save();
    doc.roundedRect(x, y, barWidth, barHeight, borderRadius).clip();

    segments.forEach((segment) => {
      doc
        .rect(
          x + barWidth * segment.start,
          y,
          barWidth * (segment.end - segment.start),
          barHeight,
        )
        .fillColor(segment.color)
        .fill();
    });
    doc.restore();

    const position = this.calculateMarkerPosition(
      Number(marker.value),
      Number(marker.referenceMin),
      Number(marker.referenceMax),
    );

    const indicatorX = x + (barWidth * position) / 100;
    const statusClass = marker.status.toLowerCase().replace(/ /g, '-');
    const indicatorColor = this.getStatusColor(statusClass);

    const triangleWidth = 8;
    const triangleHeight = 10;
    const triangleTop = y - triangleHeight - 1;

    doc.save();
    doc
      .moveTo(indicatorX, y - 1)
      .lineTo(indicatorX - triangleWidth / 2, triangleTop)
      .lineTo(indicatorX + triangleWidth / 2, triangleTop)
      .closePath()
      .fillColor(indicatorColor)
      .fill();
    doc.restore();
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/μ/g, 'u')
      .replace(/°/g, 'deg')
      .replace(/±/g, '+/-')
      .replace(/≥/g, '>=')
      .replace(/≤/g, '<=')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/"/g, '"')
      .replace(/"/g, '"');
  }

  private drawStatusBadge(
    doc: PDFKit.PDFDocument,
    status: string,
    x: number,
    y: number,
  ) {
    const badgeWidth = 80;
    const badgeHeight = 18;
    const statusClass = status.toLowerCase().replace(/ /g, '-');

    const bgColor = this.getStatusBgColor(statusClass);
    const textColor = this.getStatusTextColor(statusClass);
    const borderColor = this.getStatusBorderColor(statusClass);

    doc
      .roundedRect(x, y, badgeWidth, badgeHeight, 3)
      .lineWidth(1)
      .strokeColor(borderColor)
      .fillColor(bgColor)
      .fillAndStroke();

    doc
      .fontSize(8)
      .fillColor(textColor)
      .font('Inter-Regular')
      .text(status, x, y + 4, { width: badgeWidth, align: 'center' });
  }

  private getScoreColors(score: number): { from: string; to: string } {
    if (score >= 85) return { from: '#047E56', to: '#32AC84' };
    if (score >= 65) return { from: '#9BC74B', to: '#FE9901' };
    return { from: '#FF9509', to: '#FF3B01' };
  }

  private getStatusColor(statusClass: string): string {
    if (statusClass === 'normal') return '#10B981';
    if (statusClass === 'slightly-high' || statusClass === 'slightly-low')
      return '#F59E0B';
    return '#EF4444';
  }

  private getStatusBgColor(statusClass: string): string {
    if (statusClass === 'normal') return '#D1FAE5';
    if (statusClass === 'slightly-high' || statusClass === 'slightly-low')
      return '#FEF3C7';
    return '#FEE2E2';
  }

  private getStatusTextColor(statusClass: string): string {
    if (statusClass === 'normal') return '#065F46';
    if (statusClass === 'slightly-high' || statusClass === 'slightly-low')
      return '#92400E';
    return '#991B1B';
  }

  private getStatusBorderColor(statusClass: string): string {
    if (statusClass === 'normal') return '#A7F3D0';
    if (statusClass === 'slightly-high' || statusClass === 'slightly-low')
      return '#FDE68A';
    return '#FECACA';
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
