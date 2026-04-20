import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import nodemailer from 'nodemailer'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 8787

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: false,
  }),
)
app.use(express.json({ limit: '48kb' }))

function buildSubject(topic) {
  if (topic === 'Eligibility / CDHCI questions') return 'Website inquiry: eligibility / CDHCI'
  if (topic === 'Care consultation') return 'Care consultation request'
  return `Website inquiry: ${topic || 'Contact'}`
}

app.post('/api/contact', async (req, res) => {
  const body = req.body ?? {}
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const topic = String(body.topic ?? '').trim()
  const urgency = String(body.urgency ?? '').trim()
  const ahsCaseManager = String(body.ahs_case_manager ?? '').trim()
  const message = String(body.message ?? '').trim()

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' })
  }

  const user = process.env.EMAIL_USER?.trim()
  const pass = process.env.EMAIL_PASS?.trim()
  const mailTo = process.env.MAIL_TO?.trim() || user

  if (!user || !pass || !mailTo) {
    console.error('Missing EMAIL_USER, EMAIL_PASS, or MAIL_TO (MAIL_TO defaults to EMAIL_USER).')
    return res.status(503).json({ error: 'Contact form is not configured on the server.' })
  }

  const subject = buildSubject(topic)
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Topic: ${topic || '—'}`,
    `Urgency / timing: ${urgency || '—'}`,
    `AHS case manager already?: ${ahsCaseManager || '—'}`,
    '',
    message,
    '',
    '— Sent from website contact form',
  ].join('\n')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `"Momentum website" <${user}>`,
      to: mailTo,
      replyTo: email,
      subject,
      text,
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error('sendMail error:', err)
    return res.status(500).json({ error: 'Could not send your message. Try again later or call intake.' })
  }
})

app.listen(PORT, () => {
  console.log(`Contact API listening on http://localhost:${PORT}`)
})
