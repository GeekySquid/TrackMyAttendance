import jsPDF from 'jspdf';

export const generateCertificate = (
  studentName: string,
  courseName: string,
  instituteName: string,
  date: string,
  issueReason: string = "Outstanding Attendance & Performance"
) => {
  // A4 Landscape: 297 x 210 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background color
  doc.setFillColor(252, 252, 253);
  doc.rect(0, 0, width, height, 'F');

  // Decorative Border
  doc.setDrawColor(218, 165, 32); // Goldenrod
  doc.setLineWidth(4);
  doc.rect(10, 10, width - 20, height - 20);

  doc.setDrawColor(30, 64, 175); // Blue 800
  doc.setLineWidth(1);
  doc.rect(14, 14, width - 28, height - 28);

  // Top/Bottom Ribbons or Shapes
  doc.setFillColor(218, 165, 32);
  doc.triangle(10, 10, 40, 10, 10, 40, 'F');
  doc.triangle(width - 10, 10, width - 40, 10, width - 10, 40, 'F');
  doc.triangle(10, height - 10, 40, height - 10, 10, height - 40, 'F');
  doc.triangle(width - 10, height - 10, width - 40, height - 10, width - 10, height - 40, 'F');

  // Title
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.text("CERTIFICATE", width / 2, 50, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(100, 116, 139); // Gray 500
  doc.setFont('helvetica', 'normal');
  doc.text("OF ACHIEVEMENT", width / 2, 60, { align: 'center' });

  // Institute Name
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'italic');
  doc.text(`Presented by ${instituteName}`, width / 2, 75, { align: 'center' });

  // Body
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text("This certificate is proudly awarded to", width / 2, 95, { align: 'center' });

  // Student Name
  doc.setFontSize(36);
  doc.setTextColor(218, 165, 32); // Golden
  doc.setFont('helvetica', 'bold');
  doc.text(studentName.toUpperCase(), width / 2, 115, { align: 'center' });

  // Underline for name
  const textWidth = doc.getTextWidth(studentName.toUpperCase());
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(width / 2 - textWidth / 2 - 10, 118, width / 2 + textWidth / 2 + 10, 118);

  // Reason / Details
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`for ${issueReason}`, width / 2, 130, { align: 'center' });
  doc.text(`in the ${courseName} course.`, width / 2, 140, { align: 'center' });

  // Seal / Badge at the bottom center
  const sealX = width / 2;
  const sealY = 175;
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 15, 'D');
  doc.setFillColor(218, 165, 32);
  doc.circle(sealX, sealY, 13, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("OFFICIAL", sealX, sealY - 2, { align: 'center' });
  doc.text("SEAL", sealX, sealY + 3, { align: 'center' });

  // Subtle Watermark
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text(instituteName.toUpperCase(), width / 2, height / 2, { align: 'center', angle: 45, opacity: 0.1 } as any);

  // Date and Signature lines
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);

  // Date
  doc.text(date, 60, 175, { align: 'center' });
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(40, 178, 80, 178);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text("Date of Issue", 60, 184, { align: 'center' });

  // Signature
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'italic');
  doc.text("Authorized Admin", width - 60, 175, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.setDrawColor(15, 23, 42);
  doc.line(width - 80, 178, width - 40, 178);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text("Signature", width - 60, 184, { align: 'center' });

  // Save the PDF
  doc.save(`${studentName.replace(/\s+/g, '_')}_Certificate.pdf`);
};
