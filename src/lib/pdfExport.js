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
  const doc = new jsPDF()

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

  // Count by gender
  const maleCount = inPlayers.filter(p => p.gender === 'M').length
  const femaleCount = inPlayers.filter(p => p.gender === 'F').length

  let yPos = 20

  // Header - Tournament Name
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(tournament.name, doc.internal.pageSize.width / 2, yPos, { align: 'center' })
  yPos += 10

  // Team info
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Team: Fallen', doc.internal.pageSize.width / 2, yPos, { align: 'center' })
  yPos += 7
  doc.text('St. George, Utah', doc.internal.pageSize.width / 2, yPos, { align: 'center' })
  yPos += 7

  // Tournament date and location
  doc.setFontSize(11)
  const dateStr = tournament.date ? new Date(tournament.date + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : ''
  const locationStr = tournament.location ? ` | ${tournament.location}` : ''
  doc.text(`${dateStr}${locationStr}`, doc.internal.pageSize.width / 2, yPos, { align: 'center' })
  yPos += 15

  // Helper to create table with signature images
  const createTableWithSignatures = (playerList, startY, isCoach = false) => {
    const rowHeight = 15

    autoTable(doc, {
      startY: startY,
      head: [['Name', 'Phone', 'Address', 'Signature']],
      body: playerList.map(player => [
        player.name,
        player.phone,
        player.address,
        '' // Empty - we'll add images after
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      bodyStyles: isCoach ? {
        fillColor: [219, 234, 254],
        minCellHeight: rowHeight
      } : {
        minCellHeight: rowHeight
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 70 },
        3: { cellWidth: 30 }
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        // Add signature images to the signature column
        if (data.section === 'body' && data.column.index === 3) {
          const player = playerList[data.row.index]
          if (player.signatureUrl && signatureImages[player.signatureUrl]) {
            const imgData = signatureImages[player.signatureUrl]
            const cellWidth = data.cell.width
            const cellHeight = data.cell.height
            const imgWidth = cellWidth - 2
            const imgHeight = cellHeight - 2

            doc.addImage(
              imgData,
              'PNG',
              data.cell.x + 1,
              data.cell.y + 1,
              imgWidth,
              imgHeight
            )
          }
        }
      }
    })

    return doc.lastAutoTable.finalY
  }

  // Coaches section
  if (coaches.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('COACHES', 14, yPos)
    yPos += 2

    yPos = createTableWithSignatures(coaches, yPos, true) + 10
  }

  // Players section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('PLAYERS', 14, yPos)
  yPos += 2

  yPos = createTableWithSignatures(players, yPos, false) + 15

  // Summary
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('ROSTER SUMMARY', 14, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')
  doc.text(`Total Players: ${inPlayers.length}`, 14, yPos)
  yPos += 6
  doc.text(`Female: ${femaleCount}`, 14, yPos)
  yPos += 6
  doc.text(`Male: ${maleCount}`, 14, yPos)

  // Save the PDF
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_roster.pdf`
  doc.save(filename)
}
