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
  private readonly PAGE_WIDTH = 595.28; // A4 width in points
  private readonly PAGE_HEIGHT = 841.89; // A4 height in points
  private readonly MARGIN = 40;
  private readonly CONTENT_WIDTH = this.PAGE_WIDTH - this.MARGIN * 2;

  async generateHealthReportPdf(
    analysisResult: AiAnalysisResult,
    inputData: CreateReviewDataDto,
    debug = false,
  ): Promise<Buffer> {
    // Download logo first (outside Promise constructor)
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
            top: this.MARGIN,
            bottom: this.MARGIN,
            left: this.MARGIN,
            right: this.MARGIN,
          },
          bufferPages: true,
        });

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

        // Pagination setup
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
            analysisResult.exerciseRecommendations);

        const totalPages =
          1 + markerPages.length + (hasRecommendations ? 1 : 0);

        // Page 1: Summary
        this.drawFirstPage(
          doc,
          logoBuffer,
          reportDate,
          analysisResult,
          page1Markers,
          1,
          totalPages,
        );

        // Marker continuation pages
        markerPages.forEach((markers, index) => {
          doc.addPage();
          this.drawMarkerPage(
            doc,
            logoBuffer,
            reportDate,
            markers,
            index + 2,
            totalPages,
          );
        });

        // Recommendations page
        if (hasRecommendations) {
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

  private drawHeader(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    y: number,
  ) {
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, this.MARGIN, y, { width: 80 });
      } catch (error) {
        console.warn('Failed to embed logo:', error);
      }
    }

    doc
      .fontSize(9)
      .fillColor('#525252')
      .text(
        `Date of Report: ${reportDate}`,
        this.PAGE_WIDTH - this.MARGIN - 120,
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
    const footerY = this.PAGE_HEIGHT - this.MARGIN - 30;

    doc
      .fontSize(8)
      .fillColor('#525252')
      .text(
        'Disclaimer: This AI-generated report is for informational purposes only\nand is not medical diagnosis. Please consult a healthcare professional.',
        this.MARGIN,
        footerY,
        { width: this.CONTENT_WIDTH * 0.7, align: 'left', lineGap: 2 },
      );

    doc
      .fontSize(8)
      .fillColor('#525252')
      .text(
        `Page ${pageNum} of ${totalPages}`,
        this.PAGE_WIDTH - this.MARGIN - 80,
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
    let currentY = this.MARGIN;

    // Header
    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    // Page Title
    doc
      .fontSize(10)
      .fillColor('#080B08')
      .font('Helvetica-Bold')
      .text('Your blood test summary', this.MARGIN, currentY, {
        width: this.CONTENT_WIDTH,
        align: 'center',
      });
    currentY += 25;

    // Wellness Score Box and Summary
    const wellnessScore = analysisResult.bloodTestSummary.overallWellnessScore;
    const boxWidth = 140;
    const boxHeight = 140;
    const boxX = this.MARGIN;
    const summaryX = boxX + boxWidth + 15;

    // Draw wellness box with border
    doc
      .roundedRect(boxX, currentY, boxWidth, boxHeight, 10)
      .lineWidth(1)
      .strokeColor('#E5E7EB')
      .fillColor('#FFFFFF')
      .fillAndStroke();

    // Wellness title
    doc
      .fontSize(9)
      .fillColor('#080B08')
      .font('Helvetica')
      .text('Overall wellness score', boxX, currentY + 15, {
        width: boxWidth,
        align: 'center',
      });

    // Draw donut chart
    this.drawDonutChart(doc, boxX + boxWidth / 2, currentY + 75, wellnessScore);

    // Score text
    doc
      .fontSize(12)
      .fillColor('#080B08')
      .font('Helvetica-Bold')
      .text(`${wellnessScore}%`, boxX, currentY + 68, {
        width: boxWidth,
        align: 'center',
      });

    // Summary content
    const summaryWidth = this.CONTENT_WIDTH - boxWidth - 15;
    let summaryY = currentY + 5;

    doc
      .fontSize(8.5)
      .fillColor('#1E1E1E')
      .font('Helvetica')
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

    // Detailed findings (bullets)
    analysisResult.bloodTestSummary.detailedFindings.forEach((finding) => {
      const bulletX = summaryX;
      const textX = summaryX + 12;

      doc
        .fontSize(8.5)
        .fillColor('#1E1E1E')
        .font('Helvetica')
        .text('•', bulletX, summaryY);

      doc
        .fontSize(8.5)
        .fillColor('#1E1E1E')
        .font('Helvetica')
        .text(finding, textX, summaryY, {
          width: summaryWidth - 12,
          align: 'left',
          lineGap: 2,
        });
      summaryY = doc.y + 5;
    });

    // Conclusion
    doc
      .fontSize(8.5)
      .fillColor('#1E1E1E')
      .font('Helvetica')
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

    // Markers table
    this.drawMarkersTable(doc, page1Markers, currentY);

    // Footer
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
    let currentY = this.MARGIN;

    // Header
    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    // Page Title
    doc
      .fontSize(10)
      .fillColor('#080B08')
      .font('Helvetica-Bold')
      .text('Your blood test summary (continued)', this.MARGIN, currentY, {
        width: this.CONTENT_WIDTH,
        align: 'center',
      });
    currentY += 25;

    // Markers table
    this.drawMarkersTable(doc, markers, currentY);

    // Footer
    this.drawFooter(doc, pageNum, totalPages);
  }

  private drawRecommendationsPage(
    doc: PDFKit.PDFDocument,
    logoBuffer: Buffer | null,
    reportDate: string,
    inputData: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
    totalPages: number,
  ) {
    let currentY = this.MARGIN;

    // Header
    this.drawHeader(doc, logoBuffer, reportDate, currentY);
    currentY += 50;

    // Page Title
    doc
      .fontSize(10)
      .fillColor('#080B08')
      .font('Helvetica-Bold')
      .text('Your personalized recommendations', this.MARGIN, currentY, {
        width: this.CONTENT_WIDTH,
        align: 'center',
      });
    currentY += 25;

    // Top border
    doc
      .moveTo(this.MARGIN, currentY)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, currentY)
      .strokeColor('#DCDCDC')
      .lineWidth(1)
      .stroke();
    currentY += 15;

    // Nutrition advice
    if (inputData.nutritionAdvice && analysisResult.nutritionRecommendations) {
      currentY = this.drawRecommendationSection(
        doc,
        'Nutrition advice',
        analysisResult.nutritionRecommendations.descriptions,
        currentY,
      );
    }

    // Supplement recommendations
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

    // Medical guidance
    if (inputData.medicationGuidance && analysisResult.drugsRecommendations) {
      currentY = this.drawRecommendationSection(
        doc,
        'Medical guidance',
        analysisResult.drugsRecommendations.descriptions,
        currentY,
      );
    }

    // Exercise guidelines
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

    // Bottom border
    doc
      .moveTo(this.MARGIN, currentY)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, currentY)
      .strokeColor('#DCDCDC')
      .lineWidth(1)
      .stroke();
    currentY += 15;

    // Q&A section
    if (inputData.additionalQuestions && analysisResult.userQuestionResponse) {
      doc
        .fontSize(10)
        .fillColor('#1F2937')
        .font('Helvetica-Bold')
        .text('Answer to your question', this.MARGIN, currentY, {
          width: this.CONTENT_WIDTH,
          align: 'center',
        });
      currentY += 20;

      // Q&A box
      const boxY = currentY;
      doc
        .roundedRect(this.MARGIN, boxY, this.CONTENT_WIDTH, 100, 6)
        .lineWidth(1)
        .strokeColor('#DCDCDC')
        .fillColor('#FDFDFD')
        .fillAndStroke();

      // Left accent border
      doc.rect(this.MARGIN, boxY, 4, 100).fillColor('#14B8A6').fill();

      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#525252')
        .font('Helvetica')
        .text('Your Question:', this.MARGIN + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
        });
      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#1E1E1E')
        .font('Helvetica-Oblique')
        .text(
          `"${analysisResult.userQuestionResponse.question}"`,
          this.MARGIN + 15,
          currentY,
          {
            width: this.CONTENT_WIDTH - 30,
            align: 'left',
            lineGap: 2,
          },
        );
      currentY = doc.y + 15;

      doc
        .fontSize(9)
        .fillColor('#525252')
        .font('Helvetica')
        .text('AI recommendations:', this.MARGIN + 15, currentY, {
          width: this.CONTENT_WIDTH - 30,
          align: 'left',
        });
      currentY += 15;

      doc
        .fontSize(9)
        .fillColor('#1E1E1E')
        .font('Helvetica')
        .text(
          analysisResult.userQuestionResponse.answer,
          this.MARGIN + 15,
          currentY,
          {
            width: this.CONTENT_WIDTH - 30,
            align: 'left',
            lineGap: 2,
          },
        );
    }

    // Footer
    this.drawFooter(doc, totalPages, totalPages);
  }

  private drawRecommendationSection(
    doc: PDFKit.PDFDocument,
    title: string,
    items: string[],
    startY: number,
  ): number {
    let currentY = startY;

    // Section title
    doc
      .fontSize(9.5)
      .fillColor('#1F2937')
      .font('Helvetica')
      .text(title, this.MARGIN + 5, currentY, { align: 'left' });
    currentY += 18;

    // Items with bullets
    items.forEach((item) => {
      const bulletX = this.MARGIN + 20;
      const textX = this.MARGIN + 32;

      doc
        .fontSize(8.5)
        .fillColor('#1F2937')
        .font('Helvetica')
        .text('•', bulletX, currentY);

      doc
        .fontSize(8.5)
        .fillColor('#1F2937')
        .font('Helvetica')
        .text(item, textX, currentY, {
          width: this.CONTENT_WIDTH - 42,
          align: 'left',
          lineGap: 2,
        });
      currentY = doc.y + 8;
    });

    // Divider line
    doc
      .moveTo(this.MARGIN, currentY)
      .lineTo(this.PAGE_WIDTH - this.MARGIN, currentY)
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

    // Table border
    doc
      .roundedRect(this.MARGIN, currentY, tableWidth, 30, 8)
      .lineWidth(1)
      .strokeColor('#DCDCDC')
      .stroke();

    // Header background
    doc
      .roundedRect(this.MARGIN, currentY, tableWidth, 30, 8)
      .fillColor('#FDFDFD')
      .fill();

    // Header text
    const headerY = currentY + 10;
    doc
      .fontSize(9)
      .fillColor('#080B08')
      .font('Helvetica-Bold')
      .text('Marker', this.MARGIN + 10, headerY, {
        width: col1Width - 20,
        align: 'left',
      })
      .text('Value', this.MARGIN + col1Width + 10, headerY, {
        width: col2Width - 20,
        align: 'left',
      })
      .text('Normal Range', this.MARGIN + col1Width + col2Width + 10, headerY, {
        width: col3Width - 20,
        align: 'left',
      })
      .text(
        'Interpretation',
        this.MARGIN + col1Width + col2Width + col3Width + 10,
        headerY,
        { width: col4Width - 20, align: 'left' },
      );

    currentY += 30;

    // Header bottom border
    doc
      .moveTo(this.MARGIN, currentY)
      .lineTo(this.MARGIN + tableWidth, currentY)
      .strokeColor('#DCDCDC')
      .lineWidth(1)
      .stroke();

    // Rows
    markers.forEach((marker, index) => {
      const rowHeight = 40;
      const rowY = currentY + 12;

      // Status dot
      const statusClass = marker.status.toLowerCase().replace(/ /g, '-');
      const dotColor = this.getStatusColor(statusClass);
      doc
        .circle(this.MARGIN + 15, rowY + 4, 5)
        .fillColor(dotColor)
        .fill();

      // Marker name
      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Helvetica')
        .text(marker.markerName, this.MARGIN + 30, rowY, {
          width: col1Width - 40,
          align: 'left',
        });

      // Value
      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Helvetica')
        .text(String(marker.value), this.MARGIN + col1Width + 10, rowY, {
          width: col2Width - 20,
          align: 'left',
        });

      // Range bar and text
      const barX = this.MARGIN + col1Width + col2Width + 10;
      const barY = rowY + 3;
      this.drawHealthBar(doc, barX, barY, marker);

      const rangeText = `${marker.referenceMin} - ${marker.referenceMax} ${marker.unit}`;
      doc
        .fontSize(9)
        .fillColor('#080B08')
        .font('Helvetica')
        .text(rangeText, barX + 130, rowY, {
          width: col3Width - 140,
          align: 'left',
        });

      // Status badge
      this.drawStatusBadge(
        doc,
        marker.status,
        this.MARGIN + col1Width + col2Width + col3Width + 10,
        rowY - 2,
      );

      currentY += rowHeight;

      // Row border (except last)
      if (index < markers.length - 1) {
        doc
          .moveTo(this.MARGIN, currentY)
          .lineTo(this.MARGIN + tableWidth, currentY)
          .strokeColor('#DCDCDC')
          .lineWidth(0.5)
          .stroke();
      }
    });

    // Final table border
    const tableHeight = currentY - startY;
    doc
      .roundedRect(this.MARGIN, startY, tableWidth, tableHeight, 8)
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

    // Determine color based on score
    const colors = this.getScoreColors(score);

    // Background circle (light gray)
    doc
      .circle(centerX, centerY, radius)
      .lineWidth(lineWidth)
      .strokeColor('#E5E7EB')
      .stroke();

    // Progress arc (67% fixed) - draw gradient effect with multiple segments
    const percentage = 67;
    const angle = (percentage / 100) * 360;
    const startAngle = -90;
    const segments = 20; // Create smooth gradient with multiple arcs

    for (let i = 0; i < segments; i++) {
      const segmentAngle = angle / segments;
      const currentStartAngle = startAngle + i * segmentAngle;
      const currentEndAngle = currentStartAngle + segmentAngle;

      // Interpolate color from 'to' to 'from' (reverse gradient)
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
    // Convert hex to RGB
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    // Convert back to hex
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

    // Draw gradient bar (simplified as segments)
    const segments = [
      { color: '#EF4444', start: 0, end: 0.2 },
      { color: '#F59E0B', start: 0.2, end: 0.3 },
      { color: '#10B981', start: 0.3, end: 0.7 },
      { color: '#F59E0B', start: 0.7, end: 0.8 },
      { color: '#EF4444', start: 0.8, end: 1.0 },
    ];

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

    // Calculate indicator position
    const position = this.calculateMarkerPosition(
      Number(marker.value),
      Number(marker.referenceMin),
      Number(marker.referenceMax),
    );

    // Draw indicator
    const indicatorX = x + (barWidth * position) / 100;
    const statusClass = marker.status.toLowerCase().replace(/ /g, '-');
    const indicatorColor = this.getStatusColor(statusClass);

    doc
      .fontSize(10)
      .fillColor(indicatorColor)
      .text('▼', indicatorX - 4, y - 12);
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

    // Badge background
    doc
      .roundedRect(x, y, badgeWidth, badgeHeight, 3)
      .lineWidth(1)
      .strokeColor(borderColor)
      .fillColor(bgColor)
      .fillAndStroke();

    // Badge text
    doc
      .fontSize(8)
      .fillColor(textColor)
      .font('Helvetica')
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
