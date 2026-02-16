// Backend API Handler: /api/rating-assessments/download/route.js
// This handler generates PDF or Excel files from template data

import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Mark this route as dynamic to prevent static optimization issues
export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('=== Download API Called ===');
  
  try {
    // Parse request body
    let templateData, format;
    
    try {
      const body = await request.json();
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

    console.log('📥 Download request received');
    console.log('Format:', format);
    console.log('Template name:', templateData?.name);
    console.log('Template has categories:', !!templateData?.categories);
    console.log('Categories count:', templateData?.categories?.length || 0);

    // Validate template data
    if (!templateData) {
      console.error('❌ No template data provided');
      return NextResponse.json({ 
        error: 'Template data is required',
        received: typeof templateData
      }, { status: 400 });
    }

    if (!templateData.name) {
      console.error('❌ Template missing name');
      return NextResponse.json({ 
        error: 'Template must have a name',
        templateKeys: Object.keys(templateData || {})
      }, { status: 400 });
    }

    if (!templateData.categories || !Array.isArray(templateData.categories)) {
      console.error('❌ Template missing categories array');
      return NextResponse.json({ 
        error: 'Template must have categories array',
        hasCategories: !!templateData.categories,
        categoriesType: typeof templateData.categories
      }, { status: 400 });
    }

    console.log('✅ Template data validated');

    if (format === 'pdf') {
      console.log('📄 Generating PDF...');
      try {
        const pdfBuffer = await generatePDF(templateData);
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${templateData.name.replace(/\s+/g, '_')}_template.pdf"`,
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
        const excelBuffer = await generateExcel(templateData);
        console.log('✅ Excel generated successfully, size:', excelBuffer.length, 'bytes');
        
        return new NextResponse(excelBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${templateData.name.replace(/\s+/g, '_')}_template.xlsx"`,
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
    console.error('💥 Unexpected error in download handler:', error);
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

// Generate PDF from template data
async function generatePDF(template) {
  console.log('Starting PDF generation...');
  
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    console.log('PDF document initialized');

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(template.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text('Approved Credit Rating Assessment Template', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Template Information
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Approved: ${formatDate(template.approvedAt)}`, 14, yPosition);
    yPosition += 7;
    if (template.approvedBy) {
      doc.text(`Approved by: ${template.approvedBy}`, 14, yPosition);
      yPosition += 7;
    }
    doc.text(`Total Categories: ${template.categories?.length || 0}`, 14, yPosition);
    yPosition += 7;
    const totalQuestions = template.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0;
    doc.text(`Total Questions: ${totalQuestions}`, 14, yPosition);
    yPosition += 15;

    console.log('PDF header added');

    // Add a line
    doc.setDrawColor(34, 197, 94); // Green color
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, pageWidth - 14, yPosition);
    yPosition += 10;

    // Categories and Questions
    if (template.categories && Array.isArray(template.categories)) {
      console.log(`Processing ${template.categories.length} categories...`);
      
      template.categories.forEach((category, catIndex) => {
        console.log(`Processing category ${catIndex + 1}: ${category.categoryName}`);
        
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Category Header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(34, 197, 94); // Green color
        doc.text(`${catIndex + 1}. ${category.categoryName}`, 14, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${category.questions?.length || 0} Questions`, 14, yPosition);
        yPosition += 10;

        // Questions in this category
        if (category.questions && Array.isArray(category.questions)) {
          category.questions.forEach((question, qIndex) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              doc.addPage();
              yPosition = 20;
            }

            // Question
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0);
            const questionText = `Q${qIndex + 1}: ${question.text || 'Untitled Question'}`;
            const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 28);
            doc.text(splitQuestion, 18, yPosition);
            yPosition += splitQuestion.length * 5 + 3;

            // Weights
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100);
            doc.text(`New Customer Weight: ${question.proposedWeight?.new || 0}%`, 22, yPosition);
            yPosition += 5;
            doc.text(`Existing Customer Weight: ${question.proposedWeight?.existing || 0}%`, 22, yPosition);
            yPosition += 8;

            // Answers Table
            const answersData = question.answers?.map((answer, aIndex) => [
              `${aIndex + 1}. ${answer.text || 'Untitled Answer'}`,
              `${answer.score?.new || 0}`,
              `${answer.score?.existing || 0}`
            ]) || [];

            if (answersData.length > 0) {
              // Use autoTable function directly (imported at top)
              autoTable(doc, {
                startY: yPosition,
                head: [['Answer', 'New Score', 'Existing Score']],
                body: answersData,
                margin: { left: 22 },
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: pageWidth - 70 },
                  1: { cellWidth: 20, halign: 'center' },
                  2: { cellWidth: 20, halign: 'center' }
                }
              });

              yPosition = doc.lastAutoTable.finalY + 10;
            }
          });
        }

        yPosition += 5;
      });
    }

    console.log('PDF content added');

    // Footer on each page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    console.log('PDF footer added, converting to buffer...');

    // Convert to ArrayBuffer then to Uint8Array for NextResponse
    const arrayBuffer = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('PDF conversion complete');
    
    return uint8Array;
  } catch (error) {
    console.error('Error in generatePDF:', error);
    throw error;
  }
}

// Generate Excel from template data
async function generateExcel(template) {
  console.log('Starting Excel generation...');
  
  try {
    const workbook = new ExcelJS.Workbook();
    
    console.log('Workbook created');
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Title
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = template.name;
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Subtitle
    summarySheet.mergeCells('A2:E2');
    const subtitleCell = summarySheet.getCell('A2');
    subtitleCell.value = 'Approved Credit Rating Assessment Template';
    subtitleCell.font = { size: 12, color: { argb: 'FF6B7280' } };
    subtitleCell.alignment = { horizontal: 'center' };
    summarySheet.getRow(2).height = 20;

    // Template Information
    summarySheet.getCell('A4').value = 'Template Information';
    summarySheet.getCell('A4').font = { bold: true, size: 12 };
    
    summarySheet.getCell('A5').value = 'Approved Date:';
    summarySheet.getCell('B5').value = formatDate(template.approvedAt);
    
    if (template.approvedBy) {
      summarySheet.getCell('A6').value = 'Approved By:';
      summarySheet.getCell('B6').value = template.approvedBy;
    }
    
    summarySheet.getCell('A7').value = 'Total Categories:';
    summarySheet.getCell('B7').value = template.categories?.length || 0;
    
    const totalQuestions = template.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0;
    summarySheet.getCell('A8').value = 'Total Questions:';
    summarySheet.getCell('B8').value = totalQuestions;

    // Category Summary Table
    summarySheet.getCell('A10').value = 'Category Overview';
    summarySheet.getCell('A10').font = { bold: true, size: 12 };
    
    const categoryHeaders = ['#', 'Category Name', 'Number of Questions'];
    summarySheet.addRow([]);
    const headerRow = summarySheet.addRow(categoryHeaders);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF16A34A' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    if (template.categories && Array.isArray(template.categories)) {
      template.categories.forEach((category, index) => {
        summarySheet.addRow([
          index + 1,
          category.categoryName || 'Untitled Category',
          category.questions?.length || 0
        ]);
      });
    }

    // Auto-fit columns
    summarySheet.columns = [
      { width: 5 },
      { width: 40 },
      { width: 20 }
    ];

    console.log('Summary sheet created');

    // Create a sheet for each category
    if (template.categories && Array.isArray(template.categories)) {
      console.log(`Creating ${template.categories.length} category sheets...`);
      
      template.categories.forEach((category, catIndex) => {
        const sheetName = `${catIndex + 1}. ${category.categoryName || 'Category'}`.substring(0, 31); // Excel sheet name limit
        const categorySheet = workbook.addWorksheet(sheetName);

        // Category Title
        categorySheet.mergeCells('A1:F1');
        const catTitleCell = categorySheet.getCell('A1');
        catTitleCell.value = `${catIndex + 1}. ${category.categoryName || 'Untitled Category'}`;
        catTitleCell.font = { size: 16, bold: true, color: { argb: 'FF16A34A' } };
        catTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        categorySheet.getRow(1).height = 25;

        let currentRow = 3;

        if (category.questions && Array.isArray(category.questions)) {
          category.questions.forEach((question, qIndex) => {
            // Question Header
            categorySheet.mergeCells(`A${currentRow}:F${currentRow}`);
            const questionCell = categorySheet.getCell(`A${currentRow}`);
            questionCell.value = `Q${qIndex + 1}: ${question.text || 'Untitled Question'}`;
            questionCell.font = { bold: true, size: 11 };
            questionCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFDCFCE7' }
            };
            currentRow++;

            // Weights
            categorySheet.getCell(`A${currentRow}`).value = 'New Customer Weight:';
            categorySheet.getCell(`B${currentRow}`).value = `${question.proposedWeight?.new || 0}%`;
            categorySheet.getCell(`D${currentRow}`).value = 'Existing Customer Weight:';
            categorySheet.getCell(`E${currentRow}`).value = `${question.proposedWeight?.existing || 0}%`;
            currentRow++;

            // Answer Headers
            const answerHeaderRow = categorySheet.getRow(currentRow);
            answerHeaderRow.values = ['#', 'Answer', '', '', 'New Score', 'Existing Score'];
            answerHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            answerHeaderRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF16A34A' }
            };
            answerHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
            currentRow++;

            // Answers
            if (question.answers && Array.isArray(question.answers)) {
              question.answers.forEach((answer, aIndex) => {
                const answerRow = categorySheet.getRow(currentRow);
                answerRow.values = [
                  aIndex + 1,
                  answer.text || 'Untitled Answer',
                  '',
                  '',
                  answer.score?.new || 0,
                  answer.score?.existing || 0
                ];
                answerRow.alignment = { vertical: 'middle' };
                categorySheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
                categorySheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center' };
                currentRow++;
              });
            }

            currentRow += 2; // Space between questions
          });
        }

        // Set column widths
        categorySheet.columns = [
          { width: 5 },
          { width: 50 },
          { width: 10 },
          { width: 10 },
          { width: 15 },
          { width: 15 }
        ];
        
        console.log(`Category sheet ${catIndex + 1} created`);
      });
    }

    console.log('All sheets created, generating buffer...');

    // Generate buffer and return as Uint8Array
    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    console.log('Excel conversion complete');
    
    return uint8Array;
  } catch (error) {
    console.error('Error in generateExcel:', error);
    throw error;
  }
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