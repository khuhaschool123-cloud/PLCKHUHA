const WEB_APP_URL = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '').trim()
const WEB_APP_KEY = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_KEY || '').trim()
const AUTH_STORAGE_KEY = 'baan-khuha-plc-auth'

export function readAuthSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

function writeAuthSession(session) {
  if (session) sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  else sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'))
  reader.readAsDataURL(blob)
})

const loadImage = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error(`ไม่สามารถเปิดรูป ${file.name} ได้`))
  }
  image.src = objectUrl
})

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob)
    else reject(new Error('ไม่สามารถบีบอัดรูปภาพได้'))
  }, type, quality)
})

async function prepareImage(file, caption, sortOrder) {
  const image = await loadImage(file)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, 'image/webp', 0.82)
  const dataUrl = await readAsDataUrl(blob)
  const originalBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9ก-๙_-]+/g, '-') || `image-${sortOrder}`

  return {
    fileName: `${originalBaseName}.webp`,
    mimeType: 'image/webp',
    base64: dataUrl.split(',')[1],
    caption: caption || '',
    sortOrder,
    originalName: file.name,
  }
}

export function isGoogleAppsScriptConfigured() {
  return Boolean(WEB_APP_URL && WEB_APP_KEY)
}

async function postToWebApp(payload, fallbackMessage, { requireAuth = true } = {}) {
  if (!WEB_APP_URL || !WEB_APP_KEY) {
    throw new Error('ยังไม่ได้ตั้งค่า Google Apps Script กรุณาเพิ่ม URL และ App Key ในไฟล์ .env.local')
  }

  let response
  try {
    response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...payload,
        appKey: WEB_APP_KEY,
        ...(requireAuth ? { sessionToken: readAuthSession()?.token || '' } : {}),
      }),
    })
  } catch {
    throw new Error('เชื่อมต่อ Google Apps Script ไม่สำเร็จ กรุณาตรวจ Web App URL และสิทธิ์การเข้าถึง')
  }

  const responseText = await response.text()
  let result
  try {
    result = JSON.parse(responseText)
  } catch {
    throw new Error('Google Apps Script ตอบกลับไม่ถูกต้อง กรุณาตรวจการ Deploy และเลือก URL ที่ลงท้ายด้วย /exec')
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.message || fallbackMessage)
  }

  return result
}


export async function loginWithPassword(email, password) {
  const result = await postToWebApp(
    { action: 'loginWithPassword', email: String(email || '').trim().toLowerCase(), password: String(password || '') },
    'ไม่สามารถเข้าสู่ระบบได้',
    { requireAuth: false },
  )
  const session = { token: result.sessionToken, user: result.user }
  writeAuthSession(session)
  return session
}

export async function changePassword(currentPassword, newPassword) {
  const result = await postToWebApp(
    { action: 'changePassword', currentPassword: String(currentPassword || ''), newPassword: String(newPassword || '') },
    'ไม่สามารถเปลี่ยนรหัสผ่านได้',
  )
  const session = { token: result.sessionToken, user: result.user }
  writeAuthSession(session)
  return session
}


export async function validateAuthSession() {
  const existing = readAuthSession()
  if (!existing) return null
  try {
    const result = await postToWebApp({ action: 'getSession' }, 'เซสชันหมดอายุ')
    const session = { token: existing.token, user: result.user }
    writeAuthSession(session)
    return session
  } catch {
    writeAuthSession(null)
    return null
  }
}

export async function signOut() {
  const existing = readAuthSession()
  try {
    if (existing) await postToWebApp({ action: 'logout' }, 'ออกจากระบบไม่สำเร็จ')
  } finally {
    writeAuthSession(null)
  }
}

export async function saveActivity({ fields, files, captions, status, activityId }) {
  const images = []
  for (let index = 0; index < files.length; index += 1) {
    images.push(await prepareImage(files[index], captions[index], index + 1))
  }

  const payload = {
    action: 'saveActivity',
    requestId: crypto.randomUUID(),
    activityId: activityId || '',
    status,
    activity: fields,
    images,
  }

  return postToWebApp(payload, 'ไม่สามารถบันทึกกิจกรรมได้')
}

export async function saveGroup(fields) {
  const result = await postToWebApp({ action: 'saveGroup', group: fields }, 'ไม่สามารถบันทึกกลุ่ม PLC ได้')
  return result.group
}

export async function listGroups() {
  const result = await postToWebApp({ action: 'listGroups' }, 'ไม่สามารถโหลดกลุ่ม PLC ได้')
  return Array.isArray(result.groups) ? result.groups : []
}

export async function deleteGroup(groupId) {
  if (!groupId) throw new Error('ไม่พบกลุ่มที่ต้องการลบ')
  return postToWebApp({ action: 'deleteGroup', groupId }, 'ไม่สามารถลบกลุ่ม PLC ได้')
}

export async function listActivities({ includeImages = false } = {}) {
  const result = await postToWebApp({ action: 'listActivities', includeImages }, 'ไม่สามารถโหลดประวัติกิจกรรมได้')
  return Array.isArray(result.activities) ? result.activities : []
}

export async function deleteActivities(activityIds) {
  const ids = Array.isArray(activityIds) ? activityIds.filter(Boolean) : [activityIds].filter(Boolean)
  if (!ids.length) throw new Error('ไม่พบกิจกรรมที่ต้องการลบ')
  return postToWebApp({ action: 'deleteActivities', activityIds: ids }, 'ไม่สามารถลบกิจกรรมได้')
}
