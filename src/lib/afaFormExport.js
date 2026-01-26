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
  managerAddress: 'St. George',
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

  // Load the AFA form template
  const formUrl = '/afa-roster-form.pdf'
  const formResponse = await fetch(formUrl)
  const formBytes = await formResponse.arrayBuffer()

  // Load the PDF
  const pdfDoc = await PDFDocument.load(formBytes)
  const page = pdfDoc.getPages()[0]
  const { width, height } = page.getSize()

  // Font size for different sections
  const headerFontSize = 10
  const playerFontSize = 9
  const signatureHeight = 18

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

  // === HEADER SECTION ===
  // Team Name (approx x=175, y from top ~47)
  page.drawText(settings.teamName, {
    x: 175,
    y: height - 47,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Class (approx x=410)
  page.drawText(settings.class, {
    x: 410,
    y: height - 47,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Division (approx x=480)
  page.drawText(settings.division, {
    x: 480,
    y: height - 47,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // AFA Membership # (approx x=620)
  if (settings.afaMembership) {
    page.drawText(settings.afaMembership, {
      x: 620,
      y: height - 47,
      size: headerFontSize,
      color: rgb(0, 0, 0),
    })
  }

  // === MANAGER SECTION ===
  // Manager Name (y from top ~82)
  page.drawText(settings.managerName, {
    x: 100,
    y: height - 82,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Manager Email
  page.drawText(settings.managerEmail, {
    x: 320,
    y: height - 82,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Manager Phone
  page.drawText(settings.managerPhone, {
    x: 530,
    y: height - 82,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Manager Cell
  page.drawText(settings.managerCell, {
    x: 680,
    y: height - 82,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Address line (y from top ~97)
  page.drawText(settings.managerAddress, {
    x: 55,
    y: height - 97,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // City
  page.drawText(settings.managerCity, {
    x: 270,
    y: height - 97,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // State
  page.drawText(settings.managerState, {
    x: 430,
    y: height - 97,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // Zip
  page.drawText(settings.managerZip, {
    x: 495,
    y: height - 97,
    size: headerFontSize,
    color: rgb(0, 0, 0),
  })

  // === PLAYER ROWS ===
  // First player row starts at approximately y from top = 130
  // Each row is approximately 26 pixels tall
  const playerStartY = height - 130
  const rowHeight = 26.5
  const maxPlayers = 16 // Form has ~16 player rows

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

    // Player Name (x=30)
    page.drawText(player.name, {
      x: 30,
      y: rowY,
      size: playerFontSize,
      color: rgb(0, 0, 0),
    })

    // Birth Date (x=175)
    if (player.dob) {
      const dobFormatted = new Date(player.dob + 'T00:00:00').toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
      page.drawText(dobFormatted, {
        x: 175,
        y: rowY,
        size: playerFontSize,
        color: rgb(0, 0, 0),
      })
    }

    // Address (x=255)
    if (player.address) {
      // Truncate long addresses
      const addr = player.address.length > 40 ? player.address.substring(0, 40) + '...' : player.address
      page.drawText(addr, {
        x: 255,
        y: rowY,
        size: playerFontSize - 1,
        color: rgb(0, 0, 0),
      })
    }

    // Signature (x=580)
    if (player.signatureUrl && signatureImages[player.signatureUrl]) {
      const sigImg = signatureImages[player.signatureUrl]
      const sigAspect = sigImg.width / sigImg.height
      const sigHeight = signatureHeight
      const sigWidth = sigHeight * sigAspect

      page.drawImage(sigImg, {
        x: 580,
        y: rowY - 5,
        width: Math.min(sigWidth, 180),
        height: sigHeight,
      })
    }
  }

  // === COACH SECTION ===
  // Coach rows are at the bottom of the form
  // First coach row starts at approximately y from top = 555
  const coachStartY = height - 555
  const coachRowHeight = 26

  for (let i = 0; i < Math.min(coaches.length, 2); i++) {
    const coach = coaches[i]
    const rowY = coachStartY - (i * coachRowHeight)

    // Coach Name (x=30)
    page.drawText(coach.name, {
      x: 30,
      y: rowY,
      size: playerFontSize,
      color: rgb(0, 0, 0),
    })

    // Coach Signature (x=200)
    if (coach.signatureUrl && signatureImages[coach.signatureUrl]) {
      const sigImg = signatureImages[coach.signatureUrl]
      const sigAspect = sigImg.width / sigImg.height
      const sigHeight = signatureHeight
      const sigWidth = sigHeight * sigAspect

      page.drawImage(sigImg, {
        x: 200,
        y: rowY - 5,
        width: Math.min(sigWidth, 150),
        height: sigHeight,
      })
    }

    // Email (x=420)
    if (coach.email) {
      page.drawText(coach.email, {
        x: 420,
        y: rowY,
        size: playerFontSize,
        color: rgb(0, 0, 0),
      })
    }

    // Phone (x=620)
    if (coach.phone) {
      page.drawText(coach.phone, {
        x: 620,
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
