const DEFAULT_CENTER = {
  name: 'Centro de Evaluación de Conductores CABA (Parque Roca)',
  address: 'Av. Cruz y Av. Escalada, Villa Soldati, CABA',
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function parseSlot(slot) {
  const times = String(slot || '').match(/(\d{1,2}):(\d{2})/g) || []
  return { start: times[0] || '08:00', end: times[1] || '11:00' }
}

function compactDate(isoDate, hhmm) {
  const day = String(isoDate || '').replace(/-/g, '')
  const [hours, minutes] = String(hhmm || '08:00').split(':')
  return `${day}T${pad(hours || '08')}${pad(minutes || '00')}00`
}

function venueOf(item, center) {
  return item?.venue || center || DEFAULT_CENTER
}

export function calendarUrl(item, center) {
  const sede = venueOf(item, center)
  const slot = parseSlot(item.time_slot)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Examen práctico — RendiYa',
    dates: `${compactDate(item.date, slot.start)}/${compactDate(item.date, slot.end)}`,
    details: `Turno RendiYa #${item.id} · ${item.time_slot || ''}. Llevá DNI y el voucher.`,
    location: `${sede.name}, ${sede.address}`,
    ctz: 'America/Argentina/Buenos_Aires',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function showToast(message) {
  let el = document.getElementById('rendiya-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'rendiya-toast'
    el.className = 'rendiya-toast'
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.textContent = message
  el.hidden = false
  el.classList.add('is-on')
  window.clearTimeout(showToast._timer)
  showToast._timer = window.setTimeout(() => {
    el.classList.remove('is-on')
  }, 4500)
}

export function celebrateConfirmed() {
  showToast('¡Pago Aprobado! Tu turno para el examen fue confirmado')
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 110,
      spread: 76,
      startVelocity: 38,
      origin: { y: 0.72 },
      colors: ['#8b5cf6', '#22d3ee', '#3b82f6', '#f4f7ff', '#34d399'],
    })
  }
}

export function downloadVoucher(item, center) {
  const sede = venueOf(item, center)
  const JsPDF = window.jspdf?.jsPDF
  if (!JsPDF || !window.QRCode) {
    window.alert('No se pudo generar el PDF. Recargá la página e intentá de nuevo.')
    return
  }
  const payload = `RendiYa voucher #${item.id} | ${item.date} | ${item.time_slot}`
  window.QRCode.toDataURL(payload, { margin: 1, width: 220, color: { dark: '#0b0f19', light: '#ffffff' } }, (error, qr) => {
    if (error) {
      window.alert('No se pudo armar el código QR.')
      return
    }
    const doc = new JsPDF({ unit: 'mm', format: 'a4' })
    doc.setFillColor(11, 15, 25)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(109, 40, 217)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(244, 247, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('RendiYa', 16, 18)
    doc.setTextColor(34, 211, 238)
    doc.text('Voucher', 52, 18)
    doc.setTextColor(244, 247, 255)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text('Comprobante de reserva para el examen práctico', 16, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Turno #${item.id}`, 16, 58)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Fecha: ${item.date}`, 16, 72)
    doc.text(`Franja: ${item.time_slot}`, 16, 80)
    doc.text(`Sede: ${sede.name}`, 16, 88)
    doc.text(sede.address, 16, 96)
    doc.text('Estado: Confirmada', 16, 108)
    const addons = (item.addons || []).map((addon) => addon.label).join(', ')
    if (addons) {
      doc.text(`Extras: ${addons}`, 16, 116, { maxWidth: 120 })
    }
    const assignment = [item.assigned_vehicle, item.assigned_instructor].filter(Boolean).join(' · ')
    if (assignment) {
      doc.text(`Asignado: ${assignment}`, 16, addons ? 124 : 116, { maxWidth: 120 })
    }
    if (qr) {
      doc.addImage(qr, 'PNG', 150, 36, 42, 42)
    }
    doc.setFontSize(10)
    doc.setTextColor(168, 180, 212)
    doc.text('Presentá este voucher y tu DNI el día del práctico. No reemplaza el trámite en la sede.', 16, 128, {
      maxWidth: 178,
    })
    doc.save(`rendiya-voucher-${item.id}.pdf`)
  })
}
