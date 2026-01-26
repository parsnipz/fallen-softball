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

  // Get "in" players with signatures
  const inPlayers = invitations
    .filter(inv => inv.status === 'in')
    .map(inv => ({
      name: `${inv.player?.first_name || ''} ${inv.player?.last_name || ''}`.trim(),
      firstName: inv.player?.first_name || '',
      lastName: inv.player?.last_name || '',
      phone: inv.player?.phone || '',
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

  let yPos = 12

  // Header - Tournament Name and Team Info on one line
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(tournament.name, pageWidth / 2, yPos, { align: 'center' })
  yPos += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dateStr = tournament.date ? new Date(tournament.date + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : ''
  const headerInfo = `Team: Fallen | St. George, Utah | ${dateStr}${tournament.location ? ' | ' + tournament.location : ''}`
  doc.text(headerInfo, pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  // Single table with all players
  const rowHeight = 10

  autoTable(doc, {
    startY: yPos,
    head: [['', 'Name', 'Phone', 'Address', 'Signature']],
    body: allPlayers.map((player, index) => [
      index + 1,
      player.name,
      player.phone,
      player.address,
      ''
    ]),
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 100 },
      4: { cellWidth: 70 }
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const player = allPlayers[data.row.index]

        // Highlight coaches with background
        if (player.isCoach && data.column.index === 1) {
          doc.setFillColor(219, 234, 254)
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
          doc.setTextColor(0)
          doc.text(player.name + ' (Coach)', data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1)
        }

        // Add signature images
        if (data.column.index === 4 && player.signatureUrl && signatureImages[player.signatureUrl]) {
          const imgData = signatureImages[player.signatureUrl]
          const imgHeight = data.cell.height - 2
          const imgWidth = imgHeight * 3

          doc.addImage(
            imgData,
            'PNG',
            data.cell.x + 2,
            data.cell.y + 1,
            imgWidth,
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

  yPos = doc.lastAutoTable.finalY + 5

  // Summary on one line
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ${inPlayers.length} players (${femaleCount} F, ${maleCount} M)`, 10, yPos)

  // Save the PDF
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_roster.pdf`
  doc.save(filename)
}
