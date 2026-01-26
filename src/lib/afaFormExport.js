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
  const managerFontSize = 8
  const playerFontSize = 8
  const signatureHeight = 15

  // Dark blue color for all added info
  const textColor = rgb(0, 0, 0.6)

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

  // Separate coaches (for coach section) but include everyone in player list
  const coaches = inPlayers.filter(p => p.isCoach)
  const players = inPlayers
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  // If manager name matches a player, use their contact info
  const managerPlayer = inPlayers.find(p =>
    p.name.toLowerCase() === settings.managerName.toLowerCase()
  )
  if (managerPlayer) {
    if (!settings.managerEmail && managerPlayer.email) {
      settings.managerEmail = managerPlayer.email
    }
    if (!settings.managerPhone && managerPlayer.phone) {
      settings.managerPhone = managerPlayer.phone
    }
    if (!settings.managerCell && managerPlayer.phone) {
      settings.managerCell = managerPlayer.phone
    }
    if (!settings.managerAddress && managerPlayer.address) {
      settings.managerAddress = managerPlayer.address
    }
  }

  // === COORDINATE SYSTEM ===
  // PDF origin is bottom-left
  // Form is landscape letter size: ~792 x 612 points
  // All Y positions measured from TOP of page, then converted

  // === HEADER SECTION (Team Name line) ===
  // Team Name blank starts around x=237, line is ~61 from top
  const teamLineY = height - 61

  page.drawText(settings.teamName, {
    x: 237,
    y: teamLineY,
    size: headerFontSize,
    color: textColor,
  })

  // Class (x=410)
  page.drawText(settings.class, {
    x: 410,
    y: teamLineY,
    size: headerFontSize,
    color: textColor,
  })

  // Division (x=484)
  page.drawText(settings.division, {
    x: 484,
    y: teamLineY,
    size: headerFontSize,
    color: textColor,
  })

  // AFA Membership # (x=560)
  if (settings.afaMembership) {
    page.drawText(settings.afaMembership, {
      x: 560,
      y: teamLineY,
      size: headerFontSize,
      color: textColor,
    })
  }

  // === MANAGER SECTION ===
  // Manager line is ~128 from top
  const managerLineY = height - 128

  page.drawText(settings.managerName, {
    x: 127,
    y: managerLineY,
    size: managerFontSize,
    color: textColor,
  })

  // Manager Email (x=318)
  if (settings.managerEmail) {
    page.drawText(settings.managerEmail, {
      x: 318,
      y: managerLineY,
      size: managerFontSize,
      color: textColor,
    })
  }

  // Manager Phone (x=490)
  if (settings.managerPhone) {
    page.drawText(settings.managerPhone, {
      x: 490,
      y: managerLineY,
      size: managerFontSize,
      color: textColor,
    })
  }

  // Manager Cell (x=645)
  if (settings.managerCell) {
    page.drawText(settings.managerCell, {
      x: 645,
      y: managerLineY,
      size: managerFontSize,
      color: textColor,
    })
  }

  // === ADDRESS LINE ===
  // Address line is ~150 from top (between manager and player rows)
  const addressLineY = height - 150

  if (settings.managerAddress) {
    page.drawText(settings.managerAddress, {
      x: 70,
      y: addressLineY,
      size: managerFontSize,
      color: textColor,
    })
  }

  // City (x=271)
  page.drawText(settings.managerCity, {
    x: 271,
    y: addressLineY,
    size: managerFontSize,
    color: textColor,
  })

  // State (x=424)
  page.drawText(settings.managerState, {
    x: 424,
    y: addressLineY,
    size: managerFontSize,
    color: textColor,
  })

  // Zip (x=490)
  page.drawText(settings.managerZip, {
    x: 490,
    y: addressLineY,
    size: managerFontSize,
    color: textColor,
  })

  // === PLAYER ROWS ===
  // Player table header is at ~181 from top
  // First player row starts at ~201 from top
  // Each row is 19 points tall
  // There are 16 player rows
  const playerStartY = height - 201
  const rowHeight = 19
  const maxPlayers = 16

  // Column X positions for player table
  const playerNameX = 61
  const birthDateX = 230
  const addressX = 284
  const signatureX = 630

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

  // Manager Signature (x=630)
  if (managerPlayer && managerPlayer.signatureUrl && signatureImages[managerPlayer.signatureUrl]) {
    const sigImg = signatureImages[managerPlayer.signatureUrl]
    const sigAspect = sigImg.width / sigImg.height
    const sigH = signatureHeight
    const sigW = sigH * sigAspect

    page.drawImage(sigImg, {
      x: 630,
      y: addressLineY - 4,
      width: Math.min(sigW, 150),
      height: sigH,
    })
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
      color: textColor,
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
        color: textColor,
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
        size: playerFontSize,
        color: textColor,
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
  // First coach data row is at ~563 from top
  // Second coach row is at ~587 from top
  const coachRow1Y = height - 563
  const coachRow2Y = height - 587
  const coachRows = [coachRow1Y, coachRow2Y]

  // Coach column X positions
  const coachNameX = 101
  const coachSigX = 303
  const coachEmailX = 490
  const coachPhoneX = 660

  for (let i = 0; i < Math.min(coaches.length, 2); i++) {
    const coach = coaches[i]
    const rowY = coachRows[i]

    // Coach Name
    page.drawText(coach.name, {
      x: coachNameX,
      y: rowY,
      size: playerFontSize,
      color: textColor,
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
        color: textColor,
      })
    }

    // Phone
    if (coach.phone) {
      page.drawText(coach.phone, {
        x: coachPhoneX,
        y: rowY,
        size: playerFontSize,
        color: textColor,
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
