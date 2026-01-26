import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Coach names to highlight
const COACHES = ['Layne Reed', 'Brayden Brooks']

// Load image as base64
async function loadImage(url) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Failed to load signature image:', err)
    return null
  }
}

export async function exportRosterPDF(tournament, invitations) {
  // Landscape orientation
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // Get "in" players with signatures
  const inPlayers = invitations
    .filter(inv => inv.status === 'in')
    .map(inv => ({
      name: `${inv.player?.first_name || ''} ${inv.player?.last_name || ''}`.trim(),
      firstName: inv.player?.first_name || '',
      lastName: inv.player?.last_name || '',
      phone: inv.player?.phone || '',
      email: inv.player?.email || '',
      address: inv.player?.address || '',
      gender: inv.player?.gender || '',
      signatureUrl: inv.signature_url || null,
      isCoach: COACHES.some(coach =>
        `${inv.player?.first_name} ${inv.player?.last_name}`.toLowerCase() === coach.toLowerCase()
      )
    }))

  // Load all signature images
  const signatureImages = {}
  for (const player of inPlayers) {
    if (player.signatureUrl) {
      signatureImages[player.signatureUrl] = await loadImage(player.signatureUrl)
    }
  }

  // Separate coaches and players
  const coaches = inPlayers.filter(p => p.isCoach)
  const players = inPlayers
    .filter(p => !p.isCoach)
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  // Combine: coaches first, then players
  const allPlayers = [...coaches, ...players]

  // Count by gender
  const maleCount = inPlayers.filter(p => p.gender === 'M').length
  const femaleCount = inPlayers.filter(p => p.gender === 'F').length

  // Fixed layout calculations - optimized for 16 players
  const headerHeight = 20
  const footerHeight = 10
  const tableHeaderHeight = 8
  const availableHeight = pageHeight - headerHeight - footerHeight - tableHeaderHeight - 10
  const rowHeight = availableHeight / 16  // Fixed for 16 rows

  let yPos = 10

  // Header - Tournament Name and Team Info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(tournament.name, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const dateStr = tournament.date ? new Date(tournament.date + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : ''
  const headerInfo = `Team: Fallen | St. George, Utah | ${dateStr}${tournament.location ? ' | ' + tournament.location : ''}`
  doc.text(headerInfo, pageWidth / 2, yPos, { align: 'center' })
  yPos += 5

  // Table with fixed row heights
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Name', 'Phone', 'Email', 'Address', 'Signature']],
    body: allPlayers.map((player, index) => [
      index + 1,
      player.isCoach ? player.name + ' (Coach)' : player.name,
      player.phone,
      player.email,
      player.address,
      ''
    ]),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1,
      minCellHeight: rowHeight,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: tableHeaderHeight,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 28 },
      3: { cellWidth: 50 },
      4: { cellWidth: 75 },
      5: { cellWidth: 66 }
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const player = allPlayers[data.row.index]

        // Add signature images - maintain aspect ratio
        if (data.column.index === 5 && player.signatureUrl && signatureImages[player.signatureUrl]) {
          const imgData = signatureImages[player.signatureUrl]
          const padding = 1
          const maxHeight = data.cell.height - (padding * 2)
          const maxWidth = data.cell.width - (padding * 2)

          // Signature images are typically wider than tall (roughly 3:1 ratio)
          // Scale to fit height while maintaining aspect ratio
          const imgHeight = maxHeight
          const imgWidth = imgHeight * 3  // Maintain approximate signature aspect ratio

          // Center horizontally if image is narrower than cell
          const xOffset = imgWidth < maxWidth ? (maxWidth - imgWidth) / 2 : 0

          doc.addImage(
            imgData,
            'PNG',
            data.cell.x + padding + xOffset,
            data.cell.y + padding,
            Math.min(imgWidth, maxWidth),
            imgHeight
          )
        }
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const player = allPlayers[data.row.index]
        if (player.isCoach) {
          data.cell.styles.fillColor = [219, 234, 254]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    }
  })

  // Summary at bottom
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ${inPlayers.length} players (${femaleCount} F, ${maleCount} M)`, 10, pageHeight - 5)

  // Save the PDF
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_roster.pdf`
  doc.save(filename)
}
