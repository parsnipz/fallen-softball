import { PDFDocument, rgb } from 'pdf-lib'

/**
 * Creates a calibration PDF with grid lines and coordinate markers
 * to help position fields correctly on the AFA form
 */
export async function createCalibrationPDF() {
  // Load the AFA form template
  const formUrl = '/afa-roster-form.pdf'
  const formResponse = await fetch(formUrl)
  const formBytes = await formResponse.arrayBuffer()

  // Load the PDF
  const pdfDoc = await PDFDocument.load(formBytes)
  const page = pdfDoc.getPages()[0]
  const { width, height } = page.getSize()

  console.log('PDF Dimensions:', width, 'x', height)

  // Draw grid lines every 10 points
  const gridColor = rgb(0.85, 0.85, 1) // very light blue
  const midGridColor = rgb(0.7, 0.7, 1) // light blue for every 50
  const majorGridColor = rgb(0.5, 0.5, 1) // darker blue for every 100

  // Vertical lines (X axis)
  for (let x = 0; x <= width; x += 10) {
    const isMajor = x % 100 === 0
    const isMid = x % 50 === 0
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: isMajor ? 1 : (isMid ? 0.5 : 0.25),
      color: isMajor ? majorGridColor : (isMid ? midGridColor : gridColor),
      opacity: isMajor ? 0.6 : (isMid ? 0.5 : 0.3),
    })
    // Label X coordinates at top (every 50)
    if (isMid) {
      page.drawText(String(x), {
        x: x + 2,
        y: height - 12,
        size: 7,
        color: rgb(0, 0, 1),
      })
    }
  }

  // Horizontal lines (Y axis - remember PDF origin is bottom-left)
  for (let y = 0; y <= height; y += 10) {
    const isMajor = y % 100 === 0
    const isMid = y % 50 === 0
    page.drawLine({
      start: { x: 0, y },
      end: { x: width, y },
      thickness: isMajor ? 1 : (isMid ? 0.5 : 0.25),
      color: isMajor ? majorGridColor : (isMid ? midGridColor : gridColor),
      opacity: isMajor ? 0.6 : (isMid ? 0.5 : 0.3),
    })
    // Label Y coordinates on left (every 50)
    if (isMid) {
      const fromTop = Math.round(height - y)
      page.drawText(`y=${y} (top-${fromTop})`, {
        x: 2,
        y: y + 2,
        size: 6,
        color: rgb(0, 0, 1),
      })
    }
  }

  // Draw current field positions as red markers
  const markerColor = rgb(1, 0, 0)
  const fields = [
    // Header
    { name: 'Team', x: 237, fromTop: 61 },
    { name: 'Class', x: 410, fromTop: 61 },
    { name: 'Div', x: 484, fromTop: 61 },
    // Manager
    { name: 'Manager', x: 127, fromTop: 128 },
    // Address
    { name: 'City', x: 271, fromTop: 150 },
    { name: 'State', x: 424, fromTop: 150 },
    { name: 'Zip', x: 490, fromTop: 150 },
    // Manager extras (same line as Manager)
    { name: 'Mgr Email', x: 318, fromTop: 128 },
    { name: 'Mgr Phone', x: 490, fromTop: 128 },
    { name: 'Mgr Cell', x: 645, fromTop: 128 },
    // Manager address
    { name: 'Mgr Addr', x: 80, fromTop: 150 },
    // Player row 1
    { name: 'P1 Name', x: 61, fromTop: 198 },
    { name: 'P1 DOB', x: 230, fromTop: 198 },
    { name: 'P1 Addr', x: 284, fromTop: 198 },
    { name: 'P1 Sig', x: 630, fromTop: 198 },
    // Player row 2 (to show row spacing)
    { name: 'P2 Name', x: 61, fromTop: 216 },
    // Coach row 1
    { name: 'Coach1', x: 101, fromTop: 563 },
    { name: 'C1 Sig', x: 303, fromTop: 563 },
    { name: 'C1 Email', x: 490, fromTop: 563 },
    { name: 'C1 Phone', x: 660, fromTop: 563 },
  ]

  fields.forEach(field => {
    const y = height - field.fromTop
    // Draw crosshair
    page.drawLine({
      start: { x: field.x - 10, y },
      end: { x: field.x + 10, y },
      thickness: 2,
      color: markerColor,
    })
    page.drawLine({
      start: { x: field.x, y: y - 10 },
      end: { x: field.x, y: y + 10 },
      thickness: 2,
      color: markerColor,
    })
    // Label
    page.drawText(`${field.name} (${field.x}, top-${field.fromTop})`, {
      x: field.x + 12,
      y: y - 3,
      size: 7,
      color: markerColor,
    })
  })

  // Add dimension info at bottom
  page.drawText(`PDF Size: ${width} x ${height} points`, {
    x: 10,
    y: 10,
    size: 10,
    color: rgb(0, 0, 0),
  })

  // Save and download
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'AFA_Calibration_Grid.pdf'
  link.click()
  URL.revokeObjectURL(url)
}
