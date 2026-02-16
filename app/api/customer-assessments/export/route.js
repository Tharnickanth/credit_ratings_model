// Backend API Handler: /api/customer-assessments/export/route.js
// This handler generates PDF or Excel files from customer assessment data

import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Mark this route as dynamic to prevent static optimization issues
export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('=== Customer Assessment Export API Called ===');
  
  try {
    // Parse request body
    let assessmentData, templateData, format;
    
    try {
      const body = await request.json();
      assessmentData = body.assessmentData;
      templateData = body.templateData;
      format = body.format;
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError.message 
      }, { status: 400 });
    }

    console.log('📥 Export request received');
    console.log('Format:', format);
    console.log('Customer name:', assessmentData?.customerName);
    console.log('Has assessment data:', !!assessmentData);
    console.log('Has template data:', !!templateData);

    // Validate assessment data
    if (!assessmentData) {
      console.error('❌ No assessment data provided');
      return NextResponse.json({ 
        error: 'Assessment data is required',
        received: typeof assessmentData
      }, { status: 400 });
    }

    if (!assessmentData.customerName) {
      console.error('❌ Assessment missing customer name');
      return NextResponse.json({ 
        error: 'Assessment must have a customer name',
        assessmentKeys: Object.keys(assessmentData || {})
      }, { status: 400 });
    }

    console.log('✅ Assessment data validated');

    if (format === 'pdf') {
      console.log('📄 Generating PDF...');
      try {
        const pdfBuffer = await generatePDF(assessmentData, templateData);
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${assessmentData.customerName.replace(/\s+/g, '_')}_assessment.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        });
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError);
        return NextResponse.json({ 
          error: 'Failed to generate PDF',
          details: pdfError.message,
          stack: pdfError.stack
        }, { status: 500 });
      }
    } else if (format === 'excel') {
      console.log('📊 Generating Excel...');
      try {
        const excelBuffer = await generateExcel(assessmentData, templateData);
        console.log('✅ Excel generated successfully, size:', excelBuffer.length, 'bytes');
        
        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${assessmentData.customerName.replace(/\s+/g, '_')}_assessment.xlsx"`,
            'Content-Length': excelBuffer.length.toString(),
          },
        });
      } catch (excelError) {
        console.error('❌ Excel generation failed:', excelError);
        return NextResponse.json({ 
          error: 'Failed to generate Excel',
          details: excelError.message,
          stack: excelError.stack
        }, { status: 500 });
      }
    } else {
      console.error('❌ Invalid format:', format);
      return NextResponse.json({ 
        error: 'Invalid format. Use "pdf" or "excel"',
        receivedFormat: format
      }, { status: 400 });
    }
  } catch (error) {
    console.error('💥 Unexpected error in export handler:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({ 
      error: 'Failed to generate file',
      errorName: error.name,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Generate PDF from assessment data
async function generatePDF(assessment, template) {
  console.log('Starting PDF generation...');
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    console.log('PDF document initialized');

    // ==================== PROFESSIONAL HEADER ====================
    // Blue header background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Orange accent line
    doc.setFillColor(243, 156, 18);
    doc.rect(0, 45, pageWidth, 3, 'F');
    
    // Title
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Credit Rating Assessment Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'normal');
    doc.text(assessment.customerName || 'N/A', pageWidth / 2, 35, { align: 'center' });
    
    yPosition = 58;

    // ==================== SCORE CARD (TOP PRIORITY) ====================
    const score = (assessment.totalScore || 0).toFixed(2);
    const rating = assessment.rating || calculateRating(assessment.totalScore || 0);
    
    // Determine score color
    let scoreColor, scoreBg;
    if (score >= 70) {
      scoreColor = [39, 174, 96];  // Green
      scoreBg = [209, 242, 235];
    } else if (score >= 50) {
      scoreColor = [41, 128, 185];  // Blue
      scoreBg = [214, 234, 248];
    } else {
      scoreColor = [243, 156, 18];  // Orange
      scoreBg = [254, 245, 231];
    }
    
    // Score box with background
    doc.setFillColor(...scoreBg);
    doc.rect(14, yPosition, pageWidth - 28, 45, 'F');
    
    doc.setDrawColor(...scoreColor);
    doc.setLineWidth(2);
    doc.rect(14, yPosition, pageWidth - 28, 45, 'S');
    
    // Score content
    doc.setTextColor(...scoreColor);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('FINAL ASSESSMENT SCORE', pageWidth / 2, yPosition + 12, { align: 'center' });
    
    doc.setFontSize(36);
    doc.text(score, pageWidth / 2, yPosition + 28, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Rating: ${rating}`, pageWidth / 2, yPosition + 39, { align: 'center' });
    
    yPosition += 55;

    // ==================== SUMMARY TABLE ====================
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Assessment Summary', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    // Create summary table data
    const summaryData = [
      ['Customer Information', ''],
      ['Customer ID', assessment.customerId || 'N/A'],
      ['NIC Number', assessment.nic || 'N/A'],
      ['Customer Type', assessment.customerType === 'new' ? 'New Customer' : 'Existing Customer'],
      ['', ''],
      ['Assessment Template', ''],
      ['Template Name', assessment.assessmentTemplateName || 'Standard Template'],
      ['', ''],
      ['Assessment Details', ''],
      ['Assessed By', assessment.assessedBy || 'N/A'],
      ['Assessment Date', formatDate(assessment.assessmentDate)],
      ['', ''],
      ['Approval Information', ''],
      ['Approved By', assessment.approvedBy || 'N/A'],
      ['Approval Date', formatDate(assessment.approvedAt)]
    ];
    
    autoTable(doc, {
      startY: yPosition,
      body: summaryData,
      theme: 'plain',
      styles: { 
        fontSize: 10,
        cellPadding: 3,
        textColor: [44, 62, 80]
      },
      columnStyles: {
        0: { 
          cellWidth: 60,
          fontStyle: 'bold',
          textColor: [52, 73, 94]
        },
        1: { 
          cellWidth: 120,
          fontStyle: 'normal'
        }
      },
      didParseCell: function(data) {
        // Style section headers
        if (data.cell.raw === 'Customer Information' || 
            data.cell.raw === 'Assessment Template' || 
            data.cell.raw === 'Assessment Details' || 
            data.cell.raw === 'Approval Information') {
          data.cell.styles.fillColor = [41, 128, 185];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
          data.cell.colSpan = 2;
        }
        // Empty rows for spacing
        if (data.cell.raw === '' && data.column.index === 0) {
          data.cell.styles.cellPadding = 1;
        }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;

    console.log('Summary page completed');

    // ============ Category Breakdown ============
    // Check if we need a new page
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Page Title
    doc.setFillColor(41, 128, 185);
    doc.rect(14, yPosition, pageWidth - 28, 10, 'F');
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Category Breakdown', pageWidth / 2, yPosition + 6.5, { align: 'center' });
    yPosition += 15;
    doc.setTextColor(0, 0, 0);

    // Category Breakdown Table
    if (assessment.categoryScores && assessment.categoryScores.length > 0) {
      const tableData = assessment.categoryScores.map(cat => [
        cat.categoryName || 'N/A',
        (cat.score || 0).toFixed(2)
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Category', 'Score']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185], 
          fontSize: 11,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 10,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [236, 240, 241]
        },
        columnStyles: {
          0: { cellWidth: 140 },
          1: { halign: 'center', fontStyle: 'bold', textColor: [41, 128, 185] }
        },
        margin: { left: 14, right: 14 }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
    }

    console.log('Category breakdown page added');

    // ============ Detailed Responses (Continues on same or new page) ============
    if (template?.categories?.length > 0) {
      // Check if we need a new page for detailed responses
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(41, 128, 185);
      doc.rect(14, yPosition, pageWidth - 28, 10, 'F');
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Detailed Responses', pageWidth / 2, yPosition + 6.5, { align: 'center' });
      yPosition += 15;
      doc.setTextColor(0, 0, 0);
      
      console.log(`Processing ${template.categories.length} categories for detailed responses...`);
      
      template.categories.forEach((category, catIndex) => {
        console.log(`Processing category ${catIndex + 1}: ${category.categoryName}`);
        
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }

        // Category Header
        doc.setFillColor(243, 156, 18);
        doc.rect(14, yPosition, 4, 8, 'F');
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(`${catIndex + 1}. ${category.categoryName}`, 20, yPosition + 5.5);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');

        // Questions in this category
        if (category.questions && Array.isArray(category.questions)) {
          category.questions.forEach((question, qIndex) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              doc.addPage();
              yPosition = 20;
            }

            // Question
            const questionText = `Q${qIndex + 1}: ${question.text || 'Untitled Question'}`;
            const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 32);
            doc.setFont(undefined, 'bold');
            doc.text(splitQuestion, 18, yPosition);
            yPosition += splitQuestion.length * 5;

            // Weight
            const weight = assessment.customerType === 'new' 
              ? (question.proposedWeight?.new || 0)
              : (question.proposedWeight?.existing || 0);
            
            doc.setFont(undefined, 'italic');
            doc.setFontSize(9);
            doc.text(`Weight: ${weight}%`, 18, yPosition);
            yPosition += 6;

            // Find selected answer
            const selectedAnswer = (assessment.responses || assessment.answers || [])
              .find(a => a.questionId === question.questionId);

            // Answers
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            if (question.answers && Array.isArray(question.answers)) {
              question.answers.forEach((answer) => {
                const isSelected = selectedAnswer?.answerId === answer.answerId;
                const score = assessment.customerType === 'new'
                  ? (answer.score?.new || 0)
                  : (answer.score?.existing || 0);
                
                const marker = isSelected ? '[X]' : '[ ]';
                const answerText = `  ${marker} ${answer.text || 'N/A'} (Score: ${score})`;
                const splitAnswer = doc.splitTextToSize(answerText, pageWidth - 40);
                
                if (isSelected) {
                  doc.setFont(undefined, 'bold');
                }
                
                doc.text(splitAnswer, 22, yPosition);
                yPosition += splitAnswer.length * 4.5;
                
                if (isSelected) {
                  doc.setFont(undefined, 'normal');
                }
              });
            }

            yPosition += 5;
          });
        }

        yPosition += 5;
      });
    }

    console.log('Detailed responses added');

    // Footer on all pages
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    console.log('PDF footer added, converting to buffer...');

    // Convert to ArrayBuffer then to Uint8Array for NextResponse (CRITICAL!)
    const arrayBuffer = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('PDF conversion complete, buffer size:', uint8Array.length);
    
    return uint8Array;
  } catch (error) {
    console.error('Error in generatePDF:', error);
    throw error;
  }
}

// Generate Excel from assessment data
async function generateExcel(assessment, template) {
  console.log('Starting Excel generation...');
  
  try {
    const workbook = new ExcelJS.Workbook();
    
    console.log('Workbook created');
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Title
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Credit Rating Assessment Report';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Customer Name
    summarySheet.mergeCells('A2:E2');
    const customerCell = summarySheet.getCell('A2');
    customerCell.value = assessment.customerName || 'N/A';
    customerCell.font = { size: 14, bold: true };
    customerCell.alignment = { horizontal: 'center' };
    summarySheet.getRow(2).height = 25;

    // Assessment Information
    summarySheet.getCell('A4').value = 'Customer Information';
    summarySheet.getCell('A4').font = { bold: true, size: 12 };
    
    summarySheet.getCell('A5').value = 'Customer ID:';
    summarySheet.getCell('B5').value = assessment.customerId || 'N/A';
    
    summarySheet.getCell('A6').value = 'NIC:';
    summarySheet.getCell('B6').value = assessment.nic || 'N/A';
    
    summarySheet.getCell('A7').value = 'Customer Type:';
    summarySheet.getCell('B7').value = assessment.customerType === 'new' ? 'New Customer' : 'Existing Customer';
    
    summarySheet.getCell('A9').value = 'Template Information';
    summarySheet.getCell('A9').font = { bold: true, size: 12 };
    
    summarySheet.getCell('A10').value = 'Template:';
    summarySheet.getCell('B10').value = assessment.assessmentTemplateName || 'Standard Template';
    
    summarySheet.getCell('A12').value = 'Assessment Details';
    summarySheet.getCell('A12').font = { bold: true, size: 12 };
    
    summarySheet.getCell('A13').value = 'Assessed By:';
    summarySheet.getCell('B13').value = assessment.assessedBy || 'N/A';
    
    summarySheet.getCell('A14').value = 'Assessment Date:';
    summarySheet.getCell('B14').value = formatDate(assessment.assessmentDate);
    
    summarySheet.getCell('A16').value = 'Approval Information';
    summarySheet.getCell('A16').font = { bold: true, size: 12 };
    
    summarySheet.getCell('A17').value = 'Approved By:';
    summarySheet.getCell('B17').value = assessment.approvedBy || 'N/A';
    
    summarySheet.getCell('A18').value = 'Approved Date:';
    summarySheet.getCell('B18').value = formatDate(assessment.approvedAt);

    // Score
    summarySheet.getCell('A20').value = 'Final Score';
    summarySheet.getCell('A20').font = { bold: true, size: 14, color: { argb: 'FF16A34A' } };
    
    summarySheet.getCell('A21').value = 'Score:';
    summarySheet.getCell('B21').value = (assessment.totalScore || 0).toFixed(2);
    summarySheet.getCell('B21').font = { bold: true, size: 16 };
    
    summarySheet.getCell('A22').value = 'Rating:';
    summarySheet.getCell('B22').value = assessment.rating || calculateRating(assessment.totalScore || 0);
    summarySheet.getCell('B22').font = { bold: true, size: 14, color: { argb: 'FF16A34A' } };

    // Category Breakdown
    if (assessment.categoryScores?.length > 0) {
      summarySheet.getCell('A24').value = 'Category Breakdown';
      summarySheet.getCell('A24').font = { bold: true, size: 12 };
      
      summarySheet.addRow([]);
      const headerRow = summarySheet.addRow(['Category', 'Score']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF16A34A' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      assessment.categoryScores.forEach(cat => {
        summarySheet.addRow([
          cat.categoryName || 'N/A',
          (cat.score || 0).toFixed(2)
        ]);
      });
    }

    summarySheet.columns = [
      { width: 25 },
      { width: 40 },
      { width: 20 },
      { width: 20 },
      { width: 20 }
    ];

    console.log('Summary sheet created');

    // Detailed responses sheet
    if (template?.categories?.length > 0) {
      const detailSheet = workbook.addWorksheet('Details');
      
      detailSheet.mergeCells('A1:F1');
      detailSheet.getCell('A1').value = 'Detailed Assessment Responses';
      detailSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF16A34A' } };
      detailSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      detailSheet.getRow(1).height = 25;

      let currentRow = 3;

      console.log(`Creating ${template.categories.length} category sections...`);

      template.categories.forEach((category, catIndex) => {
        detailSheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const catCell = detailSheet.getCell(`A${currentRow}`);
        catCell.value = `${catIndex + 1}. ${category.categoryName || 'Untitled Category'}`;
        catCell.font = { bold: true, size: 13, color: { argb: 'FF16A34A' } };
        catCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' }
        };
        currentRow += 2;

        if (category.questions && Array.isArray(category.questions)) {
          category.questions.forEach((question, qIndex) => {
            // Question Header
            detailSheet.mergeCells(`A${currentRow}:F${currentRow}`);
            const questionCell = detailSheet.getCell(`A${currentRow}`);
            questionCell.value = `Q${qIndex + 1}: ${question.text || 'Untitled Question'}`;
            questionCell.font = { bold: true, size: 11 };
            questionCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3F4F6' }
            };
            currentRow++;

            // Weight
            const weight = assessment.customerType === 'new'
              ? (question.proposedWeight?.new || 0)
              : (question.proposedWeight?.existing || 0);
            
            detailSheet.getCell(`A${currentRow}`).value = `Weight: ${weight}%`;
            detailSheet.getCell(`A${currentRow}`).font = { italic: true, size: 9 };
            currentRow++;

            // Answer Headers
            const answerHeaderRow = detailSheet.getRow(currentRow);
            answerHeaderRow.values = ['', 'Answer', '', '', 'Score', 'Selected'];
            answerHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            answerHeaderRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF16A34A' }
            };
            answerHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
            currentRow++;

            // Find selected answer
            const selectedAnswer = (assessment.responses || assessment.answers || [])
              .find(a => a.questionId === question.questionId);

            // Answers
            if (question.answers && Array.isArray(question.answers)) {
              question.answers.forEach((answer) => {
                const isSelected = selectedAnswer?.answerId === answer.answerId;
                const score = assessment.customerType === 'new'
                  ? (answer.score?.new || 0)
                  : (answer.score?.existing || 0);

                const answerRow = detailSheet.getRow(currentRow);
                answerRow.values = ['', answer.text || 'N/A', '', '', score, isSelected ? '✓' : ''];
                
                if (isSelected) {
                  answerRow.font = { bold: true };
                  answerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDCFCE7' }
                  };
                }
                
                answerRow.alignment = { vertical: 'middle' };
                detailSheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
                detailSheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center' };
                currentRow++;
              });
            }

            currentRow += 2;
          });
        }

        currentRow += 2;
      });

      detailSheet.columns = [
        { width: 5 },
        { width: 60 },
        { width: 10 },
        { width: 10 },
        { width: 12 },
        { width: 12 }
      ];
      
      console.log('Detail sheet created');
    }

    console.log('All sheets created, generating buffer...');

    // Generate buffer and return as Uint8Array (CRITICAL!)
    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    console.log('Excel conversion complete, buffer size:', uint8Array.length);
    
    return uint8Array;
  } catch (error) {
    console.error('Error in generateExcel:', error);
    throw error;
  }
}

// Helper function to calculate rating
function calculateRating(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'A-';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  if (score >= 30) return 'C-';
  return 'D';
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}