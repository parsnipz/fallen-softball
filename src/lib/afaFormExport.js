import { PDFDocument, rgb } from 'pdf-lib'

// Coach names to identify
const COACHES = ['Layne Reed', 'Brayden Brooks']

// Team defaults (can be customized)
const TEAM_DEFAULTS = {
  teamName: 'Fallen',
  class: 'D',
  division: 'Coed',
  afaMembership: '',
  managerName: 'Layne Reed',
  managerEmail: '',
  managerPhone: '',
  managerCell: '',
  managerAddress: '',
  managerCity: 'St. George',
  managerState: 'UT',
  managerZip: '84770',
}

// Load image as array buffer
async function loadImageAsBytes(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.error('Failed to load image:', err)
    return null
  }
}

export async function exportAFAForm(tournament, invitations, options = {}) {
  const settings = { ...TEAM_DEFAULTS, ...options }

  // Update division based on tournament type
  if (tournament?.type === 'mens') {
    settings.division = 'Mens'
  } else if (tournament?.type === 'coed') {
    settings.division = 'Coed'
  }

  // Load the AFA form template
  const formUrl = '/afa-roster-form.pdf'
  const formResponse = await fetch(formUrl)
  const formBytes = await formResponse.arrayBuffer()

  // Load the PDF
  const pdfDoc = await PDFDocument.load(formBytes)
  const page = pdfDoc.getPages()[0]
  const { width, height } = page.getSize()

  // Font sizes
  const headerFontSize = 10
  const playerFontSize = 8
  const signatureHeight = 15

  // Get "in" players with signatures (excluding coaches)
  const inPlayers = invitations
    .filter(inv => inv.status === 'in')
    .map(inv => ({
      name: `${inv.player?.first_name || ''} ${inv.player?.last_name || ''}`.trim(),
      firstName: inv.player?.first_name || '',
      lastName: inv.player?.last_name || '',
      dob: inv.player?.date_of_birth || '',
      address: inv.player?.address || '',
      signatureUrl: inv.signature_url || null,
      isCoach: COACHES.some(coach =>
        `${inv.player?.first_name} ${inv.player?.last_name}`.toLowerCase() === coach.toLowerCase()
      ),
      email: inv.player?.email || '',
      phone: inv.player?.phone || '',
    }))

  // Separate coaches and players
  const coaches = inPlayers.filter(p => p.isCoach)
  const players = inPlayers
    .filter(p => !p.isCoach)
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  // === COORDINATE SYSTEM ===
  // PDF origin is bottom-left
  // Form is landscape letter size: ~792 x 612 points
  // All Y positions measured from TOP of page, then converted

  // === HEADER SECTION (Team Name line) ===
  // Team Name blank starts around x=155, line is ~55 from top
  const teamLineY = height - 55

  page.drawText(settings.teamName, {
    x: 158,
    y: teamLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Class (x=395)
  page.drawText(settings.class, {
    x: 398,
    y: teamLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Division (x=470)
  page.drawText(settings.division, {
    x: 473,
    y: teamLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // AFA Membership # (x=605)
  if (settings.afaMembership) {
    page.drawText(settings.afaMembership, {
      x: 608,
      y: teamLineY,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // === MANAGER SECTION ===
  // Manager line is ~95 from top
  const managerLineY = height - 95

  page.drawText(settings.managerName, {
    x: 95,
    y: managerLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Manager Email (x=310)
  if (settings.managerEmail) {
    page.drawText(settings.managerEmail, {
      x: 313,
      y: managerLineY,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // Manager Phone (x=505)
  if (settings.managerPhone) {
    page.drawText(settings.managerPhone, {
      x: 508,
      y: managerLineY,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // Manager Cell (x=655)
  if (settings.managerCell) {
    page.drawText(settings.managerCell, {
      x: 658,
      y: managerLineY,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // === ADDRESS LINE ===
  // Address line is ~110 from top
  const addressLineY = height - 110

  if (settings.managerAddress) {
    page.drawText(settings.managerAddress, {
      x: 52,
      y: addressLineY,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // City (x=250)
  page.drawText(settings.managerCity, {
    x: 253,
    y: addressLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // State (x=405)
  page.drawText(settings.managerState, {
    x: 408,
    y: addressLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Zip (x=470)
  page.drawText(settings.managerZip, {
    x: 473,
    y: addressLineY,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // === PLAYER ROWS ===
  // Player table header is at ~125 from top
  // First player row starts at ~143 from top
  // Each row is approximately 24 points tall
  // There are 16 player rows
  const playerStartY = height - 143
  const rowHeight = 24.3
  const maxPlayers = 16

  // Column X positions for player table
  const playerNameX = 27
  const birthDateX = 163
  const addressX = 235
  const signatureX = 545

  // Load all signature images first
  const signatureImages = {}
  for (const player of [...players, ...coaches]) {
    if (player.signatureUrl) {
      const bytes = await loadImageAsBytes(player.signatureUrl)
      if (bytes) {
        try {
          const img = await pdfDoc.embedPng(bytes)
          signatureImages[player.signatureUrl] = img
        } catch (e) {
          console.error('Failed to embed signature:', e)
        }
      }
    }
  }

  // Draw players
  for (let i = 0; i < Math.min(players.length, maxPlayers); i++) {
    const player = players[i]
    const rowY = playerStartY - (i * rowHeight)

    // Player Name
    page.drawText(player.name, {
      x: playerNameX,
      y: rowY,
      size: playerFontSize,
      color: rgb(0, 0, 0),
    })

    // Birth Date
    if (player.dob) {
      const dobFormatted = new Date(player.dob + 'T00:00:00').toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
      page.drawText(dobFormatted, {
        x: birthDateX,
        y: rowY,
        size: playerFontSize,
        color: rgb(0, 0, 0),
      })
    }

    // Address - truncate if too long
    if (player.address) {
      const maxAddrLen = 45
      const addr = player.address.length > maxAddrLen
        ? player.address.substring(0, maxAddrLen) + '...'
        : player.address
      page.drawText(addr, {
        x: addressX,
        y: rowY,
        size: playerFontSize - 1,
        color: rgb(0, 0, 0),
      })
    }

    // Signature
    if (player.signatureUrl && signatureImages[player.signatureUrl]) {
      const sigImg = signatureImages[player.signatureUrl]
      const sigAspect = sigImg.width / sigImg.height
      const sigH = signatureHeight
      const sigW = sigH * sigAspect

      page.drawImage(sigImg, {
        x: signatureX,
        y: rowY - 4,
        width: Math.min(sigW, 200),
        height: sigH,
      })
    }
  }

  // === COACH SECTION ===
  // Coach table is at the bottom
  // Coach header row is at ~530 from top
  // First coach data row is at ~548 from top
  // Second coach row is at ~572 from top
  const coachRow1Y = height - 548
  const coachRow2Y = height - 572
  const coachRows = [coachRow1Y, coachRow2Y]

  // Coach column X positions
  const coachNameX = 27
  const coachSigX = 200
  const coachEmailX = 410
  const coachPhoneX = 610

  for (let i = 0; i < Math.min(coaches.length, 2); i++) {
    const coach = coaches[i]
    const rowY = coachRows[i]

    // Coach Name
    page.drawText(coach.name, {
      x: coachNameX,
      y: rowY,
      size: playerFontSize,
      color: rgb(0, 0, 0),
    })

    // Coach Signature
    if (coach.signatureUrl && signatureImages[coach.signatureUrl]) {
      const sigImg = signatureImages[coach.signatureUrl]
      const sigAspect = sigImg.width / sigImg.height
      const sigH = signatureHeight
      const sigW = sigH * sigAspect

      page.drawImage(sigImg, {
        x: coachSigX,
        y: rowY - 4,
        width: Math.min(sigW, 160),
        height: sigH,
      })
    }

    // Email
    if (coach.email) {
      page.drawText(coach.email, {
        x: coachEmailX,
        y: rowY,
        size: playerFontSize,
        color: rgb(0, 0, 0),
      })
    }

    // Phone
    if (coach.phone) {
      page.drawText(coach.phone, {
        x: coachPhoneX,
        y: rowY,
        size: playerFontSize,
        color: rgb(0, 0, 0),
      })
    }
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save()

  // Download the file
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_AFA_Roster.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
