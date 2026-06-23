import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 5174)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')

app.use(express.json({ limit: '256kb' }))

function parseMakerWorldUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  const designMatch = url.pathname.match(/\/models\/(\d+)/)
  if (!designMatch) {
    throw new Error('MakerWorld model id was not found')
  }

  const fragmentMatch = url.hash.match(/profileId-(\d+)/)
  const host = url.hostname.toLowerCase()

  return {
    designId: designMatch[1],
    requestedProfileId: fragmentMatch ? Number(fragmentMatch[1]) : null,
    region: host.includes('.cn') ? 'cn' : 'global',
  }
}

function normalizeFilaments(filaments = []) {
  return filaments.map((filament) => ({
    type: filament.type || 'Unknown',
    color: String(filament.color || '#999999').toUpperCase(),
    usedM: Number(filament.usedM || 0),
    usedG: Number(filament.usedG || 0),
  }))
}

function normalizeDesign(sourceUrl, parsed, design) {
  if (!design?.id || design.status !== 1 || !Array.isArray(design.instances)) {
    throw new Error('MakerWorld did not return printable profiles')
  }

  const instances = design.instances
    .filter((instance) => instance?.status === 1)
    .map((instance) => {
      const modelInfo = instance.extention?.modelInfo || {}
      const settings = modelInfo.projectSettings || {}
      const plates = Array.isArray(modelInfo.plates) ? modelInfo.plates : []

      return {
        instanceId: instance.id,
        profileId: instance.profileId,
        title: instance.title || 'Untitled profile',
        creatorUid: instance.instanceCreator?.uid || null,
        creatorName: instance.instanceCreator?.name || '',
        printer: modelInfo.compatibility?.devProductName || '',
        layerHeight: settings.layerHeight || '',
        infill: settings.sparseInfillDensity || '',
        wallLoops: settings.wallLoops || '',
        plateCount: plates.length,
        weight: Number(instance.weight || 0),
        predictionSeconds: Number(instance.prediction || 0),
        downloadCount: Number(instance.downloadCount || 0),
        printCount: Number(instance.printCount || 0),
        ratingCount: Number(instance.ratingCount || 0),
        ratingScoreTotal: Number(instance.ratingScoreTotal || 0),
        score: Number(instance.score || 0),
        publishTime: instance.publishTime || '',
        updateTime: instance.updateTime || '',
        isDefault: Boolean(instance.isDefault || instance.id === design.defaultInstanceId),
        isOfficial: Boolean(instance.isOfficial),
        needAms: Boolean(instance.needAms),
        materialColorCnt: Number(instance.materialColorCnt || 0),
        labelList: Array.isArray(instance.labelList) ? instance.labelList : [],
        cover: instance.cover || '',
        filaments: normalizeFilaments(instance.instanceFilaments),
        plates: plates.map((plate) => ({
          index: plate.index,
          name: plate.name || `Plate ${plate.index}`,
          weight: Number(plate.weight || 0),
          predictionSeconds: Number(plate.prediction || 0),
          thumbnail: plate.thumbnail?.url || plate.top_picture?.url || '',
          filaments: normalizeFilaments(plate.filaments),
        })),
      }
    })

  if (instances.length === 0) {
    throw new Error('No public print profiles are available')
  }

  const requested = parsed.requestedProfileId
  const matched =
    instances.find((instance) => instance.instanceId === requested) ||
    instances.find((instance) => instance.profileId === requested) ||
    instances.find((instance) => instance.instanceId === design.defaultInstanceId) ||
    instances[0]

  return {
    sourceUrl,
    region: parsed.region,
    designId: design.id,
    modelId: design.modelId,
    title: design.title || 'Untitled model',
    slug: design.slug || '',
    creator: design.designCreator?.name || '',
    creatorUid: design.designCreator?.uid || null,
    coverUrl: design.coverUrl || design.coverPortrait || '',
    defaultInstanceId: design.defaultInstanceId,
    requestedProfileId: requested,
    selectedInstanceId: matched.instanceId,
    instances,
  }
}

async function fetchDesign(parsed) {
  const host = parsed.region === 'cn' ? 'https://api.bambulab.cn' : 'https://api.bambulab.com'
  const endpoint = `${host}/v1/design-service/design/${parsed.designId}`
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json',
      'user-agent': 'filament-planner/0.1',
    },
  })

  if (!response.ok) {
    throw new Error(`MakerWorld API returned ${response.status}`)
  }

  return response.json()
}

app.post('/api/resolve', async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : []
  const uniqueUrls = [...new Set(urls.map((url) => String(url).trim()).filter(Boolean))]

  if (uniqueUrls.length === 0) {
    res.status(400).json({ error: 'Provide at least one MakerWorld link' })
    return
  }

  const results = await Promise.all(
    uniqueUrls.map(async (sourceUrl) => {
      try {
        const parsed = parseMakerWorldUrl(sourceUrl)
        const design = await fetchDesign(parsed)
        return { ok: true, project: normalizeDesign(sourceUrl, parsed, design) }
      } catch (error) {
        return {
          ok: false,
          sourceUrl,
          error: error instanceof Error ? error.message : 'Resolve failed',
        }
      }
    }),
  )

  res.json({
    projects: results.filter((result) => result.ok).map((result) => result.project),
    errors: results.filter((result) => !result.ok),
  })
})

app.use(express.static(distDir))
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Filament planner server listening on http://localhost:${port}`)
})
